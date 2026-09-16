import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import './workers/build.worker'
import './workers/gitops.worker'
import authRoutes from './routes/auth.routes'
import appRoutes from './routes/app.routes'
import webhookRouter from './routes/webhook.routes'
import deployRouter from './routes/deploy.routes'
import databaseRouter from './routes/database.routes'
import { setupSocket } from './lib/socket'
 
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173','https://idp.phumitada.com'],
  credentials: true,
}))

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf
  }
}))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/app', appRoutes)
app.use('/api/webhook',webhookRouter)
app.use('/api/deploy',deployRouter)
app.use('/api/database',databaseRouter)

// Execute
const server = app.listen(PORT, () => {   
  console.log(`Server running at http://localhost:${PORT}`)
})

setupSocket(server)