import { prisma } from '../db/prisma'

interface DeployQuery {
  appId: string
  page?: number
  limit?: number
  sortOrder?: 'asc' | 'desc'
}

export const deployService = {
  getDeploy: async (query: DeployQuery) => {
    const {
      appId,
      page = 1,
      limit = 10,
      sortOrder = 'desc'
    } = query

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10

    const deploys = await prisma.deploy.findMany({
      where: { appId },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: sortOrder }
    })

    const total = await prisma.deploy.count({ where: { appId } })

    return {
      data: deploys,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  },

  getDeployById: async (deployId: string) => {
    const deploy = await prisma.deploy.findUnique({
      where: { id: deployId }
    })
    return deploy
  }
}