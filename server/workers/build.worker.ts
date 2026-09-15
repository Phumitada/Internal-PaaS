import simpleGit from 'simple-git'
import path from 'path'
import fs from 'fs'
import { Worker, Job } from 'bullmq'
import { prisma } from '../db/prisma'
import { generateDockerfile, generateNginxConf } from '../lib/generateDockerfile'
import tar from 'tar-fs'
import Docker from 'dockerode'
import { appendLog } from '../lib/logStore'
import { buildEvents } from '../lib/emitter'
import { buildEnvArray } from '../lib/buildEnvArray'
import { getInternalPort } from '../lib/getInternalPort'

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

const worker = new Worker('build', async (job: Job<BuildJobData>) => {
  const { appId, repoUrl, deployId } = job.data
  let buildLog = ''
  let containerLogText = ''
  const log = (msg: string) => {
    console.log(msg)
    buildLog += msg + '\n'
    appendLog(deployId,msg)
    buildEvents.emit('log',{deployId,msg})
  }

  try {
    log('=== Step 1: Clone repo ===')
    const buildDir = path.join('/tmp/pass-builds', appId)
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true })
    await simpleGit().clone(repoUrl, buildDir)
    log('✓ Cloned')

    const git = simpleGit(buildDir)
    const commitSha = await git.revparse(['HEAD'])
    const shortSha = commitSha.substring(0, 7)
    log(`✓ Commit: ${shortSha}`)

    log('=== Step 2: Detect runtime ===')
    const app = await prisma.app.findUnique({ where: { id: appId } })
    const rootDir = app?.rootDir || '.'
    const workDir = path.join(buildDir, rootDir)

    const packageJson = JSON.parse(fs.readFileSync(path.join(workDir, 'package.json'), 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    const scripts = packageJson.scripts || {}

    let framework = 'unknown'
    if (deps['react'] && deps['vite']) framework = 'react'
    else if (deps['express']) framework = 'express'

    let buildStrategy = 'none'
    if (scripts.build && !scripts.build.includes('echo')) buildStrategy = 'build'
    else if (deps['ts-node'] || deps['ts-node-dev'] || deps['tsx']) buildStrategy = 'ts-node'
    else buildStrategy = 'node'

    const startCommand = scripts.start || 'node index.js'
    const hasPrisma = fs.existsSync(path.join(workDir, 'prisma', 'schema.prisma'))
    log(`✓ Detected: framework=${framework} strategy=${buildStrategy}`)
    const imageTag = `ghcr.io/${namespace}/${app!.name}:${shortSha}`

    log('=== Step 3: Generate Dockerfile ===')
    const dockerfilePath = path.join(workDir, 'Dockerfile')
    if (fs.existsSync(dockerfilePath)) {
      log('✓ Dockerfile already exists')
    } else {
      const dockerfile = generateDockerfile(framework, buildStrategy, startCommand, hasPrisma)
      fs.writeFileSync(dockerfilePath, dockerfile)
      if (framework === 'react') {
        fs.writeFileSync(path.join(workDir, 'nginx.conf'), generateNginxConf())
      }
      log('✓ Generated Dockerfile')
    }

    log('=== Step 4: Build image ===')
    const imageName = `pass-${appId}:latest`
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
        stream.on('data', (chunk) => {
          const text = chunk.toString()
          process.stdout.write(text)
          
          // Strip Docker stream prefixes like {"stream":"..."} or [stream] ...
          const cleanText = text
            .replace(/^\s*\{["']stream["']\s*:\s*["']?([^"']*)["']?\s*\}\s*/gm, '$1')
            .replace(/^\s*\[stream\]\s*/gm, '')
            .replace(/^\s*\[[^\]]*\]\s*/gm, '')
          
          buildLog += cleanText
          appendLog(deployId, cleanText)
          buildEvents.emit('log', { deployId, msg: cleanText })
        })
        stream.on('end', resolve)
        stream.on('error', reject)
      })
    })
    log('✓ Image built')

    if (oldImageUrl) {
      try {
        const oldImage = docker.getImage(oldImageUrl)
        await oldImage.remove()
        log('✓ Removed old image')
      } catch (e) {
        log('⚠ Failed to remove old image (non-critical)')
      }
    }


    log('=== Step 5: Run container ===')
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
    log(`✓ Container started on port: ${port}`)

    log('=== Step 6: Health check ===')

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

    log('✓ Container is stable')

    const fullLog = containerLogText
      ? `${buildLog}\n--- container runtime log ---\n${containerLogText}`
      : buildLog
    const safeLog = fullLog.replace(/\u0000/g, '')

    log('=== Step 7: Push Image to GHCR ===')
    const image = docker.getImage(imageTag)
    await new Promise<void>((resolve,rejects) => {
      image.push({authconfig}, (err,stream) => {
        if (err) return rejects(err)
        if (!stream) return rejects(new Error('No push stream'))
        docker.modem.followProgress(
          stream,
          (err, output) => (err ? rejects(err) : resolve()),
          (event) => process.stdout.write(event.status + '\n')
        );
      })
    })
    await prisma.app.update({
      where: { id: appId },
      data: { status: 'RUNNING', port,ghcrUrl: imageTag }
    })
    
    await prisma.deploy.update({
      where: { id: deployId },
      data: { status: 'SUCCESS', log: safeLog, imageUrl: imageTag }
    })
    log('✓ Image pushed to GHCR');

  } catch (error: any) {
    console.error('=== Build failed:', error.message, '===')

    await prisma.app.update({
      where: { id: appId },
      data: { status: 'ERROR' }
    }).catch(() => {})

    const fullLog = containerLogText
      ? `${buildLog}\n--- container runtime log ---\n${containerLogText}`
      : buildLog
    const failureLog = fullLog || error.message
    const safeLog = failureLog.replace(/\u0000/g, '')
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

worker.on('completed', (job) => console.log('✓ Job completed:', job.id))
worker.on('failed', (job, error) => console.log('✗ Job failed:', job?.id, error.message))

export default worker