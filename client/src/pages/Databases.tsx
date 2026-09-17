import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Database, Trash2, Link as LinkIcon, Unlink, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useGetDatabases, useCreateDatabase, useDeleteDatabase, useConnectDatabase, useDisconnectDatabase, useDatabaseCredentials } from "@/hooks/useDatabase"
import { useGetApps } from "@/hooks/useApp"
import { useDatabaseStatus } from "@/hooks/useDatabaseStatus"
import { useSocket } from "@/hooks/useSocket"

// Ordered so the LAST matching stage in the log so far is the current one.
// The "Waiting for ArgoCD" stage is open-ended (no fixed duration — it's
// bounded by the ApplicationSet's own ~3min re-list interval, not
// anything this app controls), so it gets an indeterminate bar instead of
// a fake percentage.
const PROVISIONING_STAGES: { match: RegExp; label: string }[] = [
  { match: /Cloned GitOps repository|Updated local GitOps clone/, label: "Cloning GitOps repository" },
  { match: /Wrote manifest/, label: "Writing manifest" },
  { match: /Pushed GitOps commit|No changes to sync/, label: "Pushed to Git" },
  { match: /Waiting for ArgoCD/, label: "Waiting for ArgoCD to sync (usually a few minutes)" },
  { match: /Timed out waiting/, label: "Still waiting — taking longer than usual" },
  { match: /Credentials secret found/, label: "Ready" },
]

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

