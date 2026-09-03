import { Request, Response } from 'express'
import { prisma } from '../db/prisma'
import { buildQueue } from '../queues/build.queue'

export const webhookController = {
  handleGithubPush: async (req: Request, res: Response) => {
    try {
      const repoUrl = req.body.repository?.clone_url
      const branch = req.body.ref

      if (branch !== 'refs/heads/main') {
        res.status(200).json({ message: 'Not main branch, skipping' })
        return
      }

      const app = await prisma.app.findFirst({ where: { repoUrl } })

      if (!app) {
        res.status(200).json({ message: 'No app found' })
        return
      }

      const deploy = await prisma.deploy.create({
        data: { appId: app.id, repoUrl, status: 'PENDING' }
      })

      await buildQueue.add('build', { appId: app.id, repoUrl, deployId: deploy.id })

      await prisma.app.update({ where: { id: app.id }, data: { status: 'BUILDING' } })

      res.status(200).json({ success: true, deployId: deploy.id })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  handleManualDeploy: async (req: Request, res: Response) => {
    try {
      const { appId } = req.params

      const app = await prisma.app.findUnique({ where: { id: appId } })

      if (!app) {
        res.status(404).json({ success: false, message: 'App not found' })
        return
      }

      if (!app.repoUrl) {
        res.status(400).json({ success: false, message: 'No repo URL configured' })
        return
      }

      const deploy = await prisma.deploy.create({
        data: { appId: app.id, repoUrl: app.repoUrl, status: 'PENDING' }
      })

      await buildQueue.add('build', { appId: app.id, repoUrl: app.repoUrl, deployId: deploy.id })

      await prisma.app.update({ where: { id: app.id }, data: { status: 'BUILDING' } })

      res.status(200).json({ success: true, deployId: deploy.id })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }
}