import { prisma } from '../db/prisma'
import type { AdminQueryApp, CreateAppPayload, QueryApp } from '../types/app.type'

export const appService = {
    createApp: async (payload:CreateAppPayload ) => {
        const apps = await prisma.app.create({
            data:{
                name: payload.name,
                repoUrl: payload.repoUrl,
                userId: payload.userId
            }
        })
        return { apps }
    },

    getApps: async (query:QueryApp) => {
        const {
            userId,
            status,
            page = 1,
            limit = 10,
            search,
            sortOrder = 'asc'
        } = query;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;

        const whereClause: any = {
            userId,
        }
        
        if(status){
            whereClause.status = {contains:status,mode:"insensitive"}
        }

        if(search){
            whereClause.OR = [
                {name: {contains:search,mode:"insensitive"}}
            ]
        }

        let orderBy = {
            createdAt: sortOrder,
        }

        const apps = await prisma.app.findMany({
            where:whereClause,
            skip:(pageNum - 1) * limitNum,
            take: limitNum,
            orderBy,
        })

        const total = await prisma.app.count({
            where:whereClause
        })

        return {
            data: apps,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        }
    },


    getAllApps: async (query:AdminQueryApp) => {
        const {
            status,
            page = 1,
            limit = 10,
            search,
            sortOrder = 'asc'
        } = query;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;

        const whereClause: any = {}
        
        if(status){
            whereClause.status = {contains:status,mode:"insensitive"}
        }

        if(search){
            whereClause.OR = [
                {name: {contains:search,mode:"insensitive"}}
            ]
        }

        let orderBy = {
            createdAt: sortOrder,
        }

        const apps = await prisma.app.findMany({
            where:whereClause,
            skip:(pageNum - 1) * limitNum,
            take: limitNum,
            orderBy,
            include: { user: { select: { name: true, email: true } } }
        })

        const total = await prisma.app.count({
            where:whereClause
        })

        return {
            data: apps,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        }
    },

    getAppById: async (id:string,userId:string,role:string) => {
        const app = await prisma.app.findUnique({
            where: {id}
        })

        if(!app) throw new Error("App not found")
        if(app.userId !== userId && role !== 'ADMIN') throw new Error('Forbidden')

        return app;
    },

    deleteApp: async (id:string,userId:string) => {
        const app = await prisma.app.findUnique({
            where:{id}
        })
        if(!app) throw new Error('App not found')
        if(app.userId !== userId) throw new Error('Forbidden')
        if(app?.status != "STOPPED"){
            throw new Error("App has to be Stop")
        }
        await prisma.app.delete({where: {id}})
    },

    adminDeleteApp: async(id:string) => {
        await prisma.app.delete({where: {id}})
    }
}