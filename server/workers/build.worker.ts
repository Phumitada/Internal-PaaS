import simpleGit from 'simple-git'
import path from 'path'
import fs from 'fs'
import { Worker, Job } from 'bullmq'
import { prisma } from '../db/prisma'
import { generateDockerfile, generateNginxConf } from '../lib/generateDockerfile'
import tar from 'tar-fs'
import Docker from 'dockerode'
import { getLogs } from '../lib/logStore'
import { buildEnvArray } from '../lib/buildEnvArray'
import { getInternalPort } from '../lib/getInternalPort'
import { createDeployLogger } from '../lib/logger'
import { syncGitOps } from '../lib/gitopsJob'

export interface BuildJobData {
  appId: string
  repoUrl: string
  deployId: string
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null as null
}

const authconfig = {
  username: 'Phumitada',
  password: process.env.GITHUB_PAT,
  serveraddress: 'ghcr.io'
}

const namespace = process.env.NAME_SPACE

const docker = new Docker()

const ANSI_REGEX = /\x1b\[[0-9;]*m/g
const stripAnsi = (text: string) => text.replace(ANSI_REGEX, '')

// Postgres text columns reject the NUL byte; container/build output can contain one.
const NULL_BYTE_REGEX = new RegExp(String.fromCharCode(0), 'g')

const worker = new Worker('build', async (job: Job<BuildJobData>) => {
  const { appId, repoUrl, deployId } = job.data
  let containerLogText = ''
  const log = createDeployLogger(deployId)

  try {
    log('Step 1/8 · Clone repository')
    const buildDir = path.join('/tmp/pass-builds', appId)
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true })
    await simpleGit().clone(repoUrl, buildDir)

    const git = simpleGit(buildDir)
    const commitSha = await git.revparse(['HEAD'])
    const shortSha = commitSha.substring(0, 7)
    log(`Cloned repository (commit ${shortSha})`, 'success')

    log('Step 2/8 · Detect runtime')
    const app = await prisma.app.findUnique({ where: { id: appId } })
    const rootDir = app?.rootDir || '.'
    const workDir = path.join(buildDir, rootDir)

    const packageJson = JSON.parse(fs.readFileSync(path.join(workDir, 'package.json'), 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    const scripts = packageJson.scripts || {}

    let framework = 'unknown'
    if (deps['express']) framework = 'express'
    else if (deps['react'] && deps['vite']) framework = 'react'

    let buildStrategy = 'none'
    if (scripts.build && !scripts.build.includes('echo')) buildStrategy = 'build'
    else if (deps['ts-node'] || deps['ts-node-dev'] || deps['tsx']) buildStrategy = 'ts-node'
    else buildStrategy = 'node'

    const startCommand = scripts.start || 'node index.js'
    const hasPrisma = fs.existsSync(path.join(workDir, 'prisma', 'schema.prisma'))
    log(`Detected framework=${framework}, strategy=${buildStrategy}`, 'success')
    const imageTag = `ghcr.io/${namespace}/${app!.name}:${shortSha}`

    log('Step 3/8 · Generate Dockerfile')
    const dockerfilePath = path.join(workDir, 'Dockerfile')
    if (fs.existsSync(dockerfilePath)) {
      log('Dockerfile already exists, skipping generation', 'success')
    } else {
      const dockerfile = generateDockerfile(framework, buildStrategy, startCommand, hasPrisma)
      fs.writeFileSync(dockerfilePath, dockerfile)
      if (framework === 'react') {
        fs.writeFileSync(path.join(workDir, 'nginx.conf'), generateNginxConf())
      }
      log('Dockerfile generated', 'success')
    }

    log('Step 4/8 · Build image')
    const tarStream = tar.pack(workDir)

    const previousDeploy = await prisma.deploy.findFirst({
      where: {
        appId,
        id: { not: deployId },
        imageUrl: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    })
    const oldImageUrl = previousDeploy?.imageUrl ?? null

    await new Promise<void>((resolve, reject) => {
      docker.buildImage(tarStream, { t: imageTag, platform: 'linux/amd64' }, (err, stream) => {
        if (err) return reject(err)
        if (!stream) return reject(new Error('No stream'))

        let buildError: string | null = null
        let jsonLineBuf = ''
        let streamTextBuf = ''

        const flushStreamLines = (finalFlush = false) => {
          let newlineIndex
          while ((newlineIndex = streamTextBuf.indexOf('\n')) >= 0) {
            const line = stripAnsi(streamTextBuf.slice(0, newlineIndex)).trim()
            streamTextBuf = streamTextBuf.slice(newlineIndex + 1)
            if (line) log(line)
          }
          if (finalFlush && streamTextBuf.trim()) {
            log(stripAnsi(streamTextBuf).trim())
            streamTextBuf = ''
          }
        }

        stream.on('data', (chunk) => {
          jsonLineBuf += chunk.toString()
          let newlineIndex
          while ((newlineIndex = jsonLineBuf.indexOf('\n')) >= 0) {
            const line = jsonLineBuf.slice(0, newlineIndex).trim()
            jsonLineBuf = jsonLineBuf.slice(newlineIndex + 1)
            if (!line) continue
            try {
              const obj = JSON.parse(line)
              if (obj.error) {
                buildError = obj.error
              } else if (typeof obj.stream === 'string') {
                streamTextBuf += obj.stream
              }
            } catch {
              // not a JSON line, keep as raw text
              streamTextBuf += line + '\n'
            }
          }
          flushStreamLines()
        })
        stream.on('end', () => {
          flushStreamLines(true)
          if (buildError) return reject(new Error(`Docker build failed: ${buildError}`))
          resolve()
        })
        stream.on('error', reject)
      })
    })
    log('Image built successfully', 'success')

    if (oldImageUrl && oldImageUrl !== imageTag) {
      try {
        const oldImage = docker.getImage(oldImageUrl)
        await oldImage.remove()
        log('Removed previous image', 'success')
      } catch (e) {
        log('Failed to remove previous image (non-critical)', 'warn')
      }
    }

    log('Step 5/8 · Run container')
    try {
      const old = docker.getContainer(`pass-${appId}`)
      await old.stop()
      await old.remove()
    } catch (e) {}
    const internalPort = getInternalPort(framework)
    const container = await docker.createContainer({
      Image: imageTag,
      name: `pass-${appId}`,
      Tty: true,
      ExposedPorts: { [`${internalPort}/tcp`]: {} },
      Env: buildEnvArray((app?.envVars as Record<string, string>) ?? {}, internalPort),
      HostConfig: {
        PortBindings: { [`${internalPort}/tcp`]: [{ HostPort: '0' }] },
        RestartPolicy: { Name: 'unless-stopped' }
      }
    })

    await container.start()

    const info = await container.inspect()
    const port = Number(info.NetworkSettings.Ports[`${internalPort}/tcp`][0].HostPort)
    log(`Container started on port ${port}`, 'success')

    log('Step 6/8 · Health check')

    // รอให้ app startup ก่อน 5 วิ
    await new Promise(resolve => setTimeout(resolve, 5000))

    // อ่าน container log จริงๆ
    const rawLogs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      timestamps: true
    })
    containerLogText = rawLogs.toString('utf8')

    // เช็ค state จริงๆ ว่า running stable มั้ย
    const currentInfo = await container.inspect()
    const state = currentInfo.State

    if (!state.Running || state.Restarting) {
      await container.stop().catch(() => {})
      throw new Error(`Container crashed. State: ${state.Status}`)
    }

    log('Container is stable', 'success')

    // Health check passed — the actual workload runs on the k8s pod (via
    // GHCR), not this local container, so keeping it running just wastes
    // host memory. Stop and remove it now that it's proven the image boots.
    try {
      await container.stop()
      await container.remove()
      log('Stopped and removed local container', 'success')
    } catch (e) {
      log('Failed to stop/remove local container (non-critical)', 'warn')
    }

    log('Step 7/8 · Push image to GHCR')
    const image = docker.getImage(imageTag)
    await new Promise<void>((resolve, rejects) => {
      image.push({ authconfig }, (err, stream) => {
        if (err) return rejects(err)
        if (!stream) return rejects(new Error('No push stream'))

        const lastStatusById = new Map<string, string>()

        docker.modem.followProgress(
          stream,
          (err, output) => {
            if (err) return rejects(err)
            const errorEvent = output.find((e: any) => e.error)
            if (errorEvent) return rejects(new Error(`Docker push failed: ${errorEvent.error}`))
            resolve()
          },
          (event: any) => {
            const status = event.status as string | undefined
            if (!status) return
            const key = event.id ?? '_'
            // Docker re-sends the same status repeatedly while waiting;
            // only log when it actually changes to keep the log readable.
            if (lastStatusById.get(key) === status) return
            lastStatusById.set(key, status)
            log(event.id ? `${event.id}: ${status}` : status)
          }
        )
      })
    })
    log('Image pushed to GHCR', 'success')

    await prisma.app.update({
      where: { id: appId },
      data: { status: 'SYNCING', port: internalPort, ghcrUrl: imageTag }
    })

    // GitOps sync runs as its own BullMQ job (gitops.worker) but logs into
    // this same deployId, so the frontend sees one continuous pipeline.
    await syncGitOps({ action: 'sync', kind: 'app', name: app!.name, id: appId, deployId })

    await prisma.app.update({
      where: { id: appId },
      data: { status: 'RUNNING' }
    })

    const buildLog = getLogs(deployId).join('\n')
    const fullLog = containerLogText
      ? `${buildLog}\n--- container runtime log ---\n${containerLogText}`
      : buildLog
    const safeLog = fullLog.replace(NULL_BYTE_REGEX, '')

    await prisma.deploy.update({
      where: { id: deployId },
      data: { status: 'SUCCESS', log: safeLog, imageUrl: imageTag }
    })

  } catch (error: any) {
    log(`Build failed: ${error.message}`, 'error')

    await prisma.app.update({
      where: { id: appId },
      data: { status: 'ERROR' }
    }).catch(() => {})

    const buildLog = getLogs(deployId).join('\n')
    const fullLog = containerLogText
      ? `${buildLog}\n--- container runtime log ---\n${containerLogText}`
      : buildLog
    const failureLog = fullLog || error.message
    const safeLog = failureLog.replace(NULL_BYTE_REGEX, '')
    await prisma.deploy.update({
      where: { id: deployId },
      data: {
        status: 'FAILED',
        log: safeLog
      }
    }).catch(() => {})

    throw error
  }

}, { connection })

worker.on('completed', (job) => console.log(`[build] Job completed: ${job.id}`))
worker.on('failed', (job, error) => console.log(`[build] Job failed: ${job?.id} ${error.message}`))

export default worker
