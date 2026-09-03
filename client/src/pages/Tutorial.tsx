import { Terminal, GitBranch, Folder, Zap } from "lucide-react"

const STEPS = [
  {
    icon: GitBranch,
    title: "1. Create a service",
    desc: "Go to Services → New service. Paste your GitHub repo URL and set the root directory if your app is in a subfolder.",
    code: `# Example repo structure
my-project/
├── server/        ← set rootDir = "server"
│   ├── index.ts
│   └── package.json
└── client/`,
  },
  {
    icon: Terminal,
    title: "2. The platform builds it",
    desc: "After creating the service, the platform clones your repo, detects the runtime (Node.js, Python, Java), generates a Dockerfile, and builds the container.",
    code: `10:31:00  Cloning repository...
10:31:04  Detected runtime: Node.js 20
10:31:05  Generating Dockerfile...
10:31:06  Building image...
10:32:04  Container started on :3001
10:32:06  Health check passed`,
  },
  {
    icon: Zap,
    title: "3. Push to deploy",
    desc: "Once the webhook is set up, every push to main triggers a new deploy automatically. No manual steps needed.",
    code: `# Add webhook in GitHub
# Settings → Webhooks → Add webhook
# Payload URL: https://your-paas.com/api/webhook/github
# Content type: application/json
# Events: Just the push event`,
  },
  {
    icon: Folder,
    title: "4. Set environment variables",
    desc: "Go to your service → Variables tab. Add key-value pairs. They're injected into the container on the next deploy.",
    code: `DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=3000`,
  },
]

export default function Tutorial() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h1 className="text-sm font-semibold text-zinc-900">Tutorial</h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Deploy your first service</h2>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
            This platform works like Railway or Heroku — push code to GitHub and it deploys automatically.
            Here's how to get started in four steps.
          </p>
        </div>

        {STEPS.map(({ icon: Icon, title, desc, code }) => (
          <div key={title} className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 border border-zinc-200 rounded flex items-center justify-center flex-shrink-0 bg-zinc-50 mt-0.5">
                <Icon className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">{desc}</p>
              </div>
            </div>
            <div className="ml-12">
              <div className="bg-zinc-950 rounded-lg overflow-hidden">
                <pre className="p-4 text-xs font-mono text-zinc-400 leading-relaxed overflow-x-auto">
                  {code}
                </pre>
              </div>
            </div>
          </div>
        ))}

        {/* Supported runtimes */}
        <div className="border-t border-zinc-100 pt-10">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-5">Supported runtimes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { lang: "Node.js", files: ["package.json"], note: "Express, Nest.js, tsx" },
              { lang: "Python",  files: ["requirements.txt", "pyproject.toml"], note: "FastAPI, Flask, Django" },
              { lang: "Java",    files: ["pom.xml", "build.gradle"], note: "Spring Boot (Maven / Gradle)" },
            ].map(({ lang, files, note }) => (
              <div key={lang} className="border border-zinc-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-zinc-900 mb-2">{lang}</div>
                <div className="space-y-1 mb-3">
                  {files.map((f) => (
                    <div key={f} className="text-xs font-mono text-zinc-500 bg-zinc-50 rounded px-2 py-0.5 inline-block mr-1">
                      {f}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-400">{note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="border-t border-zinc-100 pt-10">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-5">FAQ</h3>
          <div className="space-y-6">
            {[
              {
                q: "Do I need to write a Dockerfile?",
                a: "No. The platform detects your runtime and generates one automatically. If your repo already has a Dockerfile, it uses that instead.",
              },
              {
                q: "What branch triggers a deploy?",
                a: "Only pushes to main. Other branches are ignored.",
              },
              {
                q: "How do I see build logs?",
                a: "Go to Services → your service → Logs tab. Build logs stream in real time.",
              },
              {
                q: "How do I roll back?",
                a: "Go to Services → your service → Deployments tab. Click the redeploy button next to any previous successful deploy.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <div className="text-sm font-medium text-zinc-900 mb-1">{q}</div>
                <div className="text-sm text-zinc-500 leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
