import simpleGit from 'simple-git'
import path from 'path'
import fs from 'fs'
import { Worker, Job } from 'bullmq'
import { prisma } from '../db/prisma'
import { generateDockerfile, generateNginxConf, getBuildTimeEnv, NextOutputMode } from '../lib/generateDockerfile'
import { getLogs } from '../lib/logStore'
import { getInternalPort } from '../lib/getInternalPort'
import { createDeployLogger } from '../lib/logger'
import { syncGitOps } from '../lib/gitopsJob'
import { runBuildKitBuild } from '../lib/buildkit'

export interface BuildJobData {
  appId: string
  repoUrl: string
  deployId: string
}

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null
}

const namespace = process.env.NAME_SPACE

const ANSI_REGEX = /\x1b\[[0-9;]*m/g
const stripAnsi = (text: string) => text.replace(ANSI_REGEX, '')

// Postgres text columns reject the NUL byte; build output can contain one.
const NULL_BYTE_REGEX = new RegExp(String.fromCharCode(0), 'g')

const NEXT_CONFIG_FILES = ['next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts']

// อ่าน output: 'standalone' | 'export' จาก next.config เพื่อเลือก Dockerfile ให้ตรง
const detectNextOutput = (workDir: string): NextOutputMode => {
  for (const file of NEXT_CONFIG_FILES) {
    const configPath = path.join(workDir, file)
    if (!fs.existsSync(configPath)) continue
    const match = fs.readFileSync(configPath, 'utf-8').match(/output\s*:\s*['"`](standalone|export)['"`]/)
    return (match?.[1] as NextOutputMode) ?? 'default'
  }
  return 'default'
}

const PRISMA_CONFIG_FILES = ['prisma.config.ts', 'prisma.config.js', 'prisma.config.mjs', 'prisma.config.cjs']

// หา seed: prisma config (package.json#prisma.seed หรือ prisma.config migrations.seed) -> prisma db seed
// ถ้าไม่มีแต่มี script seed ใน package.json -> npm run seed
const detectSeedCommand = (workDir: string, packageJson: any): string | null => {
  if (packageJson.prisma?.seed) return 'npx prisma db seed'
  const hasConfigSeed = PRISMA_CONFIG_FILES.some(file => {
    const configPath = path.join(workDir, file)
    return fs.existsSync(configPath) && /\bseed\s*:/.test(fs.readFileSync(configPath, 'utf-8'))
  })
  if (hasConfigSeed) return 'npx prisma db seed'
  if (packageJson.scripts?.seed) return 'npm run seed'
  return null
}

const worker = new Worker('build', async (job: Job<BuildJobData>) => {
  const { appId, repoUrl, deployId } = job.data
  const log = createDeployLogger(deployId)

  try {
    log('Step 1/5 · Clone repository')
    const buildDir = path.join('/tmp/pass-builds', appId)
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true })
    await simpleGit().clone(repoUrl, buildDir)

    const git = simpleGit(buildDir)
    const commitSha = await git.revparse(['HEAD'])
    const shortSha = commitSha.substring(0, 7)
    log(`Cloned repository (commit ${shortSha})`, 'success')

    log('Step 2/5 · Detect runtime')
    const app = await prisma.app.findUnique({ where: { id: appId } })
    const rootDir = app?.rootDir || '.'
    const workDir = path.join(buildDir, rootDir)

    const packageJson = JSON.parse(fs.readFileSync(path.join(workDir, 'package.json'), 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    const scripts = packageJson.scripts || {}

    // เช็ค next/nest ก่อน เพราะ next มี react และ nest มักมี express ติดมาด้วย
    let framework = 'unknown'
    if (deps['next']) framework = 'next'
    else if (deps['@nestjs/core']) framework = 'nest'
    else if (deps['express']) framework = 'express'
    else if (deps['react'] && deps['vite']) framework = 'react'

    let buildStrategy = 'none'
    if (scripts.build && !scripts.build.includes('echo')) buildStrategy = 'build'
    else if (deps['ts-node'] || deps['ts-node-dev'] || deps['tsx']) buildStrategy = 'ts-node'
    else buildStrategy = 'node'

    const startCommand = scripts.start || 'node index.js'
    const hasPrisma = fs.existsSync(path.join(workDir, 'prisma', 'schema.prisma'))
    const seedCommand = hasPrisma ? detectSeedCommand(workDir, packageJson) : null
    const nextOutput = framework === 'next' ? detectNextOutput(workDir) : 'default'
    const servedByNginx = framework === 'react' || (framework === 'next' && nextOutput === 'export')
    log(`Detected framework=${framework}, strategy=${buildStrategy}${framework === 'next' ? `, output=${nextOutput}` : ''}${seedCommand ? `, seed="${seedCommand}"` : ''}`, 'success')
    const imageTag = `ghcr.io/${namespace}/${app!.name}:${shortSha}-${Date.now()}`

    log('Step 3/5 · Generate Dockerfile')
    const dockerfilePath = path.join(workDir, 'Dockerfile')
    if (fs.existsSync(dockerfilePath)) {
      log('Dockerfile already exists, skipping generation', 'success')
    } else {
      const dockerfile = generateDockerfile(framework, buildStrategy, startCommand, hasPrisma, (app?.envVars as Record<string, string>) ?? {}, nextOutput, seedCommand)
      fs.writeFileSync(dockerfilePath, dockerfile)
      if (servedByNginx) {
        fs.writeFileSync(path.join(workDir, 'nginx.conf'), generateNginxConf())
      }
      log('Dockerfile generated', 'success')
    }

    log('Step 4/5 · Build and push image (BuildKit)')
    const buildArgs = getBuildTimeEnv(framework, (app?.envVars as Record<string, string>) ?? {})
    await runBuildKitBuild({
      contextDir: workDir,
      imageTag,
      platform: 'linux/amd64',
      buildArgs,
      onLog: (line) => log(stripAnsi(line))
    })
    log('Image built and pushed to GHCR', 'success')

    const internalPort = getInternalPort(servedByNginx ? 'react' : framework, app?.envVars as Record<string, string>)

    await prisma.app.update({
      where: { id: appId },
      data: { status: 'SYNCING', port: internalPort, ghcrUrl: imageTag }
    })

    log('Step 5/5 · Sync GitOps repository')
    await syncGitOps({ action: 'sync', kind: 'app', name: app!.name, id: appId, deployId })

    await prisma.app.update({
      where: { id: appId },
      data: { status: 'RUNNING' }
    })

    const buildLog = getLogs(deployId).join('\n')
    const safeLog = buildLog.replace(NULL_BYTE_REGEX, '')

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
    const failureLog = buildLog || error.message
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
