import { gitOpsQueue, gitOpsQueueEvents } from '../queues/gitOps.queue'

export type GitOpsJobData =
  | { action: 'sync'; kind: 'app'; name: string; id: string; deployId?: string }
  | { action: 'sync'; kind: 'database'; name: string; id: string; deployId?: string }
  | { action: 'delete'; kind: 'app'; name: string; id: string; deployId?: string }
  | { action: 'delete'; kind: 'database'; name: string; id: string; deployId?: string }

// Enqueues a gitops job and waits for it to finish, so callers (a deploy,
// a database CRUD request) only succeed once the manifest repo actually
// reflects the change.
export async function syncGitOps(data: GitOpsJobData) {
  const job = await gitOpsQueue.add(data.action, data)
  await job.waitUntilFinished(gitOpsQueueEvents)
}
