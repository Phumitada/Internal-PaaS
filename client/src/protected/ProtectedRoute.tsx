import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export default function ProtectedRoute() {

  const { user, isLoading } = useAuth() 
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-gray-600">Verifying session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}