import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useState, useRef, useEffect } from "react"
import { LayoutDashboard, Server, BookOpen, Settings, Shield, ChevronDown, LogOut, User, Database } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/services",  label: "Services",  icon: Server },
  { to: "/databases", label: "Databases", icon: Database },
  { to: "/tutorial",  label: "Tutorial",  icon: BookOpen },
  { to: "/settings",  label: "Settings",  icon: Settings },
]

function UserMenu({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-zinc-100 transition-colors"
      >
        <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-zinc-600">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </span>
        </div>
        <span className="text-xs text-zinc-600 max-w-[120px] truncate hidden sm:block">
          {user?.email?.split("@")[0] || "user"}
        </span>
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-48 bg-white border border-zinc-200 rounded-lg shadow-sm z-50 py-1">
          <div className="px-3 py-2 border-b border-zinc-100">
            <p className="text-xs font-medium text-zinc-900 truncate">{user?.email}</p>
            <p className="text-xs text-zinc-400 capitalize mt-0.5">{user?.role?.toLowerCase() || "user"}</p>
          </div>
          {user?.role === "ADMIN" && (
            <NavLink
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> Admin panel
            </NavLink>
          )}
          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <User className="w-3.5 h-3.5" /> Profile
          </NavLink>
          <div className="my-1 border-t border-zinc-100" />
          <button
            onClick={() => { onLogout(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function MainLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Top navbar */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="px-6 h-12 flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo + nav */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold font-mono">P</span>
              </div>
              <span className="text-sm font-semibold font-mono text-zinc-900 hidden sm:block">PaaS</span>
            </div>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? "bg-zinc-100 text-zinc-900 font-medium"
                        : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* User menu */}
          <UserMenu user={user} onLogout={logout} />
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
