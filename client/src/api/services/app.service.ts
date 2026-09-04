import { api } from '@/api/client'
import type { CreateAppPayload,QueryApp,AdminQueryApp,UpdateAppPayload } from '@/types/app.type'

export const appService = {
    createApp: async (payload: CreateAppPayload) => {
      const response = await api.post('/app/create', payload)
      return response.data.data
    },
  
    getApp: async (query: QueryApp) => {
      const response = await api.get('/app', { params: query })
      return response.data.data
    },
  
    getAllApps: async (query: AdminQueryApp) => {
      const response = await api.get('/app/all', { params: query })  
      return response.data.data
    },
  
    getAppById: async (id: string) => { 
      const response = await api.get(`/app/${id}`)  
      return response.data.data
    },
  
    updateApp: async (id: string, payload: UpdateAppPayload) => {  
      const response = await api.put(`/app/${id}`, payload)
      return response.data.data
    },
  
    updateAppEnv: async (id: string, envVars: Record<string, string>) => {
      const response = await api.put(`/app/${id}/env`, envVars)
      return response.data.data
    },
  
    deleteApp: async (id: string) => {  
      const response = await api.delete(`/app/${id}`)
      return response.data.data
    },
  
    adminDeleteApp: async (id: string) => {  
      const response = await api.delete(`/app/admin/${id}`)
      return response.data.data
    }
  }