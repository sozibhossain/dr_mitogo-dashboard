"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/skeleton"
import { getContentFlags, reviewContent } from "@/lib/api"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, CheckCircle, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type FlagsResponse = Awaited<ReturnType<typeof getContentFlags>>

export default function ContentPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedFlag, setSelectedFlag] = useState<any | null>(null)

  const pageSize = 10

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const flagsQuery = useQuery<FlagsResponse>({
    queryKey: ["content-flags", { page, pageSize, statusFilter }],
    queryFn: () => getContentFlags(page, pageSize, statusFilter),
    keepPreviousData: true,
  })

  const flags = flagsQuery.data?.flags ?? []
  const total = flagsQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const reviewMutation = useMutation({
    mutationFn: ({ flagId, action }: { flagId: string; action: "approve" | "hide" }) =>
      reviewContent(flagId, action),
    onSuccess: (_, variables) => {
      toast.success(`Content ${variables.action === "approve" ? "approved" : "hidden"} successfully`)
      queryClient.setQueriesData<FlagsResponse>({ queryKey: ["content-flags"] }, (existing) => {
        if (!existing) return existing
        return { ...existing, flags: existing.flags.filter((f) => f.id !== variables.flagId) }
      })
      if (selectedFlag?.id === variables.flagId) {
        setSelectedFlag(null)
      }
    },
    onError: () => toast.error("Failed to review content"),
  })

  const handleReview = (flagId: string, action: "approve" | "hide") => {
    reviewMutation.mutate({ flagId, action })
  }

  const paginationLabel = useMemo(
    () =>
      `Showing ${Math.min((page - 1) * pageSize + 1, total)} to ${Math.min(page * pageSize, total)} of ${total} flags`,
    [page, pageSize, total]
  )

  return (
    <div>
      <Header title="Content Moderation" description="Review and manage flagged content" />

      <div className="p-8 space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Post ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Content Preview</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Reason</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Author</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flagsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : flags.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6">
                      <div className="text-sm text-muted-foreground">No flagged posts found.</div>
                    </td>
                  </tr>
                ) : (
                  flags.map((flag: any) => (
                    <tr key={flag.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{flag.postId}</td>
                      <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">{flag.content}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{flag.reason}</td>
                      <td className="px-6 py-4 text-sm text-primary flex items-center gap-2">
                        {flag.author}
                        <span className="text-xs text-muted-foreground">(flags: {flag.authorFlaggedCount || 0})</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            flag.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : flag.status === "reviewed"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedFlag(flag)}>
                          <Eye className="mr-1 h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReview(flag.id, "approve")}
                          disabled={flag.status === "reviewed" || reviewMutation.isPending}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReview(flag.id, "hide")}
                          disabled={flag.status === "hidden" || reviewMutation.isPending}
                        >
                          Hide
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{paginationLabel}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || totalPages === 0}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = page > 3 ? page + i - 2 : i + 1
              return pageNum <= totalPages ? (
                <Button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                >
                  {pageNum}
                </Button>
              ) : null
            })}
            <Button
              onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedFlag} onOpenChange={(open) => (open ? null : setSelectedFlag(null))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Flagged Content</DialogTitle>
            <DialogDescription>Review the full content and media before acting.</DialogDescription>
          </DialogHeader>
          {selectedFlag ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Post ID</p>
                  <p className="font-medium text-foreground">{selectedFlag.postId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Author flagged count</p>
                  <p className="font-medium text-foreground">{selectedFlag.authorFlaggedCount || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Flagged At</p>
                  <p className="font-medium text-foreground">{selectedFlag.flaggedAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium text-foreground">{selectedFlag.reason}</p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-muted-foreground">Content</p>
                <div className="whitespace-pre-wrap rounded-md border border-border bg-secondary/30 p-3 text-foreground">
                  {selectedFlag.contentFull || selectedFlag.content}
                </div>
              </div>

              {selectedFlag.media && selectedFlag.media.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Media</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedFlag.media.map((item: any, idx: number) => (
                      <div key={`${item.url}-${idx}`} className="space-y-2 rounded-md border border-border p-2">
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                        {item.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt="flagged" className="w-full rounded" />
                        ) : item.type === "video" ? (
                          <video controls className="w-full rounded" src={item.url} />
                        ) : item.type === "audio" ? (
                          <audio controls className="w-full" src={item.url} />
                        ) : (
                          <a href={item.url} className="text-primary underline" target="_blank" rel="noreferrer">
                            View file
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSelectedFlag(null)}>
              Close
            </Button>
            {selectedFlag && (
              <>
                <Button
                  onClick={() => handleReview(selectedFlag.id, "approve")}
                  disabled={selectedFlag.status === "reviewed" || reviewMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReview(selectedFlag.id, "hide")}
                  disabled={selectedFlag.status === "hidden" || reviewMutation.isPending}
                >
                  Hide
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
