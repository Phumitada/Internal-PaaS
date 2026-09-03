import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/api/services/auth.service'
import { useErrorHandler } from './useErrorHandler'

export const useAuth = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  // ลบ isLoading ออกจาก store ดึงมาเฉพาะตัวแปรคุมสถานะระบบหลัก
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore()
  const { handleError } = useErrorHandler()

  // ตรวจสอบหน้าเพจสาธารณะ
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/landing'

  const { isLoading: isFetchingUser } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const data = await authService.getMe()
        if (data) {
          setAuth({
            userId: data.user.id,    // map id → userId
            email:  data.user.email,
            role:   data.user.role,
          }, data.accessToken)
        }
        return data
      } catch (error: any) {
        if (error?.response?.status === 401) {
          clearAuth()
          return null
        }
        throw error
      }
    },
    // รันเฉพาะตอนที่ยังไม่มีการยืนยันตัวตน และไม่อยู่ในกลุ่มหน้า Auth
    enabled: !isAuthenticated && !isAuthPage,
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth({
        userId: data.user.id,      
        email:  data.user.email,
        role:   data.user.role,
      }, data.accessToken)
      toast.success(`Welcome back, ${data.user.email}!`)
      navigate("/dashboard")
    },
    onError: (error: any) => {
      handleError(error, 'Login failed')
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth({
        userId: data.user.id,      
        email:  data.user.email,
        role:   data.user.role,
      }, data.accessToken)
      toast.success('Account created!')
      navigate('/dashboard')
    },
    })

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate("/login");
      toast.success("Logged out");
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading: isFetchingUser,

    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,

    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
};