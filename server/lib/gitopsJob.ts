import { randomUUID } from 'crypto'
import { gitOpsQueue, gitOpsQueueEvents } from '../queues/gitOps.queue'

export type GitOpsJobData =
  | { action: 'sync'; kind: 'app'; name: string; id: string; deployId?: string }
  | { action: 'sync'; kind: 'database'; name: string; id: string; deployId?: string }
  | { action: 'delete'; kind: 'app'; name: string; id: string; deployId?: string }
  | { action: 'delete'; kind: 'database'; name: string; id: string; deployId?: string }
  
export async function syncGitOps(data: GitOpsJobData) {
  const payload = { ...data, deployId: data.deployId ?? randomUUID() }
  const job = await gitOpsQueue.add(data.action, payload)
  await job.waitUntilFinished(gitOpsQueueEvents)
}
