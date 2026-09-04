const MAX_LOG_ENTRIES = 100
const logStore = new Map<string, string[]>()
const accessOrder = new Map<string, number>()
let accessCounter = 0

export function appendLog(deployId: string, line: string) {
  if(!logStore.has(deployId)){
    logStore.set(deployId,[])
  }
  logStore.get(deployId)!.push(line)
  
  // Update access order for LRU
  accessOrder.set(deployId, accessCounter++)
  
  // Evict oldest entry if limit exceeded
  if (logStore.size > MAX_LOG_ENTRIES) {
    evictOldest()
  }
}

export function getLogs(deployId: string): string[] {
  // Update access order on read
  if (logStore.has(deployId)) {
    accessOrder.set(deployId, accessCounter++)
  }
  return logStore.get(deployId) || []
}

export function removeLogs(deployId: string) {
  logStore.delete(deployId)
  accessOrder.delete(deployId)
}

function evictOldest() {
  let oldestDeployId: string | null = null
  let oldestAccess = Infinity
  
  for (const [deployId, access] of accessOrder.entries()) {
    if (access < oldestAccess) {
      oldestAccess = access
      oldestDeployId = deployId
    }
  }
  
  if (oldestDeployId) {
    logStore.delete(oldestDeployId)
    accessOrder.delete(oldestDeployId)
  }
}