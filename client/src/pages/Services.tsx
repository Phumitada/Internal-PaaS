import { useState,useRef,useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import {
  Plus, Search, ArrowLeft, GitBranch, MoreHorizontal,
  Play, Square, Trash2, Settings, ExternalLink, Terminal, RefreshCw,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import {
  useGetApps, useGetAppById, useCreateApp, useDeleteApp, useUpdateApp, useUpdateAppEnv,
} from "@/hooks/useApp"
import { api } from "@/api/client"
import { toast } from "sonner"
import { useGetDeploys, useRedeploy } from "@/hooks/useDeploy"
import { Pagination } from "@/components/ui"
import { useSocket } from "@/hooks/useSocket"
import { useQuery } from "@tanstack/react-query"
import { deployService } from "@/api/services/deploy.service"

// ─── Shared ───────────────────────────────────────────────────────────────────

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

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "IDLE"
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[s] ?? "bg-zinc-300"}`} />
      <span className={`text-xs font-mono ${STATUS_TEXT[s] ?? "text-zinc-400"}`}>{s.toLowerCase()}</span>
    </span>
  )
}

function AppMenu({ appId, status, onDelete }: { appId: string; status: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const updateApp = useUpdateApp()

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault()
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* fixed แทน absolute — ไม่ตกขอบแน่นอน */}
          <div
            className="fixed w-36 bg-white border border-zinc-200 rounded-lg shadow-sm z-50 py-1"
            style={{ top: pos.top, right: pos.right }}
          >
            {status === "STOPPED" || status === "IDLE" ? (
              <button
                onClick={() => { updateApp.mutate({ id: appId, data: { status: "RUNNING" } }); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Start
              </button>
            ) : (
              <button
                onClick={() => { updateApp.mutate({ id: appId, data: { status: "STOPPED" } }); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <Square className="w-3.5 h-3.5" /> Stop
              </button>
            )}
            <Link
              to={`/services/${appId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </Link>
            <div className="my-1 border-t border-zinc-100" />
            <button
              onClick={() => { onDelete(); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Services list ────────────────────────────────────────────────────────────

export function ServicesList() {
  const { user } = useAuth()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const deleteApp = useDeleteApp()

  const { data, isLoading, isFetching } = useGetApps({
    userId: user?.userId || "",
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter.toUpperCase(),
    page,
    limit: 15,
  })

  const apps: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.apps) 
    ? data.apps
    : []

  const STATUSES = ["all", "running", "building", "stopped", "error","idle"]

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-zinc-900">Services</h1>
          {isFetching && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
        </div>
        
        <Link
          to="/services/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded hover:bg-zinc-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New service
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white"
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1.5 text-xs rounded capitalize transition-colors ${
                statusFilter === s
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="border border-zinc-200 rounded-lg px-4 py-12 text-center text-sm text-zinc-400">
          Loading...
        </div>
      ) : apps.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-lg py-16 text-center">
          <p className="text-sm text-zinc-500 mb-3">
            {search || statusFilter !== "all" ? "No services match your filter." : "No services yet."}
          </p>
          {!search && statusFilter === "all" && (
            <Link
              to="/services/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 text-xs text-zinc-600 rounded hover:bg-zinc-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create your first service
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-4">Repository</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1" />
          </div>

          {apps.map((app, i) => (
            <div
              key={app.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                i < apps.length - 1 ? "border-b border-zinc-100" : ""
              }`}
            >
              <div className="col-span-3 min-w-0">
                <Link
                  to={`/services/${app.id}`}
                  className="text-sm font-medium font-mono text-zinc-900 hover:underline truncate block"
                >
                  {app.name}
                </Link>
                {app.port && <span className="text-xs text-zinc-400 font-mono">:{app.port}</span>}
              </div>
              <div className="col-span-2">
                <StatusBadge status={app.status} />
              </div>
              <div className="col-span-4 min-w-0 flex items-center gap-1.5">
                <GitBranch className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                <span className="text-xs text-zinc-400 font-mono truncate">
                  {app.repoUrl?.replace("https://github.com/", "") || "—"}
                </span>
              </div>
              <div className="col-span-2 text-xs text-zinc-400">
                {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : "—"}
              </div>
              <div className="col-span-1 flex justify-end">
                <AppMenu
                  appId={app.id}
                  status={app.status?.toUpperCase()}
                  onDelete={() => deleteApp.mutate(app.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── New service ──────────────────────────────────────────────────────────────

export function NewService() {
  const navigate = useNavigate()
  const createApp = useCreateApp()
  const [form, setForm] = useState({ name: "", repoUrl: "", rootDir: "." })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name) e.name = "Service name is required"
    else if (!/^[a-z0-9-]+$/.test(form.name)) e.name = "Lowercase letters, numbers, and hyphens only"
    if (!form.repoUrl) e.repoUrl = "Repository URL is required"
    else if (!form.repoUrl.includes("github.com")) e.repoUrl = "Must be a GitHub URL"
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    createApp.mutate(
      { name: form.name, repoUrl: form.repoUrl, rootDir: form.rootDir },
      { onSuccess: () => navigate("/services") }
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/services" className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-base font-semibold text-zinc-900">New service</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">Service name</label>
          <input
            type="text"
            placeholder="my-api"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:border-zinc-400 font-mono transition-colors ${
              errors.name ? "border-red-300 bg-red-50" : "border-zinc-200"
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          <p className="mt-1 text-xs text-zinc-400">Lowercase letters, numbers, and hyphens only.</p>
        </div>

        {/* Repo */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">GitHub repository</label>
          <div className="relative">
            <GitBranch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="https://github.com/username/repo.git"
              value={form.repoUrl}
              onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
              className={`w-full pl-8 pr-3 py-2 text-sm border rounded focus:outline-none focus:border-zinc-400 font-mono transition-colors ${
                errors.repoUrl ? "border-red-300 bg-red-50" : "border-zinc-200"
              }`}
            />
          </div>
          {errors.repoUrl && <p className="mt-1 text-xs text-red-500">{errors.repoUrl}</p>}
        </div>

        {/* Root dir */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">Root directory</label>
          <input
            type="text"
            placeholder="."
            value={form.rootDir}
            onChange={(e) => setForm({ ...form, rootDir: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 font-mono"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Set to <code className="font-mono bg-zinc-100 px-1 rounded">server</code> for monorepos with a backend subfolder.
          </p>
        </div>

        <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 text-xs text-zinc-500 leading-relaxed">
          The platform auto-detects your runtime and generates a Dockerfile. Push to{" "}
          <code className="font-mono bg-white border border-zinc-200 px-1 rounded">main</code> to trigger deploys.
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={createApp.isPending}
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded hover:bg-zinc-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {createApp.isPending && (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {createApp.isPending ? "Creating..." : "Create service"}
          </button>
          <Link to="/services" className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

// ─── Service detail ───────────────────────────────────────────────────────────

type Tab = "deployments" | "logs" | "variables" | "settings"
const TABS: Tab[] = ["deployments", "logs", "variables", "settings"]

function DeploymentsTab({ appId }: { appId: string }) {
  const [page, setPage] = useState(1)
  const [expandedDeployId, setExpandedDeployId] = useState<string | null>(null)
  const { data, isLoading } = useGetDeploys(appId, { page, limit: 10, sortOrder: 'desc' })
  const { isConnected, logs } = useSocket(expandedDeployId || "")

  const deploys = Array.isArray(data?.data?.data) ? data.data.data : []
  const totalPages = data?.data?.totalPages ?? 1

  const DEPLOY_DOT: Record<string, string> = {
    SUCCESS:  "bg-emerald-500",
    BUILDING: "bg-yellow-400 animate-pulse",
    FAILED:   "bg-red-500",
    PENDING:  "bg-zinc-300",
  }

  const DEPLOY_TEXT: Record<string, string> = {
    SUCCESS:  "text-emerald-600",
    BUILDING: "text-yellow-600",
    FAILED:   "text-red-500",
    PENDING:  "text-zinc-400",
  }

  if (isLoading) return (
    <div className="text-sm text-zinc-400 py-8 text-center">Loading...</div>
  )

  if (deploys.length === 0) return (
    <div className="border border-zinc-200 rounded-lg py-8 text-center text-sm text-zinc-400">
      No deploys yet
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        {deploys.map((d: any, i: number) => (
          <div key={d.id}>
            <div
              className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-50 ${i < deploys.length - 1 ? "border-b border-zinc-100" : ""}`}
              onClick={() => setExpandedDeployId(expandedDeployId === d.id ? null : d.id)}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DEPLOY_DOT[d.status] ?? "bg-zinc-300"}`} />
              <span className="text-sm font-mono text-zinc-700 flex-shrink-0">
                {d.id.substring(0, 8)}
              </span>
              <span className={`text-xs font-mono flex-1 ${DEPLOY_TEXT[d.status] ?? "text-zinc-400"}`}>
                {d.status.toLowerCase()}
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(d.createdAt).toLocaleString()}
              </span>
              <Terminal className={`w-4 h-4 text-zinc-400 ${expandedDeployId === d.id ? "text-zinc-700" : ""}`} />
            </div>
            {expandedDeployId === d.id && (
              <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-zinc-500"}`} />
                  <span className="text-xs text-zinc-500 font-mono">{isConnected ? "live" : "disconnected"}</span>
                </div>
                <div className="space-y-1 font-mono text-xs max-h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-zinc-600 text-center py-4">
                      {d.status === 'BUILDING' ? "Waiting for logs..." : "No logs available"}
                    </div>
                  ) : (
                    logs.map((log: string, i: number) => (
                      <div key={i} className="text-zinc-400">{log}</div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}

function LogsTab({ appId, currentDeployId }: { appId: string; currentDeployId: string | null }) {
  const [selectedDeployId, setSelectedDeployId] = useState<string | null>(currentDeployId)
  const [viewMode, setViewMode] = useState<'live' | 'historical'>('live')
  const { data: deploys } = useGetDeploys(appId, { page: 1, limit: 20, sortOrder: 'desc' })
  const { data: historicalDeploy } = useQuery({
    queryKey: ['deploy', selectedDeployId],
    queryFn: () => deployService.getDeployById(selectedDeployId!),
    enabled: viewMode === 'historical' && !!selectedDeployId
  })

  const deployList = Array.isArray(deploys?.data?.data) ? deploys.data.data : []
  const historicalLogs = historicalDeploy?.log ? historicalDeploy.log.split('\n') : []
  const isHistoricalBuilding = historicalDeploy?.status === 'BUILDING'

  // Use socket for live mode or if historical deployment is currently building
  const socketDeployId = viewMode === 'live' 
    ? (currentDeployId || "") 
    : (isHistoricalBuilding ? (selectedDeployId || "") : "")
  
  const { isConnected, logs } = useSocket(socketDeployId)

  useEffect(() => {
    if (currentDeployId && viewMode === 'live') {
      setSelectedDeployId(currentDeployId)
    }
  }, [currentDeployId, viewMode])

  // In historical mode, if the deployment is building, show socket logs, otherwise show static logs
  const displayLogs = viewMode === 'live' 
    ? logs 
    : (isHistoricalBuilding ? logs : historicalLogs)

  return (
    <div className="bg-zinc-950 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Terminal className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-500 font-mono">build log</span>
        
        {/* View mode toggle */}
        <div className="ml-4 flex items-center gap-1">
          <button
            onClick={() => setViewMode('live')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'live' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setViewMode('historical')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'historical' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Historical
          </button>
        </div>

        {/* Deployment selector */}
        {viewMode === 'historical' && (
          <select
            value={selectedDeployId || ""}
            onChange={(e) => setSelectedDeployId(e.target.value || null)}
            className="ml-4 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded border border-zinc-700 focus:outline-none focus:border-zinc-500"
          >
            <option value="">Select deployment</option>
            {deployList.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.id.substring(0, 8)} - {new Date(d.createdAt).toLocaleString()} - {d.status}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {(viewMode === 'live' || isHistoricalBuilding) && (
            <>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-zinc-500"}`} />
              <span className="text-xs text-zinc-500 font-mono">{isConnected ? "live" : "disconnected"}</span>
            </>
          )}
        </div>
      </div>
      <div className="p-5 space-y-1.5 font-mono text-xs max-h-96 overflow-y-auto">
        {displayLogs.length === 0 ? (
          <div className="text-zinc-600 text-center py-8">
            {viewMode === 'live' 
              ? (currentDeployId ? "Waiting for logs..." : "Start a deployment to see logs")
              : (selectedDeployId 
                  ? (isHistoricalBuilding ? "Waiting for logs..." : "No logs available for this deployment")
                  : "Select a deployment to view historical logs"
                )
            }
          </div>
        ) : (
          displayLogs.map((log: string, i: number) => (
            <div key={i} className="flex items-start gap-4">
              <span className="text-zinc-600 flex-shrink-0 tabular-nums">{new Date().toLocaleTimeString()}</span>
              <span className="text-zinc-400">{log}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function VariablesTab({ app, onDeployTriggered }: { app: any; onDeployTriggered: (deployId: string) => void }) {
  const updateAppEnv = useUpdateAppEnv()
  const [rows, setRows] = useState<Array<{ key: string; value: string }>>([])
  const [showPasteEnv, setShowPasteEnv] = useState(false)
  const [envText, setEnvText] = useState("")

  useEffect(() => {
    if (app?.envVars) {
      const envVars = typeof app.envVars === 'object' ? app.envVars : {}
      const entries = Object.entries(envVars).map(([key, value]) => ({
        key,
        value: String(value)
      }))
      setRows(entries.length > 0 ? entries : [{ key: "", value: "" }])
    } else {
      setRows([{ key: "", value: "" }])
    }
  }, [app?.envVars])

  const update = (i: number, field: "key" | "value", val: string) => {
    const next = [...rows]
    next[i][field] = val
    if (i === rows.length - 1 && val) next.push({ key: "", value: "" })
    setRows(next)
  }

  const handleParseEnv = () => {
    const parsedRows: Array<{ key: string; value: string }> = []
    const seenKeys = new Set<string>()

    envText.split('\n').forEach(line => {
      const trimmed = line.trim()
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) return
      
      // Find first = only
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) return // Skip lines with no =
      
      const key = trimmed.slice(0, eqIndex).trim()
      if (!key) return // Skip lines with empty key
      
      let value = trimmed.slice(eqIndex + 1).trim()
      
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      // If duplicate key, remove previous occurrence
      if (seenKeys.has(key)) {
        const prevIndex = parsedRows.findIndex(r => r.key === key)
        if (prevIndex !== -1) {
          parsedRows.splice(prevIndex, 1)
        }
      }
      
      seenKeys.add(key)
      parsedRows.push({ key, value })
    })
    
    // Add trailing empty row
    parsedRows.push({ key: "", value: "" })
    
    setRows(parsedRows)
    setShowPasteEnv(false)
    setEnvText("")
  }

  const handleSave = () => {
    const envVars: Record<string, string> = {}
    rows.forEach(({ key, value }) => {
      if (key && value) {
        envVars[key] = value
      }
    })
    updateAppEnv.mutate({ id: app.id, envVars }, {
      onSuccess: (data: any) => {
        if (data?.deployId) {
          onDeployTriggered(data.deployId)
        }
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">Variables are injected at runtime. Changes take effect on the next deploy.</p>
      
      {/* Paste .env button */}
      <button
        onClick={() => setShowPasteEnv(!showPasteEnv)}
        className="px-3 py-1.5 text-xs bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors"
      >
        {showPasteEnv ? "Cancel" : "Paste .env"}
      </button>

      {/* Textarea for pasting .env content */}
      {showPasteEnv && (
        <div className="space-y-2">
          <textarea
            value={envText}
            onChange={(e) => setEnvText(e.target.value)}
            placeholder="DATABASE_URL=postgresql://user:pass@localhost:5432/db&#10;PORT=3000&#10;NODE_ENV=production"
            className="w-full px-3 py-2 text-xs font-mono border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 bg-white"
            rows={8}
          />
          <button
            onClick={handleParseEnv}
            className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
          >
            Parse
          </button>
        </div>
      )}

      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 border-b border-zinc-200 bg-zinc-50">
          <div className="px-3 py-2 text-xs font-medium text-zinc-500 border-r border-zinc-200">KEY</div>
          <div className="px-3 py-2 text-xs font-medium text-zinc-500">VALUE</div>
        </div>
        {rows.map((row, i) => (
          <div key={i} className={`grid grid-cols-2 ${i < rows.length - 1 ? "border-b border-zinc-100" : ""}`}>
            <input
              className="px-3 py-2 text-xs font-mono border-r border-zinc-100 focus:outline-none focus:bg-zinc-50 bg-white"
              placeholder="VARIABLE_NAME"
              value={row.key}
              onChange={(e) => update(i, "key", e.target.value)}
            />
            <div className="flex">
              <input
                className="flex-1 px-3 py-2 text-xs font-mono focus:outline-none focus:bg-zinc-50 bg-white"
                placeholder="value"
                value={row.value}
                onChange={(e) => update(i, "value", e.target.value)}
              />
              {rows.length > 1 && (
                <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="px-2 text-zinc-300 hover:text-red-400 transition-colors">×</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateAppEnv.isPending}
          className="px-3 py-1.5 bg-zinc-900 text-white text-xs rounded hover:bg-zinc-700 transition-colors disabled:opacity-60"
        >
          {updateAppEnv.isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  )
}

function SettingsTab({ app }: { app: any }) {
  const navigate = useNavigate()
  const updateApp = useUpdateApp()
  const deleteApp = useDeleteApp()
  const [name, setName] = useState(app.name)
  const [rootDir, setRootDir] = useState(app.rootDir || ".")
  const [domain, setDomain] = useState(app.domain || "")

  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">General</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Service name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Root directory</label>
            <input
              value={rootDir}
              onChange={(e) => setRootDir(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Domain</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="app.example.com"
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 font-mono"
            />
          </div>
          <button
            onClick={() => updateApp.mutate({ id: app.id, data: { name, rootDir, domain } })}
            disabled={updateApp.isPending}
            className="px-3 py-1.5 bg-zinc-900 text-white text-xs rounded hover:bg-zinc-700 transition-colors disabled:opacity-60"
          >
            {updateApp.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-4">Danger zone</h3>
        <div className="border border-red-200 rounded-lg p-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-zinc-900">Delete service</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {app.status === "STOPPED"
                ? "Removes all data. Cannot be undone."
                : "The service must be stopped before it can be deleted."}
            </div>
          </div>
          {app.status === "STOPPED" ? (
            <button
              onClick={() => deleteApp.mutate(app.id, { onSuccess: () => navigate("/services") })}
              disabled={deleteApp.isPending}
              className="flex-shrink-0 px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {deleteApp.isPending ? "Deleting..." : "Delete"}
            </button>
          ) : (
            <button
              onClick={() => updateApp.mutate({ id: app.id, data: { status: "STOPPED" } })}
              disabled={updateApp.isPending}
              className="flex-shrink-0 px-3 py-1.5 border border-zinc-300 text-zinc-700 text-xs rounded hover:bg-zinc-50 transition-colors disabled:opacity-60"
            >
              {updateApp.isPending ? "Stopping..." : "Stop service"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>("deployments")
  const [deployId, setDeployId] = useState<string | null>(null)
  const [waitingForBuild, setWaitingForBuild] = useState(false)
  const redeploy = useRedeploy()
  const { data: app, isLoading } = useGetAppById(id || "", {
    refetchInterval: deployId ? 2000 : false,
  })

  const isDeploying = !!deployId

  const handleDeployTriggered = (newDeployId: string) => {
    console.log("[Deploy triggered] deployId:", newDeployId)
    setDeployId(newDeployId)
  }

  const handleRedeploy = () => {
    if (!app?.id) return
    redeploy.mutate(app.id, {
      onSuccess: (data) => {
        console.log("[Redeploy] triggered, deployId:", data?.deployId)
        handleDeployTriggered(data?.deployId || "pending")
      },
      onError: () => {
        console.log("[Redeploy] failed")
      }
    })
  }

  useEffect(() => {
    if (deployId) {
      console.log("[Poll] status:", app?.status, "deployId:", deployId)
    }

    if (deployId && app?.status === "BUILDING") {
      setWaitingForBuild(true)
    }

    if (deployId && waitingForBuild && app?.status !== "BUILDING") {
      console.log("[Poll] done, status:", app?.status)
      setDeployId(null)
      setWaitingForBuild(false)
      if (app?.status === "RUNNING") toast.success("Deploy complete!")
      if (app?.status === "ERROR") toast.error("Deploy failed!")
    }
  }, [app?.status, deployId, waitingForBuild])

  if (isLoading) {
    return (
      <div className="px-6 py-16 text-center text-sm text-zinc-400">Loading...</div>
    )
  }

  if (!app) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-zinc-500 mb-3">Service not found</p>
        <Link to="/services" className="text-xs text-zinc-400 hover:underline">← Back to services</Link>
      </div>
    )
  }

  const status = app.status?.toUpperCase() || "IDLE"

  return (
    <div>
      {/* Service header */}
      <div className="border-b border-zinc-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <Link to="/services" className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status] ?? "bg-zinc-300"}`} />
          <span className="text-sm font-semibold font-mono text-zinc-900">{app.name}</span>
          <span className={`text-xs font-mono ${STATUS_TEXT[status] ?? "text-zinc-400"}`}>
            {isDeploying ? "building" : status.toLowerCase()}
          </span>
          {app.port && !isDeploying && (
            <span className="text-xs text-zinc-400 font-mono">:{app.port}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleRedeploy}
              disabled={isDeploying || redeploy.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 text-xs text-zinc-600 rounded hover:bg-zinc-50 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDeploying ? "animate-spin" : ""}`} />
              {isDeploying ? "Deploying..." : redeploy.isPending ? "Triggering..." : "Redeploy"}
            </button>
            {app.domain && (
              <a
                href={`https://${app.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        {app.repoUrl && (
          <div className="flex items-center gap-1.5 ml-9">
            <GitBranch className="w-3 h-3 text-zinc-400" />
            <span className="text-xs text-zinc-400 font-mono">
              {app.repoUrl.replace("https://github.com/", "")}
            </span>
            {app.rootDir && app.rootDir !== "." && (
              <>
                <span className="text-zinc-300 mx-1">·</span>
                <span className="text-xs text-zinc-400 font-mono">root: {app.rootDir}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 px-6">
        <div className="flex items-center">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors ${
                tab === t ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {tab === "deployments" && <DeploymentsTab appId={app.id} />}
        {tab === "logs"        && <LogsTab appId={app.id} currentDeployId={deployId} />}
        {tab === "variables"   && <VariablesTab app={app} onDeployTriggered={handleDeployTriggered} />}
        {tab === "settings"    && <SettingsTab app={app} />}
      </div>
    </div>
  )
}