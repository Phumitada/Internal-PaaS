import simpleGit from 'simple-git'
import { Worker, Job, } from 'bullmq'
import fs from 'fs'
import path from 'path'
import { prisma } from '../db/prisma'
import { generateApplicationYaml } from '../lib/generateApplicationYaml'
import { generateDatabaseYaml } from '../lib/generateDatabaseYaml'

type Input =
  | { action: 'sync'; kind: 'app'; name: string, id: string }
  | { action: 'sync'; kind: 'database'; name: string; id: string }
  | { action: 'delete'; kind: 'app'; name: string; id: string }
  | { action: 'delete'; kind: 'database'; name: string; id: string }

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null as null
}

function getManifestPath(clonePath: string, kind: 'app' | 'database', name: string): string {
  const folder = kind === 'app' ? 'app' : 'database'
  const filename = kind === 'app' ? 'application.yaml' : 'database.yaml'
  return path.join(clonePath, folder, name, filename)
}

const gitOpsWorker = new Worker('gitops', async (job: Job<Input>) => {
    const clonePath = process.env.GITOPS_CLONE_PATH || path.join(process.cwd(), '.gitops-clone')
    let git: ReturnType<typeof simpleGit>
    try {
        if(fs.existsSync(clonePath)){
            git = simpleGit(clonePath)
            await git.fetch()
            await git.reset(['--hard', 'origin/main'])
        }else{
            await simpleGit().clone(`${process.env.CLONE_URL}`,clonePath)
            git = simpleGit(clonePath)
        }

        if(job.data.action === 'sync'){
            if(job.data.kind === 'app'){
                const dataQuery = await prisma.app.findUnique({
                    where: {
                        id: job.data.id
                    },
                    include:{
                        databases: true
                    }
                })
                if(!dataQuery){
                    throw new Error("No app found")
                }
                const yaml = generateApplicationYaml(dataQuery)
                const fullPath = getManifestPath(clonePath,job.data.kind,job.data.name)
                fs.mkdirSync(path.dirname(fullPath), { recursive: true })
                fs.writeFileSync(fullPath, yaml, 'utf-8')
                await git.add(fullPath)
                const status = await git.status()
                if (status.files.length > 0) {
                    await git.commit(`sync ${job.data.kind} ${job.data.name}`)
                    await git.push('origin', 'main')
                }

            } else if(job.data.kind === 'database'){
                const dataQuery = await prisma.database.findUnique({
                    where: {
                        id: job.data.id
                    }
                })
                if(!dataQuery){
                    throw new Error("No database found")
                }
                const yaml = generateDatabaseYaml(dataQuery)
                const fullPath = getManifestPath(clonePath,job.data.kind,job.data.name)
                fs.mkdirSync(path.dirname(fullPath), { recursive: true })
                fs.writeFileSync(fullPath, yaml, 'utf-8')
                await git.add(fullPath)
                const status = await git.status()
                if (status.files.length > 0) {
                    await git.commit(`sync ${job.data.kind} ${job.data.name}`)
                    await git.push('origin', 'main')
                }
            }
        }else if(job.data.action === 'delete'){
            if(job.data.kind === 'app'){
                const fullPath = getManifestPath(clonePath,job.data.kind,job.data.name)
                if(fs.existsSync(fullPath)){
                    fs.unlinkSync(fullPath)
                    await git.add(fullPath)
                    const status = await git.status()
                    if (status.files.length > 0) {
                        await git.commit(`sync ${job.data.kind} ${job.data.name}`)
                        await git.push('origin', 'main')
                    }
                }
            }else if(job.data.kind === 'database'){
                const fullPath = getManifestPath(clonePath,job.data.kind,job.data.name)
                if(fs.existsSync(fullPath)){
                    fs.unlinkSync(fullPath)
                    await git.add(fullPath)
                    const status = await git.status()
                    if (status.files.length > 0) {
                        await git.commit(`sync ${job.data.kind} ${job.data.name}`)
                        await git.push('origin', 'main')
                    }
                }
            }
        }
    } catch (error) {
        console.error('gitops worker failed:', error)
        throw error
    }
}, { connection })

 