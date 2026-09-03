import { useState } from "react"
import { Button, Input, Divider } from "@/components/ui"
import { useAuth } from "@/hooks/useAuth"

type SettingsTab = "profile" | "security" | "notifications"

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>("profile")
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-3xl mx-auto">
      <h1 className="text-base font-semibold text-zinc-900 mb-8">Settings</h1>

      <div className="flex gap-10">
        {/* Sidebar */}
        <nav className="w-36 flex-shrink-0 space-y-0.5">
          {(["profile", "security", "notifications"] as SettingsTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`w-full text-left px-3 py-2 text-xs rounded capitalize transition-colors ${
                tab === t
                  ? "bg-zinc-100 text-zinc-900 font-medium"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 mb-4">Profile</h2>
                <div className="space-y-4 max-w-sm">
                  <Input
                    label="Name"
                    defaultValue={user?.email?.split("@")[0] || ""}
                  />
                  <Input
                    label="Email"
                    type="email"
                    defaultValue={user?.email || ""}
                  />
                  <div>
                    <div className="text-xs font-medium text-zinc-700 mb-1.5">Role</div>
                    <div className="text-xs font-mono px-2 py-1 bg-zinc-100 rounded inline-block text-zinc-600">
                      {user?.role?.toLowerCase() || "user"}
                    </div>
                  </div>
                  <Button size="sm">Save changes</Button>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-4">
                  Danger zone
                </h3>
                <div className="border border-red-200 rounded-lg p-4 flex items-start justify-between gap-4 max-w-sm">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">Sign out everywhere</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Sign out of all active sessions immediately.
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => logout()}>
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 mb-4">Change password</h2>
                <div className="space-y-4 max-w-sm">
                  <Input label="Current password" type="password" placeholder="••••••••" />
                  <Input label="New password" type="password" placeholder="••••••••" />
                  <Input label="Confirm new password" type="password" placeholder="••••••••" />
                  <Button size="sm">Update password</Button>
                </div>
              </div>

              <Divider />

              <div>
                <h2 className="text-sm font-semibold text-zinc-900 mb-1">Active sessions</h2>
                <p className="text-xs text-zinc-500 mb-4">
                  Devices currently signed in to your account.
                </p>
                <div className="border border-zinc-200 rounded-lg overflow-hidden max-w-sm">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-xs font-medium text-zinc-900">Current session</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {user?.email} · active now
                      </div>
                    </div>
                    <span className="text-xs text-emerald-600 font-mono">active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 mb-4">Notifications</h2>
              <div className="border border-zinc-200 rounded-lg overflow-hidden max-w-sm">
                {[
                  { label: "Deploy success", desc: "When a service deploys successfully" },
                  { label: "Deploy failed",  desc: "When a build or deploy fails" },
                  { label: "Service down",   desc: "When a health check fails" },
                  { label: "Usage alerts",   desc: "When resource usage is high" },
                ].map((item, i, arr) => (
                  <label
                    key={item.label}
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
                      i < arr.length - 1 ? "border-b border-zinc-100" : ""
                    }`}
                  >
                    <div>
                      <div className="text-sm text-zinc-900">{item.label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{item.desc}</div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-zinc-900" />
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <Button size="sm">Save preferences</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
      </div>
  )
}