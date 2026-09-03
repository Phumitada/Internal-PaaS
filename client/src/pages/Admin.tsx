import { useState } from "react"
import { Search, Trash2, RefreshCw } from "lucide-react"
import { useGetAllApps } from "@/hooks/useApp"
import { useDeleteApp } from "@/hooks/useApp"

const STATUS_DOT: Record<string, string> = {
  RUNNING:  "bg-emerald-500",
  BUILDING: "bg-yellow-400 animate-pulse",
  STOPPED:  "bg-zinc-300",
  ERROR:    "bg-red-500",
  IDLE:     "bg-zinc-300",
}

const STATUS_TEXT: Record<string, string> = {
  RUNNING:  "text-emerald-600",
  BUILDING: "text-yellow-600",
  STOPPED:  "text-zinc-400",
  ERROR:    "text-red-500",
  IDLE:     "text-zinc-400",
}

type AdminTab = "services" | "users"

// Mock users — replace when user API is ready
const MOCK_USERS = [
  { id: "1", email: "ham@example.com",   role: "ADMIN", apps: 3, createdAt: "Jan 2025" },
  { id: "2", email: "alice@example.com", role: "USER",  apps: 1, createdAt: "Feb 2025" },
  { id: "3", email: "bob@example.com",   role: "USER",  apps: 1, createdAt: "Mar 2025" },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("services")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const deleteApp = useDeleteApp()

  const { data, isLoading } = useGetAllApps({
    search: search || undefined,
    page,
    limit: 20,
  })

  const apps: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : []

  const running = apps.filter((a) => a.status === "RUNNING").length
  const errors  = apps.filter((a) => a.status === "ERROR").length

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-base font-semibold text-zinc-900">Admin</h1>
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-xs rounded font-mono">admin only</span>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-10 pb-6 border-b border-zinc-100 mb-6">
        <div>
          <div className="text-2xl font-semibold tabular-nums text-zinc-900">{apps.length}</div>
          <div className="text-xs text-zinc-400 mt-0.5">total services</div>
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums text-zinc-900">{MOCK_USERS.length}</div>
          <div className="text-xs text-zinc-400 mt-0.5">users</div>
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums text-zinc-900">{running}</div>
          <div className="text-xs text-zinc-400 mt-0.5">running</div>
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums text-red-500">{errors}</div>
          <div className="text-xs text-zinc-400 mt-0.5">errors</div>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1">
          {(["services", "users"] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(""); setPage(1) }}
              className={`px-4 py-2 text-xs font-medium capitalize rounded transition-colors ${
                tab === t ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder={`Search ${tab}...`}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white"
          />
        </div>
      </div>

      {/* Services table */}
      {tab === "services" && (
        isLoading ? (
          <div className="border border-zinc-200 rounded-lg px-4 py-12 text-center text-sm text-zinc-400">Loading...</div>
        ) : (
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
              <div className="col-span-3">Service</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Owner</div>
              <div className="col-span-3">Repository</div>
              <div className="col-span-1" />
            </div>
            {apps.map((app, i) => {
              const status = app.status?.toUpperCase() || "IDLE"
              return (
                <div key={app.id} className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${i < apps.length - 1 ? "border-b border-zinc-100" : ""}`}>
                  <div className="col-span-3">
                    <span className="text-sm font-mono font-medium text-zinc-900">{app.name}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-zinc-300"}`} />
                    <span className={`text-xs font-mono ${STATUS_TEXT[status] ?? "text-zinc-400"}`}>{status.toLowerCase()}</span>
                  </div>
                  <div className="col-span-3 text-xs text-zinc-500 truncate">{app.user?.email || "—"}</div>
                  <div className="col-span-3 text-xs text-zinc-400 font-mono truncate">
                    {app.repoUrl?.replace("https://github.com/", "") || "—"}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <button className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteApp.mutate(app.id)}
                      className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
            {apps.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">No services found</div>
            )}
          </div>
        )
      )}

      {/* Users table */}
      {tab === "users" && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
            <div className="col-span-5">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Services</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-1" />
          </div>
          {MOCK_USERS.filter((u) => u.email.includes(search)).map((user, i) => (
            <div key={user.id} className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${i < MOCK_USERS.length - 1 ? "border-b border-zinc-100" : ""}`}>
              <div className="col-span-5 flex items-center gap-2">
                <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-zinc-500">{user.email[0].toUpperCase()}</span>
                </div>
                <span className="text-sm text-zinc-700 truncate">{user.email}</span>
              </div>
              <div className="col-span-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${user.role === "ADMIN" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                  {user.role.toLowerCase()}
                </span>
              </div>
              <div className="col-span-2 text-xs text-zinc-500 tabular-nums">{user.apps}</div>
              <div className="col-span-2 text-xs text-zinc-400">{user.createdAt}</div>
              <div className="col-span-1 flex justify-end">
                <button className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
