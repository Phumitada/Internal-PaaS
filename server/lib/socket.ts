import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { buildEvents } from './emitter'
import { getLogs } from './logStore'

let io: Server | null = null

export function setupSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: ['http://localhost:3000', 'http://localhost:5173','https://idp.phumitada.com'] }
  })

  io.on('connection', (socket) => {
    socket.on('join', (deployId: string) => {
      socket.join(deployId)
      const logs = getLogs(deployId)
      socket.emit('log:backlog',logs)
    })

    socket.on('join:app', (appId: string) => {
      socket.join(`app:${appId}`)
    })

    socket.on('join:database', (databaseId: string) => {
      socket.join(`database:${databaseId}`)
    })
  })

  buildEvents.on('log', (payload) => {
    if (io) {
      io.to(payload.deployId).emit('log:line',payload.msg)
    }
  })
}

export function getIO() {
  return io
}

export function emitAppStatus(appId: string, status: string) {
  if (!io) return
  io.to(`app:${appId}`).emit('app:status', { appId, status })
}

export function emitDatabaseStatus(databaseId: string, status: string) {
  if (!io) return
  io.to(`database:${databaseId}`).emit('database:status', { databaseId, status })
}