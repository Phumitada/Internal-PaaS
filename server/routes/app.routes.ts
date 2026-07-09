import { Router } from 'express'
import { appController } from '../controllers/app.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/create', authenticate, appController.createApp)
router.get('/',authenticate,appController.getApps)
router.get('/:id',authenticate,appController.getAppById)
router.delete('/:id',authenticate,appController.deleteApp)

export default router