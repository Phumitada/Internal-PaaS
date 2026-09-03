import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { buildEvents } from './emitter'
import { getLogs } from './logStore'

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: ['http://localhost:3000', 'http://localhost:5173'] }
  })

  io.on('connection', (socket) => {
    socket.on('join', (deployId: string) => {
      socket.join(deployId)
      const logs = getLogs(deployId)
      socket.emit('log:backlog',logs)
    })
  })

  buildEvents.on('log', (payload) => {
    io.to(payload.deployId).emit('log:line',payload.msg)
  })
}