import { Router } from 'express'
import { deployController } from '../controllers/deploy.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/:appId',authenticate,deployController.getDeploy)

export default router