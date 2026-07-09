import { Request, Response } from 'express'
import { appService } from '../services/app.service'
import { AuthRequest } from '../middleware/auth.middleware'
import { createAppSchema, updateAppSchema } from '../validator/app.validator'

export const appController = {
  createApp: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }
      const parsed = createAppSchema.safeParse(req.body)
      if(!parsed.success){
        res.status(400).json({
            success: false,
            message: parsed.error.issues[0].message
        })
        return
      }

      const { apps } = await appService.createApp({
        userId,
        ...parsed.data
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

  getAllApps: async (req:Request,res:Response) => {
    try {
        const result = await appService.getAllApps(req.query)
        res.status(200).json({succes:true,data:result})
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
    }
  },

  getAppById: async (req:Request,res:Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId
        const role = (req as AuthRequest).user?.role
        const app = await appService.getAppById(req.params.id,userId!,role!)
        res.status(200).json({success:true, data:app})
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
    }
  },

  updateApp: async (req:Request,res:Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId
        const role = (req as AuthRequest).user?.role
        const parsed = updateAppSchema.safeParse(req.body)
        if (!parsed.success) {
        res.status(400).json({ 
            success: false, 
            message: parsed.error.issues[0].message 
        })
        return
        }
        const app = await appService.updateApp(req.params.id,userId!,role!,req.body)
        res.status(200).json({success:true,data:app})
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
    }
  },

  deleteApp: async (req:Request,res:Response) => {
    try{
        const userId = (req as AuthRequest).user?.userId
        await appService.deleteApp(req.params.id,userId!)
        res.status(200).json({success:true,message:"Delete success"})
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
    }
  },

  adminDeleteApp: async (req:Request,res:Response) => {
    try {
        await appService.adminDeleteApp(req.params.id)
        res.status(200).json({success:true,message:"Delete success"})
    } catch (error) {
        res.status(400).json({success:false,message:error.message})
    }
  }
}