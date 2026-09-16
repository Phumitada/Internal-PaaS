import { z } from 'zod'

export const createAppSchema = z.object({
    name: z.string().min(1).max(50),
    repoUrl: z.string().url()
})

export const updateAppSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    repoUrl: z.string().url().optional(),
    rootDir: z.string().min(1).max(255).optional(),
    domain: z.string().max(255).optional(),
    status: z.enum(['IDLE', 'BUILDING', 'SYNCING', 'RUNNING', 'STOPPED', 'ERROR']).optional(),
})