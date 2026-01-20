import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("h-8 rounded bg-muted animate-pulse", className)} />
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="flex-1" />
          <Skeleton className="flex-1" />
          <Skeleton className="flex-1" />
          <Skeleton className="flex-1" />
        </div>
      ))}
    </div>
  )
}