// Reuses the same log stream the build/deploy pipeline uses — database.id
// is passed as the gitops job's deployId (see database.service.ts), so
// `join`-ing it here works exactly the same way. Only shown while PENDING;
// once the controller finishes provisioning, database:status flips this
// away via getDbStatus.
function ProvisioningLog({ databaseId }: { databaseId: string }) {
  const { logs } = useSocket(databaseId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showRawLog, setShowRawLog] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (showRawLog) bottomRef.current?.scrollIntoView({ block: "end" })
  }, [logs.length, showRawLog])

  let stageIndex = -1
  for (let i = PROVISIONING_STAGES.length - 1; i >= 0 && stageIndex === -1; i--) {
    if (logs.some((line) => PROVISIONING_STAGES[i].match.test(line))) stageIndex = i
  }
  const stage = PROVISIONING_STAGES[stageIndex]

  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-zinc-500 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          {stage ? stage.label : "Starting..."}
        </span>
        <span className="text-zinc-400 font-mono">{formatElapsed(elapsed)}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-zinc-900 rounded-full animate-indeterminate" />
      </div>
      <button
        onClick={() => setShowRawLog((s) => !s)}
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-1.5"
      >
        {showRawLog ? "Hide" : "Show"} log details
      </button>
      {showRawLog && (
        <div className="bg-zinc-900 rounded p-3 max-h-40 overflow-y-auto font-mono text-xs space-y-0.5 mt-1.5">
          {logs.length === 0 ? (
            <div className="text-zinc-500">Waiting for logs...</div>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="text-zinc-300 break-all">{line}</div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

// URL and PASSWORD/SECRET values are sensitive (the URL embeds the
// password too, e.g. postgresql://user:PASSWORD@host/db) — masked
// individually, default hidden. Other fields (username, db name, port)
// aren't secrets on their own, so they're shown directly once the panel
// is revealed.
const SENSITIVE_KEY = /URL|PASSWORD|SECRET/i

function CredentialField({ label, value }: { label: string; value: string }) {
  const [shown, setShown] = useState(false)
  const sensitive = SENSITIVE_KEY.test(label)

  return (
    <div className="flex items-start gap-2">
      <span className="text-zinc-500 shrink-0">{label}=</span>
      <span className="break-all flex-1 text-zinc-300">
        {sensitive && !shown ? "•".repeat(Math.min(value.length, 32)) : value}
      </span>
      {sensitive && (
        <button
          onClick={() => setShown((s) => !s)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        >
          {shown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      )}
    </div>
  )
}

function DatabaseCredentials({ databaseId, liveStatus, connectedApps }: { databaseId: string; liveStatus?: string; connectedApps: { id: string; name: string }[] }) {
  const [revealed, setRevealed] = useState(false)
  const { data, isLoading, refetch } = useDatabaseCredentials(databaseId, revealed)

  // The gitops worker emits database:status -> RUNNING once the Secret is
  // actually confirmed to exist (see useDatabaseStatus, same socket event
  // the list's status dot already uses). Re-fetch when that happens instead
  // of making the user refresh manually.
  useEffect(() => {
    if (revealed && liveStatus === "RUNNING" && data?.ready === false) {
      refetch()
    }
  }, [liveStatus, revealed, data?.ready, refetch])

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors mt-2"
      >
        <Eye className="w-3.5 h-3.5" /> Show credentials
      </button>
    )
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setRevealed(false)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors mb-2"
      >
        <EyeOff className="w-3.5 h-3.5" /> Hide credentials
      </button>
      {isLoading ? (
        <div className="text-xs text-zinc-400">Loading...</div>
      ) : data?.ready ? (
        <>
          <div className="bg-zinc-900 rounded p-3 space-y-1.5 font-mono text-xs">
            {Object.entries(data.data ?? {}).map(([key, value]) => (
              <CredentialField key={key} label={key} value={value} />
            ))}
          </div>
          <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            Creating this database doesn't update any app automatically — copy the values above into your
            app's own environment variables, replacing any placeholder, before it'll actually connect.
            {connectedApps.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {connectedApps.map((app) => (
                  <Link
                    key={app.id}
                    to={`/services/${app.id}?tab=variables`}
                    className="underline hover:text-yellow-900"
                  >
                    Update {app.name}'s variables →
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-xs text-yellow-600 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Not ready yet — still provisioning, this updates automatically
        </div>
      )}
    </div>
  )
}

const STATUS_DOT: Record<string, string> = {
  RUNNING:  "bg-emerald-500",
  PENDING: "bg-yellow-400 animate-pulse",
  ERROR:    "bg-red-500",
}

const STATUS_TEXT: Record<string, string> = {
  RUNNING:  "text-emerald-600",
  PENDING: "text-yellow-600",
  ERROR:    "text-red-500",
}

const ENGINE_ICON: Record<string, string> = {
  POSTGRES: "",
  REDIS:    "",
}

export default function Databases() {
  const { user } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [newDb, setNewDb] = useState({ name: "", engine: "POSTGRES", storage: "1Gi" })
  const [selectedDb, setSelectedDb] = useState<string | null>(null)
  
  const createDatabase = useCreateDatabase()
  const deleteDatabase = useDeleteDatabase()
  const connectDatabase = useConnectDatabase()
  const disconnectDatabase = useDisconnectDatabase()
  
  const { data: databases, isLoading } = useGetDatabases(user?.userId ? { userId: user.userId } : undefined)
  const { data: apps } = useGetApps(user?.userId ? { userId: user.userId } : undefined)

  const dbList = Array.isArray(databases?.data?.data) ? databases.data.data : Array.isArray(databases?.data) ? databases.data : []
  const appList = Array.isArray(apps) ? apps : Array.isArray(apps?.data) ? apps.data : []

  const dbIds = dbList.map((db: any) => db.id)
  const getDbStatus = useDatabaseStatus(dbIds)

  // Merge socket status with API data
  const dbListWithStatus = dbList.map((db: any) => ({
    ...db,
    status: getDbStatus(db.id) || db.status
  }))

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDb.name) return
    createDatabase.mutate(newDb, {
      onSuccess: () => {
        setNewDb({ name: "", engine: "POSTGRES", storage: "1Gi" })
        setShowCreate(false)
      }
    })
  }

  const handleConnect = (databaseId: string, appId: string) => {
    connectDatabase.mutate({ databaseId, appId })
  }

  const handleDisconnect = (databaseId: string, appId: string) => {
    disconnectDatabase.mutate({ databaseId, appId })
  }

  return (
    <div className="px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">Databases</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Manage your databases</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded hover:bg-zinc-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New database
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Name</label>
              <input
                type="text"
                value={newDb.name}
                onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
                placeholder="my-database"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Engine</label>
              <select
                value={newDb.engine}
                onChange={(e) => setNewDb({ ...newDb, engine: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white"
              >
                <option value="POSTGRES">PostgreSQL</option>
                <option value="REDIS">Redis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Storage</label>
              <select
                value={newDb.storage}
                onChange={(e) => setNewDb({ ...newDb, storage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white"
              >
                <option value="1Gi">1 GB</option>
                <option value="2Gi">2 GB</option>
                <option value="5Gi">5 GB</option>
                <option value="10Gi">10 GB</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createDatabase.isPending}
                className="px-4 py-2 bg-zinc-900 text-white text-xs font-medium rounded hover:bg-zinc-700 transition-colors disabled:opacity-60"
              >
                {createDatabase.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-zinc-200 text-zinc-600 text-xs font-medium rounded hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Databases list */}
      {isLoading ? (
        <div className="border border-zinc-200 rounded-lg px-4 py-8 text-center text-sm text-zinc-400">
          Loading...
        </div>
      ) : dbListWithStatus.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-lg px-4 py-12 text-center">
          <Database className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-3">No databases yet</p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          {dbListWithStatus.map((db: any, i: number) => (
            <div key={db.id}>
              <div
                className={`flex items-center gap-4 px-4 py-3 ${i < dbListWithStatus.length - 1 ? "border-b border-zinc-100" : ""}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{db.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[db.status] ?? "bg-zinc-300"}`} />
                    <span className={`text-xs font-mono ${STATUS_TEXT[db.status] ?? "text-zinc-400"}`}>
                      {db.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {db.engine} • {db.storage}
                  </div>
                  {db.status === "PENDING" && <ProvisioningLog databaseId={db.id} />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDb(selectedDb === db.id ? null : db.id)}
                    className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteDatabase.mutate(db.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Connected apps */}
              {selectedDb === db.id && (
                <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                  <div className="text-xs font-medium text-zinc-500 mb-2">Connected Apps</div>
                  {db.apps && db.apps.length > 0 ? (
                    <div className="space-y-1">
                      {db.apps.map((app: any) => (
                        <div key={app.id} className="flex items-center justify-between py-1">
                          <span className="text-xs text-zinc-600">{app.name}</span>
                          <button
                            onClick={() => handleDisconnect(db.id, app.id)}
                            className="p-1 rounded hover:bg-red-100 text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Unlink className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 mb-2">No apps connected</div>
                  )}
                  
                  {/* Connect app */}
                  <div className="flex gap-2 mt-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleConnect(db.id, e.target.value)
                          e.target.value = ""
                        }
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 bg-white"
                      defaultValue=""
                    >
                      <option value="">Connect app...</option>
                      {appList
                        .filter((app: any) => !db.apps?.some((a: any) => a.id === app.id))
                        .map((app: any) => (
                          <option key={app.id} value={app.id}>{app.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Credentials */}
                  <div className="mt-3 pt-3 border-t border-zinc-200">
                    <div className="text-xs font-medium text-zinc-500 mb-1">Connection credentials</div>
                    <DatabaseCredentials databaseId={db.id} liveStatus={getDbStatus(db.id)} connectedApps={db.apps ?? []} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
