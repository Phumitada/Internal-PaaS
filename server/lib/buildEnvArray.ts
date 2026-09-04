export function buildEnvArray(userEnv: Record<string, string>, port: number): string[] {
  const envString = []
  const merged = { ...userEnv, PORT: String(port) }
  for (const [key, value] of Object.entries(merged)) {
    envString.push(`${key}=${value}`)
  } 
  return envString
}