import { Request, Response } from 'express'
import { appService } from '../services/app.service'
import { AuthRequest } from '../middleware/auth.middleware'

export const appController = {
  createApp: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }

      const { apps } = await appService.createApp({
        userId,
        name: req.body.name,
        repoUrl: req.body.repoUrl
      })

      res.status(201).json({ success: true, data: { apps } })
    } catch (error: any) {
      console.log(error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  getApps: async (req:Request,res:Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId
        if(!userId){
            res.status(401).json({
                success:false,
                message:'Unauthorized'
            })
            return
        }

        const result = await appService.getApps({
            userId,
            ...req.query
        })

        res.status(200).json({success:true, data:result})
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
        
    }
  },

  getAppById: async (req:Request,res:Response) => {
    try {
        const app = await appService.getAppById(req.params.id)
        res.status(200).json({success:true, data:app})
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
    }
  },

  deleteApp: async (req:Request,res:Response) => {
    try{
        await appService.deleteApp(req.params.id)
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
    }
  }
}