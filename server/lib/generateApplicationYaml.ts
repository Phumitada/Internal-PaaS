import { dump } from 'js-yaml'

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