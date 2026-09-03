import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}

export default MainLayout
