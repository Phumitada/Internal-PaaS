import { Router } from 'express'
import { webhookController } from '../controllers/webhook.controller'
import { authenticate } from '../middleware/auth.middleware'
import { verifyGithubWebhook } from '../middleware/webhook.middleware'

const router = Router()

router.post('/github', verifyGithubWebhook, webhookController.handleGithubPush)
router.post('/deploy/:appId', authenticate , webhookController.handleManualDeploy)

export default router