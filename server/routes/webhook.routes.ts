import { Router } from 'express'
import { webhookController } from '../controllers/webhook.controller'
import { authenticate } from '../middleware/auth.middleware'


const router = Router()

router.post('/github', webhookController.handleGithubPush)
router.post('/deploy/:appId', authenticate , webhookController.handleManualDeploy)

export default router