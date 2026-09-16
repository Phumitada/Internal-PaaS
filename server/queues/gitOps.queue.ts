import { Queue, QueueEvents } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
}

export const gitOpsQueue = new Queue('gitops', { connection })

// build.worker awaits gitops jobs via QueueEvents so a deploy isn't marked
// SUCCESS until the GitOps repo push actually completes.
export const gitOpsQueueEvents = new QueueEvents('gitops', { connection })