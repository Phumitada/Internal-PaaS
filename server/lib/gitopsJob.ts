import { randomUUID } from 'crypto'
import { gitOpsQueue, gitOpsQueueEvents } from '../queues/gitOps.queue'

export type GitOpsJobData =
  | { action: 'sync'; kind: 'app'; name: string; id: string; deployId?: string }
  | { action: 'sync'; kind: 'database'; name: string; id: string; deployId?: string }
  | { action: 'delete'; kind: 'app'; name: string; id: string; deployId?: string }
  | { action: 'delete'; kind: 'database'; name: string; id: string; deployId?: string }

// Enqueues a gitops job and waits for it to finish, so callers (a deploy,
// a database CRUD request) only succeed once the manifest repo actually
// reflects the change.
//
// Callers that aren't part of a real deploy (database CRUD, a domain-only
// app update, ...) have no deployId to pass. Rather than let gitops.worker
// receive `undefined` and silently drop its log lines (createDeployLogger
// no-ops without one), generate a standalone id here so every gitops job
// always has a log stream, even if nothing currently reads it.
export async function syncGitOps(data: GitOpsJobData) {
  const payload = { ...data, deployId: data.deployId ?? randomUUID() }
  const job = await gitOpsQueue.add(data.action, payload)
  await job.waitUntilFinished(gitOpsQueueEvents)
}
