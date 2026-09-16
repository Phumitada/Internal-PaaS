import { Router } from 'express'
import { databaseController } from '../controllers/database.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/create', authenticate, databaseController.createDatabase)
router.get('/', authenticate, databaseController.getDatabases)
router.get('/:id', authenticate, databaseController.getDatabaseById)
router.get('/:id/credentials', authenticate, databaseController.getCredentials)
router.put('/:id', authenticate, databaseController.updateDatabase)
router.delete('/:id', authenticate, databaseController.deleteDatabase)

router.post('/:id/connect', authenticate, databaseController.connectApp)
router.delete('/:id/connect/:appId', authenticate, databaseController.disconnectApp)

export default router
