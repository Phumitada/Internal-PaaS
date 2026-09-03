import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { MainLayout } from "@/components/layout/MainLayout"

import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Dashboard from "@/pages/Dashboard"
import { ServicesList, NewService, ServiceDetail } from "@/pages/Services"
import Tutorial from "@/pages/Tutorial"
import AdminDashboard from "@/pages/Admin"
import Settings from "@/pages/Settings"

// ─── Route guards ─────────────────────────────────────────────────────────────

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <svg className="animate-spin w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AdminRoute() {
  const { user } = useAuth()
  if (user?.role !== "ADMIN") return <Navigate to="/dashboard" replace />
  return <Outlet />
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services" element={<ServicesList />} />
            <Route path="/services/new" element={<NewService />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="/settings" element={<Settings />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
