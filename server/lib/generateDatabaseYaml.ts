import { dump } from 'js-yaml'

export const generateDatabaseYaml = (database: any) => {
  const databaseYaml = dump({
    apiVersion: 'paas.internal/v1',
    kind: 'Database',
    metadata: {
      name: database.name,
    },
    spec: {
      engine: database.engine.toLowerCase(),
      storage: database.storage,
    }
  })

  return databaseYaml
}