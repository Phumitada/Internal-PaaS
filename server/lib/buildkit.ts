import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// There is no official/maintained Node.js client for BuildKit's gRPC API
// (confirmed before writing this — only a Go client and a third-party Rust
// one exist). Shelling out to `buildctl`, the CLI BuildKit itself ships and
// maintains, is the documented approach for any language without a native
// client — the same thing `docker buildx` does under the hood.

const RUNTIME_DIR = '/tmp/buildkit-client'

function writeOnce(filePath: string, content: string): string {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, { mode: 0o600 })
  }
  return filePath
}

// buildkitd's Deployment+Service runs in-cluster behind mTLS (required —
// BuildKit's own docs call plain TCP without mTLS dangerous, since the
// build executor can call back into the API). The three cert/key PEMs
// arrive as env vars via envFrom (idp-api-env-secret), the same delivery
// mechanism every other app's env vars already use — there was no way to
// add a second volume mount to idp-api's pod spec, since that Deployment
// is generated and reconciled by idp-controller from the Application CRD,
// which only supports envSecretRefs, not arbitrary volumes.
function getClientCertPaths() {
  const ca = process.env.BUILDKIT_CLIENT_CA
  const cert = process.env.BUILDKIT_CLIENT_CERT
  const key = process.env.BUILDKIT_CLIENT_KEY
  if (!ca || !cert || !key) {
    throw new Error('BUILDKIT_CLIENT_CA/BUILDKIT_CLIENT_CERT/BUILDKIT_CLIENT_KEY are not set — cannot authenticate to buildkitd')
  }
  return {
    ca: writeOnce(path.join(RUNTIME_DIR, 'ca.pem'), ca),
    cert: writeOnce(path.join(RUNTIME_DIR, 'cert.pem'), cert),
    key: writeOnce(path.join(RUNTIME_DIR, 'key.pem'), key),
  }
}

// buildctl reads registry push credentials from a docker config.json,
// same as the docker CLI — there's no --username/--password flag.
function getDockerConfigDir(): string {
  const dir = path.join(RUNTIME_DIR, 'docker-config')
  const configPath = path.join(dir, 'config.json')
  if (!fs.existsSync(configPath)) {
    const auth = Buffer.from(`Phumitada:${process.env.GITHUB_PAT}`).toString('base64')
    const config = { auths: { 'ghcr.io': { auth } } }
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 })
  }
  return dir
}

export interface BuildKitBuildOptions {
  contextDir: string
  imageTag: string
  platform?: string
  onLog: (line: string) => void
}

// Builds contextDir with the Dockerfile already inside it and pushes the
// result straight to the registry in one BuildKit solve
// (type=image,push=true) — collapses the old build.worker.ts Step 4 (build)
// and Step 7 (push) into a single call.
export function runBuildKitBuild({ contextDir, imageTag, platform = 'linux/amd64', onLog }: BuildKitBuildOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const addr = process.env.BUILDKIT_ADDR || 'tcp://buildkitd:1234'
    const { ca, cert, key } = getClientCertPaths()
    const dockerConfigDir = getDockerConfigDir()

    const args = [
      '--addr', addr,
      '--tlscacert', ca,
      '--tlscert', cert,
      '--tlskey', key,
      'build',
      '--frontend', 'dockerfile.v0',
      '--local', `context=${contextDir}`,
      '--local', `dockerfile=${contextDir}`,
      '--opt', `platform=${platform}`,
      '--output', `type=image,name=${imageTag},push=true`,
      '--progress', 'plain',
    ]

    const child = spawn('buildctl', args, {
      env: { ...process.env, DOCKER_CONFIG: dockerConfigDir },
    })

    const makeLineSplitter = () => {
      let buf = ''
      return {
        push(chunk: string) {
          buf += chunk
          let idx
          while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx).trimEnd()
            buf = buf.slice(idx + 1)
            if (line) onLog(line)
          }
        },
        flush() {
          if (buf.trim()) onLog(buf.trimEnd())
          buf = ''
        }
      }
    }
    const stdoutSplitter = makeLineSplitter()
    const stderrSplitter = makeLineSplitter()

    child.stdout.on('data', (chunk) => stdoutSplitter.push(chunk.toString()))
    child.stderr.on('data', (chunk) => stderrSplitter.push(chunk.toString()))

    child.on('error', (err) => reject(new Error(`Failed to start buildctl: ${err.message}`)))
    child.on('close', (code) => {
      stdoutSplitter.flush()
      stderrSplitter.flush()
      if (code === 0) resolve()
      else reject(new Error(`buildctl exited with code ${code}`))
    })
  })
}
