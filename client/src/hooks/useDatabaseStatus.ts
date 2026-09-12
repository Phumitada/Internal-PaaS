import { useEffect, useState, useRef } from 'react'
import { getSocket } from '@/lib/socket'

interface DatabaseStatusEvent {
  databaseId: string
  status: string
}

export const useDatabaseStatus = (databaseIds: string[]) => {
  const [statusMap, setStatusMap] = useState<Map<string, string>>(new Map())
  const socketRef = useRef<any>(null)
  const idsKey = databaseIds.join(',')

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      databaseIds.forEach(databaseId => {
        socket.emit('join:database', databaseId)
      })
    })

    socket.on('database:status', (event: DatabaseStatusEvent) => {
      setStatusMap(prev => new Map(prev).set(event.databaseId, event.status))
    })

    databaseIds.forEach(databaseId => {
      socket.emit('join:database', databaseId)
    })

    return () => {
      socket.off('connect')
      socket.off('database:status')
      databaseIds.forEach(databaseId => {
        socket.emit('leave:database', databaseId)
      })
    }
  }, [idsKey])

  return (databaseId: string) => statusMap.get(databaseId)
}
