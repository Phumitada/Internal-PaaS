import { api, axiosPublic } from '@/api/client'

export const deployService = {
    redeploy: async (appId: string) => {
      const response = await api.post(`/webhook/deploy/${appId}`)
      return response.data
    },

    getDeploy: async (appId:string,query?: { page?: number; limit?: number; sortOrder?: 'asc' | 'desc' }) => {
        const response = await api.get(`/deploy/${appId}`,{params:query})
        return response.data
    }
  }