import { Link } from "react-router-dom"
import { Plus, RefreshCw, ExternalLink } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useGetApps } from "@/hooks/useApp"
import { useAppStatus } from "@/hooks/useAppStatus"

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

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading, refetch } = useGetApps({ userId: user?.userId || "" })

  const apps: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : []

  const appIds = apps.map(app => app.id)
  const getAppStatus = useAppStatus(appIds)

  // Merge socket status with API data
  const appsWithStatus = apps.map((app) => ({
    ...app,
    status: getAppStatus(app.id) || app.status
  }))

  const running  = appsWithStatus.filter((a) => a.status === "RUNNING").length
  const building = appsWithStatus.filter((a) => a.status === "BUILDING").length
  const stopped  = appsWithStatus.filter((a) => ["STOPPED", "IDLE", "ERROR"].includes(a.status)).length

  return (
    <div className="px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">
            Good to see you, {user?.email?.split("@")[0]}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Here's what's running.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/services/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded hover:bg-zinc-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New service
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8 pb-6 border-b border-zinc-100">
        <div>
          <div className="text-3xl font-semibold tabular-nums text-zinc-900">{apps.length}</div>
          <div className="text-xs text-zinc-400 mt-0.5">services</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium tabular-nums text-zinc-700">{running}</span>
          <span className="text-xs text-zinc-400">running</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-sm font-medium tabular-nums text-zinc-700">{building}</span>
          <span className="text-xs text-zinc-400">building</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-300" />
          <span className="text-sm font-medium tabular-nums text-zinc-700">{stopped}</span>
          <span className="text-xs text-zinc-400">stopped</span>
        </div>
      </div>

      {/* Services */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Services</h2>
          <Link to="/services" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="border border-zinc-200 rounded-lg px-4 py-8 text-center text-sm text-zinc-400">
            Loading...
          </div>
        ) : apps.length === 0 ? (
          <div className="border border-dashed border-zinc-200 rounded-lg px-4 py-12 text-center">
            <p className="text-sm text-zinc-500 mb-3">No services yet</p>
            <Link
              to="/services/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 text-xs text-zinc-600 rounded hover:bg-zinc-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create your first service
            </Link>
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            {appsWithStatus.map((app, i) => {
              const status = app.status?.toUpperCase() || "IDLE"
              return (
                <Link
                  key={app.id}
                  to={`/services/${app.id}`}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors group ${
                    i < appsWithStatus.length - 1 ? "border-b border-zinc-100" : ""
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? "bg-zinc-300"}`} />
                  <span className="flex-1 text-sm font-medium text-zinc-900 font-mono">{app.name}</span>
                  {app.repoUrl && (
                    <span className="text-xs text-zinc-400 font-mono hidden md:block truncate max-w-[200px]">
                      {app.repoUrl.replace("https://github.com/", "")}
                    </span>
                  )}
                  <span className={`text-xs font-mono ${STATUS_TEXT[status] ?? "text-zinc-400"}`}>
                    {status.toLowerCase()}
                  </span>
                  {app.port && (
                    <span className="text-xs text-zinc-400 font-mono">:{app.port}</span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
