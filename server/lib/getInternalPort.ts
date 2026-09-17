export function getInternalPort(framework: string, envVars?: Record<string, string>): number {
  const userPort = Number(envVars?.PORT)
  if (envVars?.PORT && !isNaN(userPort)) {
    return userPort
  }
  if (framework == 'react') {
    return 8080
  } else {
    return 3000
  }
}