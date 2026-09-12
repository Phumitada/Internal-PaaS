import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { databaseService } from '@/api/services/database.service'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export const useCreateDatabase = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (data: { name: string; engine: string; storage: string }) =>
      databaseService.createDatabase({ ...data, userId: user?.userId || "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Database'] })
      toast.success('Database created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create database')
    }
  })
}

export const useGetDatabases = (params: any) => {
  return useQuery({
    queryKey: ['Database', params],
    queryFn: () => databaseService.getDatabases(params),
    enabled: !!params?.userId,
  })
}

export const useGetDatabaseById = (id: string) => {
  return useQuery({
    queryKey: ['Database', id],
    queryFn: () => databaseService.getDatabaseById(id),
    enabled: !!id
  })
}

export const useUpdateDatabase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      databaseService.updateDatabase(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['Database'] })
      queryClient.invalidateQueries({ queryKey: ['Database', variables.id] })
      toast.success('Database updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update database')
    }
  })
}

export const useDeleteDatabase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => databaseService.deleteDatabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Database'] })
      toast.success('Database deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete database')
    }
  })
}

export const useConnectDatabase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ databaseId, appId }: { databaseId: string; appId: string }) =>
      databaseService.connectApp(databaseId, appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Database'] })
      queryClient.invalidateQueries({ queryKey: ['App'] })
      toast.success('App connected to database successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to connect app')
    }
  })
}

export const useDisconnectDatabase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ databaseId, appId }: { databaseId: string; appId: string }) =>
      databaseService.disconnectApp(databaseId, appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Database'] })
      queryClient.invalidateQueries({ queryKey: ['App'] })
      toast.success('App disconnected from database successfully')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to disconnect app')
    }
  })
}
