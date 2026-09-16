import simpleGit from 'simple-git'
import * as k8s from '@kubernetes/client-node'
import { Worker, Job, } from 'bullmq'
import fs from 'fs'
import path from 'path'
import { prisma } from '../db/prisma'
import { generateApplicationYaml, getEnvSecretName } from '../lib/generateApplicationYaml'
import { generateDatabaseYaml } from '../lib/generateDatabaseYaml'
import { createDeployLogger } from '../lib/logger'
import type { GitOpsJobData as Input } from '../lib/gitopsJob'

const kc = new k8s.KubeConfig()
kc.loadFromCluster()
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api)


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

async function secretExists(namespace: string, name: string): Promise<boolean> {
  try {
    await k8sCoreApi.readNamespacedSecret({ name, namespace })
    return true
  } catch (err: any) {
    if (err.code === 404) return false
    throw err
  }
}

async function commitAndPush(
  git: ReturnType<typeof simpleGit>,
  fullPath: string,
  message: string,
  log: ReturnType<typeof createDeployLogger>
) {
  await git.add(fullPath)
  const status = await git.status()
  if (status.files.length > 0) {
    await git.commit(message)
    await git.push('origin', 'main')
    log(`Pushed GitOps commit: ${message}`, 'success')
  } else {
    log('No changes to sync', 'info')
  }
}

const gitOpsWorker = new Worker('gitops', async (job: Job<Input>) => {
    const log = createDeployLogger(job.data.deployId)
    const clonePath = path.resolve(process.env.GITOPS_CLONE_PATH || path.join(process.cwd(), '.gitops-clone'))
    const K8S_NAMESPACE = process.env.K8S_APP_NAMESPACE || 'default'
    let git: ReturnType<typeof simpleGit>
    try {
        log('Step 8/8 · Sync GitOps repository')

        if(fs.existsSync(clonePath)){
            git = simpleGit(clonePath)
            await git.fetch()
            await git.reset(['--hard', 'origin/main'])
            log('Updated local GitOps clone', 'success')
        }else{
            await simpleGit().clone(`${process.env.CLONE_URL}`,clonePath)
            git = simpleGit(clonePath)
            log('Cloned GitOps repository', 'success')
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
                const secretName = getEnvSecretName(dataQuery.name)
                const secretExist = await secretExists(K8S_NAMESPACE,secretName)
                if(secretExist){
                    await k8sCoreApi.replaceNamespacedSecret({
                        name: `${secretName}`,
                        namespace: `${K8S_NAMESPACE}`,
                        body: {
                            metadata: { name: `${secretName}`},
                            stringData: (dataQuery.envVars as Record<string, string>) ?? {}
                        }
                    })
                }else{
                    await k8sCoreApi.createNamespacedSecret({
                        namespace: `${K8S_NAMESPACE}`,
                        body: {
                            metadata: {name: `${secretName}`},
                            stringData: (dataQuery.envVars as Record<string, string>) ?? {}
                        }
                    })
                }
                const yaml = generateApplicationYaml(dataQuery)
                const fullPath = getManifestPath(clonePath,job.data.kind,dataQuery.name)
                fs.mkdirSync(path.dirname(fullPath), { recursive: true })
                fs.writeFileSync(fullPath, yaml, 'utf-8')
                log(`Wrote manifest for app ${dataQuery.name}`, 'success')
                await commitAndPush(git, fullPath, `sync ${job.data.kind} ${dataQuery.name}`, log)

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
                const fullPath = getManifestPath(clonePath,job.data.kind,dataQuery.name)
                fs.mkdirSync(path.dirname(fullPath), { recursive: true })
                fs.writeFileSync(fullPath, yaml, 'utf-8')
                log(`Wrote manifest for database ${dataQuery.name}`, 'success')
                await commitAndPush(git, fullPath, `sync ${job.data.kind} ${dataQuery.name}`, log)
            }
        }else if(job.data.action === 'delete'){
            if(job.data.kind === 'app' || job.data.kind === 'database'){
                const fullPath = getManifestPath(clonePath,job.data.kind,job.data.name)
                if(fs.existsSync(fullPath)){
                    fs.unlinkSync(fullPath)
                    log(`Removed manifest for ${job.data.kind} ${job.data.name}`, 'success')
                    await commitAndPush(git, fullPath, `delete ${job.data.kind} ${job.data.name}`, log)
                } else {
                    log('Nothing to delete, manifest not found', 'info')
                }
            }
        }

        log('GitOps repository synced', 'success')
    } catch (error: any) {
        log(`GitOps sync failed: ${error.message}`, 'error')
        throw error
    }
}, { connection })

gitOpsWorker.on('completed', (job) => console.log(`[gitops] Job completed: ${job.id}`))
gitOpsWorker.on('failed', (job, error) => console.log(`[gitops] Job failed: ${job?.id} ${error.message}`))

export default gitOpsWorker
