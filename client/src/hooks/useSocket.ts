import { useEffect, useState, useCallback, useRef } from 'react'
import { getSocket } from '@/lib/socket'

export const useSocket = (deployId: string) => {
  const [isConnected, setIsConnected] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const socketRef = useRef<any>(null)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('log:backlog', (backlogLogs: string[]) => {
      setLogs(backlogLogs || [])
    })

    socket.on('log:line', (msg: string) => {
      setLogs((prev) => [...prev, msg])
    })

    if (deployId) {
      socket.emit('join', deployId)
    }

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('log:backlog')
      socket.off('log:line')
    }
  }, [deployId])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return {
    isConnected,
    logs,
    clearLogs,
    socket: socketRef.current,
  }
}
