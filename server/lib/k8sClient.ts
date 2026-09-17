import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()
kc.loadFromCluster()

export const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api)
