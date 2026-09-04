import { Router } from 'express'
import { appController } from '../controllers/app.controller'
import { authenticate,authorize } from '../middleware/auth.middleware'

const router = Router()

router.post('/create', authenticate, appController.createApp)
router.get('/',authenticate,appController.getApps)
router.get('/all',authenticate,authorize('ADMIN'),appController.getAllApps)
router.put('/:id',authenticate,appController.updateApp)
router.put('/:id/env',authenticate,appController.updateAppEnv)
router.get('/:id',authenticate,appController.getAppById)
router.delete('/:id',authenticate,appController.deleteApp)

router.delete('/admin/:id',authenticate,authorize('ADMIN'),appController.adminDeleteApp)

export default router