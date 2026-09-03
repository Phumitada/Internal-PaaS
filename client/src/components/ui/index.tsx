import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react"

// ─── Button ──────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const BUTTON_BASE = "inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50 disabled:pointer-events-none rounded"

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:   "bg-zinc-900 text-white hover:bg-zinc-700",
  secondary: "border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
  ghost:     "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100",
  danger:    "border border-red-200 text-red-600 hover:bg-red-50",
}

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = "Button"

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode  
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, className = "", ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-zinc-700 mb-1.5">{label}</label>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full border rounded text-sm focus:outline-none focus:border-zinc-400 transition-colors
            ${error ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white"}
            ${prefix ? "pl-8" : "pl-3"} pr-3 py-2
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = "Input"

// ─── StatusBadge ─────────────────────────────────────────────────────────────
type AppStatus = "IDLE" | "BUILDING" | "RUNNING" | "STOPPED" | "ERROR"

const STATUS_DOT: Record<AppStatus, string> = {
  RUNNING:  "bg-emerald-500",
  BUILDING: "bg-yellow-400 animate-pulse",
  STOPPED:  "bg-zinc-300",
  ERROR:    "bg-red-500",
  IDLE:     "bg-zinc-300",
}

const STATUS_TEXT: Record<AppStatus, string> = {
  RUNNING:  "text-emerald-600",
  BUILDING: "text-yellow-600",
  STOPPED:  "text-zinc-400",
  ERROR:    "text-red-500",
  IDLE:     "text-zinc-400",
}

export function StatusBadge({ status }: { status: string }) {
  const s = (status?.toUpperCase() || "IDLE") as AppStatus
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[s] ?? "bg-zinc-300"}`} />
      <span className={`text-xs font-mono ${STATUS_TEXT[s] ?? "text-zinc-400"}`}>{s.toLowerCase()}</span>
    </span>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-2 py-1 text-xs border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
      >
        ←
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-7 h-7 text-xs rounded transition-colors ${
            p === page
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 hover:bg-zinc-50 text-zinc-600"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-2 py-1 text-xs border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
      >
        →
      </button>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 border-2 border-dashed border-zinc-200 rounded-lg mb-4" />
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {description && <p className="text-xs text-zinc-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-zinc-200 rounded-lg bg-white ${className}`}>
      {children}
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider() {
  return <div className="border-t border-zinc-100 my-4" />
}
