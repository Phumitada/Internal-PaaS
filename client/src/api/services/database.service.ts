import { api } from '@/api/client'

export const databaseService = {
  createDatabase: async (data: { name: string; engine: string; storage: string; userId: string }) => {
    const response = await api.post('/database/create', data)
    return response.data.data
  },

  getDatabases: async (params: any) => {
    const response = await api.get('/database', { params })
    return response.data.data
  },

  getDatabaseById: async (id: string) => {
    const response = await api.get(`/database/${id}`)
    return response.data.data
  },

  updateDatabase: async (id: string, data: any) => {
    const response = await api.put(`/database/${id}`, data)
    return response.data.data
  },

  deleteDatabase: async (id: string) => {
    const response = await api.delete(`/database/${id}`)
    return response.data.data
  },

  connectApp: async (databaseId: string, appId: string) => {
    const response = await api.post(`/database/${databaseId}/connect`, { appId })
    return response.data.data
  },

  disconnectApp: async (databaseId: string, appId: string) => {
    const response = await api.delete(`/database/${databaseId}/connect/${appId}`)
    return response.data.data
  },
}
