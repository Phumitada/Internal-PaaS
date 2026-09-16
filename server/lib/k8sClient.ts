import * as k8s from '@kubernetes/client-node'

// Single shared client for every in-cluster K8s API call this server makes.
// Was previously declared inline in gitops.worker.ts; a second copy
// elsewhere risks drifting the same way getSecretName/getEnvSecretName did.
const kc = new k8s.KubeConfig()
kc.loadFromCluster()

export const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api)
