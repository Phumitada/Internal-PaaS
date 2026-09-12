import { z } from 'zod'

// Matches k8s resource.Quantity style used on the Go controller side: "1Gi", "500Mi", "10Gi"
const storagePattern = /^\d+(Gi|Mi|Ki)$/

export const createDatabaseSchema = z.object({
    name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
    engine: z.enum(['POSTGRES', 'REDIS']),
    storage: z.string().regex(storagePattern, "Use k8s quantity format, e.g. 1Gi").optional(),
})

export const updateDatabaseSchema = z.object({
    name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only").optional(),
    storage: z.string().regex(storagePattern, "Use k8s quantity format, e.g. 1Gi").optional(),
})

export const connectDatabaseSchema = z.object({
    appId: z.string().min(1, "appId is required"),
})
