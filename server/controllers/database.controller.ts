import { Request, Response } from 'express'
import { databaseService } from '../services/database.service'
import { AuthRequest } from '../middleware/auth.middleware'
import { createDatabaseSchema, updateDatabaseSchema, connectDatabaseSchema } from '../validator/database.validator'
import { emitDatabaseStatus } from '../lib/socket'

export const databaseController = {
  createDatabase: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }

      const parsed = createDatabaseSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.issues[0].message })
        return
      }

      const { database } = await databaseService.createDatabase({
        userId,
        name: parsed.data.name,
        engine: parsed.data.engine,
        storage: parsed.data.storage,
      })

      // Emit database status event
      emitDatabaseStatus(database.id, database.status)

      res.status(201).json({ success: true, data: { database } })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  getDatabases: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' })
        return
      }

      const result = await databaseService.getDatabases({
        ...(req.query as any),
        userId,
      })

      res.status(200).json({ success: true, data: result })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  getDatabaseById: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      const role = (req as AuthRequest).user?.role
      const database = await databaseService.getDatabaseById(req.params.id, userId!, role!)
      res.status(200).json({ success: true, data: database })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  getCredentials: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      const role = (req as AuthRequest).user?.role
      const result = await databaseService.getCredentials(req.params.id, userId!, role!)
      if (!result.ready) {
        res.status(404).json({ success: false, ready: false, message: 'Credentials not ready yet' })
        return
      }
      res.status(200).json({ success: true, ready: true, data: result.credentials })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  updateDatabase: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      const role = (req as AuthRequest).user?.role
      const parsed = updateDatabaseSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.issues[0].message })
        return
      }
      const database = await databaseService.updateDatabase(req.params.id, userId!, role!, parsed.data)
      
      // Emit database status event
      emitDatabaseStatus(database.id, database.status)
      
      res.status(200).json({ success: true, data: database })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  deleteDatabase: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      await databaseService.deleteDatabase(req.params.id, userId!)
      res.status(200).json({ success: true, message: 'Delete success' })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  connectApp: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      const role = (req as AuthRequest).user?.role
      const parsed = connectDatabaseSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.issues[0].message })
        return
      }
      const database = await databaseService.connectApp(req.params.id, parsed.data.appId, userId!, role!)
      
      // Emit database status event
      emitDatabaseStatus(database.id, database.status)
      
      res.status(200).json({ success: true, data: database })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  disconnectApp: async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.userId
      const role = (req as AuthRequest).user?.role
      const database = await databaseService.disconnectApp(req.params.id, req.params.appId, userId!, role!)
      
      // Emit database status event
      emitDatabaseStatus(database.id, database.status)
      
      res.status(200).json({ success: true, data: database })
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message })
    }
  },
}
