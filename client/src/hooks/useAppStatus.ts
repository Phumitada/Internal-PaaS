import { useEffect, useState, useRef } from 'react'
import { getSocket } from '@/lib/socket'

interface AppStatusEvent {
  appId: string
  status: string
}

export const useAppStatus = (appIds: string[]) => {
  const [statusMap, setStatusMap] = useState<Map<string, string>>(new Map())
  const socketRef = useRef<any>(null)
  const idsKey = appIds.join(',')

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      appIds.forEach(appId => {
        socket.emit('join:app', appId)
      })
    })

    socket.on('app:status', (event: AppStatusEvent) => {
      setStatusMap(prev => new Map(prev).set(event.appId, event.status))
    })

    appIds.forEach(appId => {
      socket.emit('join:app', appId)
    })

    return () => {
      socket.off('connect')
      socket.off('app:status')
      appIds.forEach(appId => {
        socket.emit('leave:app', appId)
      })
    }
  }, [idsKey])

  return (appId: string) => statusMap.get(appId)
}
