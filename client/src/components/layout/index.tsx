import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { LayoutDashboard, Server, BookOpen, Settings, LogOut, ChevronDown } from "lucide-react"
import { useState } from "react"

const NAV_ITEMS = [
  { to: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { to: "/services",   label: "Services",   icon: Server },
  { to: "/tutorial",   label: "Tutorial",   icon: BookOpen },
  { to: "/settings",   label: "Settings",   icon: Settings },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <aside className="w-52 border-r border-zinc-200 bg-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-100 flex items-center gap-2">
        <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold font-mono">P</span>
        </div>
        <span className="text-sm font-semibold text-zinc-900 font-mono">PaaS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? "bg-zinc-100 text-zinc-900 font-medium"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User menu */}
      <div className="border-t border-zinc-100 p-2 relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded hover:bg-zinc-50 transition-colors"
        >
          <div className="w-6 h-6 bg-zinc-200 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-zinc-600">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <span className="text-xs text-zinc-600 truncate flex-1 text-left">
            {user?.email?.split("@")[0] || "user"}
          </span>
          <ChevronDown className="w-3 h-3 text-zinc-400 flex-shrink-0" />
        </button>

        {userMenuOpen && (
          <div className="absolute bottom-14 left-2 right-2 bg-white border border-zinc-200 rounded-lg shadow-sm py-1 z-50">
            <div className="px-3 py-2 border-b border-zinc-100">
              <p className="text-xs font-medium text-zinc-700 truncate">{user?.email}</p>
              <p className="text-xs text-zinc-400 capitalize">{user?.role?.toLowerCase() || "user"}</p>
            </div>
            <button
              onClick={() => { onLogout(); setUserMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export function MainLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
