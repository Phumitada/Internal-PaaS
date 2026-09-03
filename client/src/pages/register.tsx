import { useState } from "react"
import { Link } from "react-router-dom"
import { Github, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export default function Register() {
  const { register, isRegisterLoading } = useAuth()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name || form.name.length < 2) e.name = "At least 2 characters"
    if (!form.email) e.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email"
    if (!form.password || form.password.length < 6) e.password = "At least 6 characters"
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    register(form)
  }

  // Demo-only
  const handleGithub = () => {
    register({ name: "GitHub User", email: "demo@github.com", password: "github-oauth" })
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
          <h1 className="text-lg font-semibold text-zinc-900 mb-1">Create an account</h1>
          <p className="text-sm text-zinc-500 mb-6">Start deploying in minutes.</p>

          {/* GitHub (demo state) */}
          <button
            type="button"
            onClick={handleGithub}
            disabled={isRegisterLoading}
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
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Name</label>
              <input
                type="text"
                placeholder="Ham"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
                className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:border-zinc-400 transition-colors ${
                  errors.name ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white"
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

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
                  autoComplete="new-password"
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
              disabled={isRegisterLoading}
              className="w-full py-2 bg-zinc-900 text-white text-sm font-medium rounded hover:bg-zinc-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isRegisterLoading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {isRegisterLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-zinc-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
