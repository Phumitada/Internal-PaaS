import { Request, Response } from 'express'
import { prisma } from '../db/prisma'
import { buildQueue } from '../queues/build.queue'

export const webhookController = {
  handleGithubPush: async (req: Request, res: Response) => {
    try {
        const repoUrl = req.body.repository?.clone_url
        const branch = req.body.ref

        if(branch !== 'refs/heads/main'){
            res.status(200).json({message: 'Not main branch, skipping'})
            return
        }

        const app = await prisma.app.findFirst({
            where: { repoUrl }
        })

        if(!app){
            res.status(200).json({message:'No app found'})
            return 
        }
        const deploy = await prisma.deploy.create({
            data: {
                appId: app.id,
                repoUrl,
                status: 'PENDING'
            }
        })

        await buildQueue.add('build',{
            appId: app.id,
            repoUrl,
            deployId: deploy.id
        })
        res.status(200).json({ success:true, deployId: deploy.id})
    } catch (error) {
        res.status(400).json({ success:false, message: error.message})
    }
  }
}