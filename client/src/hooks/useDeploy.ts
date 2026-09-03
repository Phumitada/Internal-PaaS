import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { deployService } from "@/api/services/deploy.service"
import { toast } from "sonner"

export const useRedeploy = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appId: string) => deployService.redeploy(appId),
    onSuccess: (_, appId) => {
      queryClient.invalidateQueries({ queryKey: ['App', appId] })
      toast.success("Deploy triggered!")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to trigger deploy")
    }
  })
}

export const useGetDeploys = (appId: string, query?: { page?: number; limit?: number; sortOrder?: 'asc' | 'desc' }) => {
    return useQuery({
      queryKey: ['Deploy', appId, query],
      queryFn: () => deployService.getDeploy(appId, query),
      enabled: !!appId
    })
  }