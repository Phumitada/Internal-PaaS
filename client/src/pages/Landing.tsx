import { Link } from "react-router-dom"
import { Terminal, GitBranch, Zap, Shield } from "lucide-react"

const FEATURES = [
  {
    icon: GitBranch,
    title: "Push to deploy",
    desc: "Connect a GitHub repo. Every push to main triggers a build and deploy automatically.",
  },
  {
    icon: Terminal,
    title: "Auto-detected runtime",
    desc: "Node.js, Python, Java — the platform reads your repo and generates a Dockerfile for you.",
  },
  {
    icon: Zap,
    title: "Live build logs",
    desc: "Watch each step of the pipeline in real time: clone, detect, build, run.",
  },
  {
    icon: Shield,
    title: "Isolated containers",
    desc: "Every service runs in its own Docker container with resource limits and health checks.",
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      {/* Nav */}
      <header className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold font-mono">P</span>
          </div>
          <span className="text-sm font-semibold font-mono">Internal PaaS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-3 py-1.5 bg-zinc-900 text-white text-sm rounded hover:bg-zinc-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 border border-zinc-200 rounded-full px-3 py-1 text-xs text-zinc-500 mb-8 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            self-hosted · open source
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6">
            Deploy your apps.<br />
            <span className="text-zinc-400">No DevOps degree required.</span>
          </h1>
          <p className="text-lg text-zinc-500 mb-10 leading-relaxed max-w-lg">
            Push code to GitHub. The platform detects your runtime, builds a container, and serves it — in under two minutes.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/register"
              className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded hover:bg-zinc-700 transition-colors"
            >
              Start deploying
            </Link>
            <Link
              to="/tutorial"
              className="px-5 py-2.5 border border-zinc-200 text-sm text-zinc-600 rounded hover:bg-zinc-50 transition-colors"
            >
              See how it works →
            </Link>
          </div>
        </div>

        {/* Terminal preview */}
        <div className="mt-16 border border-zinc-200 rounded-lg overflow-hidden max-w-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-3 text-xs text-zinc-500 font-mono">build log</span>
          </div>
          <div className="bg-zinc-950 p-5 font-mono text-xs space-y-1.5">
            {[
              ["zinc-500", "10:31:00", "Cloning github.com/ham/my-api.git..."],
              ["zinc-500", "10:31:04", "Detected runtime: Node.js 20"],
              ["zinc-500", "10:31:05", "Generating Dockerfile..."],
              ["zinc-500", "10:31:06", "Building image paas-my-api:latest"],
              ["zinc-500", "10:31:58", "npm install  ✓  247 packages"],
              ["zinc-500", "10:32:01", "tsc  ✓  compiled in 3.2s"],
              ["emerald-400", "10:32:04", "Container started on :3000"],
              ["emerald-400", "10:32:06", "Health check passed — my-api is live"],
            ].map(([color, time, msg], i) => (
              <div key={i} className="flex gap-3">
                <span className="text-zinc-600 flex-shrink-0">{time}</span>
                <span className={`text-${color}`}>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-100 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-8 h-8 border border-zinc-200 rounded flex items-center justify-center flex-shrink-0 bg-white">
                  <Icon className="w-4 h-4 text-zinc-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-mono">Internal PaaS — self-hosted</span>
          <Link to="/tutorial" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            Documentation →
          </Link>
        </div>
      </footer>
    </div>
  )
}
