import { appendLog } from './logStore'
import { buildEvents } from './emitter'

export type LogLevel = 'info' | 'success' | 'warn' | 'error'

const LEVEL_LABEL: Record<LogLevel, string> = {
  info: 'INFO',
  success: 'OK',
  warn: 'WARN',
  error: 'ERROR'
}

const timestamp = () => new Date().toISOString().slice(11, 19)

// Shared by build.worker and gitops.worker so a deploy's log reads as one
// continuous pipeline no matter which worker produced each line.
export function createDeployLogger(deployId?: string) {
  return (msg: string, level: LogLevel = 'info') => {
    const line = `[${timestamp()}] [${LEVEL_LABEL[level]}] ${msg}`
    if (level === 'error') console.error(line)
    else console.log(line)
    if (deployId) {
      appendLog(deployId, line)
      buildEvents.emit('log', { deployId, msg: line })
    }
  }
}
