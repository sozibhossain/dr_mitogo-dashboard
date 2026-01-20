import type React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  label: string
  value: React.ReactNode
  icon: string
  trend: string
  trendUp: boolean
  onClick?: () => void
}

export default function MetricCard({ label, value, icon, trend, trendUp, onClick }: MetricCardProps) {
  const clickable = typeof onClick === "function";
  return (
    <div
      className={`bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow ${
        clickable ? "cursor-pointer ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/40" : ""
      }`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!clickable) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-xs ${trendUp ? "text-green-600" : "text-red-600"}`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trend}</span>
          </div>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}
