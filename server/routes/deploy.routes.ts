import { Router } from 'express'
import { deployController } from '../controllers/deploy.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/single/:deployId',authenticate,deployController.getDeployById)
router.get('/:appId',authenticate,deployController.getDeploy)

export default router