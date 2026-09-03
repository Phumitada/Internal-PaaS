import { useState } from "react"
import { Link } from "react-router-dom"
import { Github, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function Login() {
  const { login, isLoginLoading } = useAuth()
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email) e.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email"
    if (!form.password) e.password = "Password is required"
    else if (form.password.length < 6) e.password = "At least 6 characters"
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    login(form)
  }

  // Demo-only: simulate GitHub OAuth flow (no real backend)
  const handleGithub = () => {
    login({ email: "demo@github.com", password: "github-oauth" })
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 bg-zinc-900 rounded flex items-center justify-center">
            <span className="text-white text-sm font-bold font-mono">P</span>
          </div>
          <span className="text-base font-semibold font-mono text-zinc-900">Internal PaaS</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-8">
          <h1 className="text-lg font-semibold text-zinc-900 mb-1">Sign in</h1>
          <p className="text-sm text-zinc-500 mb-6">Welcome back to your dashboard.</p>

          {/* GitHub (demo state) */}
          <button
            type="button"
            onClick={handleGithub}
            disabled={isLoginLoading}
            className="w-full flex items-center justify-center gap-2.5 border border-zinc-200 rounded py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-60 mb-5"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-zinc-100" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="flex-1 border-t border-zinc-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:border-zinc-400 transition-colors ${
                  errors.email ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white"
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  className={`w-full pl-3 pr-9 py-2 text-sm border rounded focus:outline-none focus:border-zinc-400 transition-colors ${
                    errors.password ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full py-2 bg-zinc-900 text-white text-sm font-medium rounded hover:bg-zinc-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoginLoading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {isLoginLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-4">
          No account?{" "}
          <Link to="/register" className="text-zinc-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
