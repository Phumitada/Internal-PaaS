import { Router } from 'express'
import { webhookController } from '../controllers/webhook.controller'


const router = Router()

router.post('/github', webhookController.handleGithubPush)

export default router