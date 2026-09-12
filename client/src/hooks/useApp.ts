import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { appService } from "@/api/services/app.service"
import type { AdminQueryApp, QueryApp, UpdateAppPayload,CreateAppPayload } from "@/types/app.type"
import { toast } from "sonner"

export const useCreateApp = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAppPayload) => appService.createApp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['App'] })
      toast.success('App created successfully')
    },
    onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to create App')
    }
  })
}

export const useGetApps = (query?: QueryApp) => {
    return useQuery({
      queryKey: ['App', query],
      queryFn: () => appService.getApp(query || { userId: '' }),
      enabled: !!query?.userId
    })
  }

export const useGetAllApps = (query: AdminQueryApp) => {
  return useQuery({
    queryKey: ['AppAdmin', query],
    queryFn: () => appService.getAllApps(query)
  })
}

export const useGetAppById = (id: string,options? : { refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: ['App', id],
    queryFn: () => appService.getAppById(id),
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  })
}

export const useUpdateApp = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppPayload }) =>
      appService.updateApp(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['App', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['App'] })
      toast.success('App updated successfully')
    },
    onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to update App')
    }
  })
}

export const useUpdateAppEnv = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, envVars }: { id: string; envVars: Record<string, string> }) =>
      appService.updateAppEnv(id, envVars),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['App', variables.id] })
      toast.success('Environment variables updated and redeploy triggered')
      return data
    },
    onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to update environment variables')
    }
  })
}

export const useDeleteApp = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => appService.deleteApp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['App'] })
        toast.success('App deleted successfully')
    },
    onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to delete App')
      console.error('Failed to delete', error)
    }
  })
}