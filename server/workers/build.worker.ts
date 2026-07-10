import simpleGit from 'simple-git'
import path from 'path'
import fs from 'fs'
import { Worker, Job } from 'bullmq'
import { prisma } from '../db/prisma'
import { generateDockerfile, generateNginxConf } from '../lib/generateDockerfile'
import tar from 'tar-fs'
import Docker from 'dockerode'

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

const docker = new Docker()

const worker = new Worker('build', async (job: Job<BuildJobData>)=>{
    const {appId,repoUrl,deployId} = job.data
    const buildDir = path.join('/tmp/pass-builds',appId)

    if(fs.existsSync(buildDir)){
        fs.rmSync(buildDir, {recursive:true})
    }

    await simpleGit().clone(repoUrl,buildDir)

    const app = await prisma.app.findUnique({where: {id:appId}})
    const rootDir = app?.rootDir || '.'
    const workDir = path.join(buildDir, rootDir)
    const files = fs.readdirSync(workDir)

    const packageJson = JSON.parse(
        fs.readFileSync(path.join(workDir, 'package.json'), 'utf-8')
      )
      
    const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
    }
    
    let runtime = 'unknown'
    let framework = 'unknown'
    const scripts = packageJson.scripts || {}

    if (deps['react'] && deps['vite']) {
    runtime = 'nodejs'
    framework = 'react'
    } else if (deps['express']) {
    runtime = 'nodejs'
    framework = 'express'
    }
    let buildStrategy = 'none'

    if (scripts.build && !scripts.build.includes('echo')) {
    buildStrategy = 'build'
    } else if (deps['ts-node'] || deps['ts-node-dev']) {
    buildStrategy = 'ts-node'
    } else {
    buildStrategy = 'node'
    }

    const startCommand = scripts.start || 'node index.js'

    const dockerfilePath = path.join(workDir,'Dockerfile')

    if(fs.existsSync(dockerfilePath)){
        console.log('Dockerfile already exists')
    }else{
        const dockerfile = generateDockerfile(framework,buildStrategy,startCommand)
        fs.writeFileSync(dockerfilePath,dockerfile)

        if(framework === 'react'){
            const nginxConf = generateNginxConf()
            fs.writeFileSync(path.join(workDir,'nginx.conf'),nginxConf)
        }
    }

    const imageName = `pass-${appId}:latest`

    const tarStream = tar.pack(workDir)

    await new Promise<void>((resolve,reject)=>{
        docker.buildImage(tarStream,{t:imageName},(err,stream)=>{
            if(err) return reject(err)
            if(!stream) return reject(new Error('No stream'))

                stream.on('data',(chunk)=>{
                    const log = chunk.toString()
                    process.stdout.write(log)
                })
                stream.on('end',resolve)
                stream.on('error',reject)
        })
    })

    try {
        const old = docker.getContainer(`paas-${appId}`)
        await old.stop()
        await old.remove()
      } catch (e) {
      }

    const container = await docker.createContainer({
        Image: imageName,
        name: `pass-${appId}`,
        ExposedPorts: {'3000/tcp':{}},
        HostConfig: {
            PortBindings:{
                '3000/tcp': [{HostPort: '0'}]
            }
        }
    })
    await container.start()

    const info = await container.inspect()
    const port = info.NetworkSettings.Ports['3000/tcp'][0].HostPort
    console.log("Container running on: ",port)

},{ connection })

export default worker