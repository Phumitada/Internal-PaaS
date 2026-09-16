import { prisma } from '../db/prisma'
import { assertOwnership } from '../lib/assertOwnership'
import { syncGitOps } from '../lib/gitopsJob'
import { k8sCoreApi } from '../lib/k8sClient'
import type { CreateDatabasePayload, QueryDatabase, UpdateDatabasePayload } from '../types/database.type'

export type DatabaseCredentialsResult =
    | { ready: true; credentials: Record<string, string> }
    | { ready: false }

export const databaseService = {
    createDatabase: async (payload: CreateDatabasePayload) => {
        const database = await prisma.database.create({
            data: {
                name: payload.name,
                engine: payload.engine,
                storage: payload.storage || '1Gi',
                userId: payload.userId,
            }
        })
        // deployId: database.id — reuses the database's own id as the log
        // stream key, so the frontend can `join` it immediately with the id
        // it already has from this response, without needing a separate
        // deployId back-channel.
        await syncGitOps({ action: 'sync', kind: 'database', name: database.name, id: database.id, deployId: database.id })
        return { database }
    },

    getDatabases: async (query: QueryDatabase) => {
        const {
            userId,
            engine,
            page = 1,
            limit = 10,
            search,
            sortOrder = 'asc'
        } = query;
        
        if (!userId) {
            throw new Error('userId is required');
        }
        
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;

        const whereClause: any = {
            userId,
        }

        if (engine) {
            whereClause.engine = engine;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: "insensitive" } }
            ]
        }

        let orderBy = {
            createdAt: sortOrder,
        }

        const databases = await prisma.database.findMany({
            where: whereClause,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy,
            include: { apps: { select: { id: true, name: true } } },
        })

        const total = await prisma.database.count({
            where: whereClause
        })

        return {
            data: databases,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        }
    },

    getDatabaseById: async (id: string, userId: string, role: string) => {
        const database = await prisma.database.findUnique({
            where: { id },
            include: { apps: { select: { id: true, name: true, status: true } } },
        })
        if (!database) throw new Error("Database not found")
        assertOwnership(database, userId, role)

        return database;
    },

    // The ownership check below is the actual security boundary here, not
    // K8s RBAC — the ServiceAccount can `get` any Secret in the namespace,
    // not just the requesting user's own. If this check has a gap, a user
    // could read another user's DB credentials just by guessing an id.
    getCredentials: async (id: string, userId: string, role: string): Promise<DatabaseCredentialsResult> => {
        const database = await prisma.database.findUnique({ where: { id } })
        if (!database) throw new Error("Database not found")
        assertOwnership(database, userId, role)

        const namespace = process.env.K8S_APP_NAMESPACE || 'default'
        const secretName = `${database.name}-credentials`
        try {
            const secret = await k8sCoreApi.readNamespacedSecret({ name: secretName, namespace })
            const data = secret.data ?? {}
            const credentials: Record<string, string> = {}
            for (const [key, value] of Object.entries(data)) {
                credentials[key] = Buffer.from(value as string, 'base64').toString('utf-8')
            }
            return { ready: true, credentials }
        } catch (err: any) {
            // The Secret only exists once GitOps has synced the CR and the
            // Go controller has reconciled it — a freshly-created database
            // legitimately doesn't have one yet.
            if (err.code === 404) return { ready: false }
            throw err
        }
    },

    updateDatabase: async (id: string, userId: string, role: string, payload: UpdateDatabasePayload) => {
        const database = await prisma.database.findUnique({
            where: { id }
        })
        if (!database) throw new Error("Database not found")
        assertOwnership(database, userId, role)
        const update = await prisma.database.update({
            where: { id },
            data: payload,
        })
        await syncGitOps({ action: 'sync', kind: 'database', name: update.name, id: update.id })
        return update
    },

    deleteDatabase: async (id: string, userId: string) => {
        const database = await prisma.database.findUnique({
            where: { id },
            include: { apps: { select: { id: true, name: true } } },
        })
        if (!database) throw new Error('Database not found')
        if (database.userId !== userId) throw new Error('Forbidden')
        if (database.apps.length > 0) {
            const names = database.apps.map(a => a.name).join(', ')
            throw new Error(`Disconnect ${names} from this database before deleting it`)
        }
        await prisma.database.delete({ where: { id } })
        await syncGitOps({ action: 'delete', kind: 'database', name: database.name, id: database.id })
    },

    connectApp: async (databaseId: string, appId: string, userId: string, role: string) => {
        const database = await prisma.database.findUnique({ where: { id: databaseId } })
        if (!database) throw new Error('Database not found')
        assertOwnership(database, userId, role)

        const app = await prisma.app.findUnique({ where: { id: appId } })
        if (!app) throw new Error('App not found')
        assertOwnership(app, userId, role)

        const result = await prisma.database.update({
            where: { id: databaseId },
            data: { apps: { connect: { id: appId } } },
            include: { apps: { select: { id: true, name: true } } },
        })
        try {
            // application.yaml embeds databaseRef, so connecting a database
            // changes the app's manifest, not the database's.
            await syncGitOps({ action: 'sync', kind: 'app', name: app.name, id: app.id })
        } catch (err) {
            // Without this, a failed sync here leaves the Postgres relation
            // connected while the user sees "failed to connect" — they
            // believe nothing happened, but deleteDatabase later refuses
            // with a confusing "disconnect this app" for a connection they
            // never knew succeeded. Roll back so connect is all-or-nothing.
            await prisma.database.update({
                where: { id: databaseId },
                data: { apps: { disconnect: { id: appId } } },
            }).catch(() => {})
            throw err
        }
        return result
    },

    disconnectApp: async (databaseId: string, appId: string, userId: string, role: string) => {
        const database = await prisma.database.findUnique({ where: { id: databaseId } })
        if (!database) throw new Error('Database not found')
        assertOwnership(database, userId, role)

        const app = await prisma.app.findUnique({ where: { id: appId } })
        if (!app) throw new Error('App not found')

        const result = await prisma.database.update({
            where: { id: databaseId },
            data: { apps: { disconnect: { id: appId } } },
            include: { apps: { select: { id: true, name: true } } },
        })
        await syncGitOps({ action: 'sync', kind: 'app', name: app.name, id: app.id })
        return result
    },
}
