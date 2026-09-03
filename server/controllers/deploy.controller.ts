import { Request, Response } from 'express'
import { deployService } from '../services/deploy.service'

export const deployController = {
  getDeploy: async (req: Request, res: Response) => {
    try {
      const { appId } = req.params
      const result = await deployService.getDeploy({
        appId,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      })
      res.status(200).json({ success: true, data: result })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  }
}