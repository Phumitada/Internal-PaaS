import { dump } from 'js-yaml'

// Single source of truth for the k8s Secret name an app's env vars live in.
// gitops.worker.ts creates/updates this secret directly, so it must compute
// the exact same name as the one embedded in envSecretRefs below.
export const getEnvSecretName = (appName: string): string => `${appName}-env-secret`

export const generateApplicationYaml = (application: any) => {
  const applicationYaml = dump({
      apiVersion: 'paas.internal/v1',
      kind: 'Application',
      metadata: {
          name: application.name
      },
      spec: {
          image: application.ghcrUrl,
          port: application.port,
          imagePullSecret: "ghcr-secret",
          databaseRef: application.databases.map(db => db.name),
          ...(application.domain ? { domain: application.domain } : {}),
          envSecretRefs: [getEnvSecretName(application.name)]
      }
  })

  return applicationYaml
}