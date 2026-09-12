import { useState } from "react"
import { Plus, Database, Trash2, Link as LinkIcon, Unlink } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useGetDatabases, useCreateDatabase, useDeleteDatabase, useConnectDatabase, useDisconnectDatabase } from "@/hooks/useDatabase"
import { useGetApps } from "@/hooks/useApp"
import { useDatabaseStatus } from "@/hooks/useDatabaseStatus"

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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
