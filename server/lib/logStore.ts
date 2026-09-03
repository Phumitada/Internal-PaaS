const logStore = new Map<string, string[]>()

export function appendLog(deployId: string, line: string) {
  if(!logStore.has(deployId)){
    logStore.set(deployId,[])
  }
  logStore.get(deployId)!.push(line)
}

export function getLogs(deployId: string): string[] {
    return logStore.get(deployId) || []
}