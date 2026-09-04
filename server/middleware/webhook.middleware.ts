import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export const verifyGithubWebhook = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-hub-signature-256'] as string
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('GITHUB_WEBHOOK_SECRET not configured')
    return res.status(500).json({ success: false, message: 'Webhook secret not configured' })
  }

  if (!signature) {
    return res.status(401).json({ success: false, message: 'Missing signature' })
  }

  // The raw body is stored by express.json() with verify: true
  const rawBody = (req as any).rawBody

  if (!rawBody) {
    return res.status(401).json({ success: false, message: 'Missing raw body' })
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSignature) {
    console.error('Webhook signature mismatch')
    return res.status(401).json({ success: false, message: 'Invalid signature' })
  }

  next()
}
