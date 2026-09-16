import { prisma } from '../db/prisma'
import { assertOwnership } from '../lib/assertOwnership'
import { syncGitOps } from '../lib/gitopsJob'
import type { CreateDatabasePayload, QueryDatabase, UpdateDatabasePayload } from '../types/database.type'

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
        await syncGitOps({ action: 'sync', kind: 'database', name: database.name, id: database.id })
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
            include: { apps: { select: { id: true } } },
        })
        if (!database) throw new Error('Database not found')
        if (database.userId !== userId) throw new Error('Forbidden')
        if (database.apps.length > 0) {
            throw new Error('Disconnect all apps from this database before deleting it')
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
        // application.yaml embeds databaseRef, so connecting a database
        // changes the app's manifest, not the database's.
        await syncGitOps({ action: 'sync', kind: 'app', name: app.name, id: app.id })
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
