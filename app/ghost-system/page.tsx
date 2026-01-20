"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Skeleton, TableSkeleton } from "@/components/skeleton"
import { getGhostPosts, getGhostSummary, getGhostInsights, getGhostNames, updateGhostNameStatus } from "@/lib/api"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type GhostPostsResponse = Awaited<ReturnType<typeof getGhostPosts>>
type GhostNamesResponse = Awaited<ReturnType<typeof getGhostNames>>

export default function GhostSystemPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  const pageSize = 10

  const summaryQuery = useQuery({
    queryKey: ["ghost-summary"],
    queryFn: getGhostSummary,
  })

  const insightsQuery = useQuery({
    queryKey: ["ghost-insights"],
    queryFn: getGhostInsights,
  })

  const ghostNamesQuery = useQuery<GhostNamesResponse>({
    queryKey: ["ghost-names"],
    queryFn: getGhostNames,
  })

  const postsQuery = useQuery<GhostPostsResponse>({
    queryKey: ["ghost-posts", { page, pageSize }],
    queryFn: () => getGhostPosts(page, pageSize),
    keepPreviousData: true,
  })

  const nameMutation = useMutation({
    mutationFn: ({ name, status }: { name: string; status: "available" | "reserved" | "restricted" }) =>
      updateGhostNameStatus(name, status),
    onSuccess: (_, variables) => {
      toast.success(`Ghost name marked as ${variables.status}`)
      queryClient.setQueriesData<GhostNamesResponse>({ queryKey: ["ghost-names"] }, (existing) => {
        if (!existing) return existing
        return existing.map((entry) =>
          entry.name === variables.name
            ? { ...entry, status: variables.status, restricted: variables.status === "restricted", reserved: variables.status === "reserved" }
            : entry
        )
      })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update ghost name"),
  })

  useEffect(() => {
    setPage(1)
  }, [])

  const total = postsQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const insights = insightsQuery.data
  const summary = summaryQuery.data
  const ghostNames = ghostNamesQuery.data ?? []
  const posts = postsQuery.data?.posts ?? []

  const paginationLabel = useMemo(
    () =>
      `Showing ${Math.min((page - 1) * pageSize + 1, total)} to ${Math.min(page * pageSize, total)} of ${total} posts`,
    [page, pageSize, total]
  )

  const handleGhostNameStatus = (name: string, status: "available" | "reserved" | "restricted") => {
    nameMutation.mutate({ name, status })
  }

  return (
    <div>
      <Header title="Ghost System" description="Anonymous posts and ghost interactions" />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {["totalGhostPosts", "activeThisHour", "avgEngagement"].map((key) => (
            <div key={key} className="rounded-lg border border-border bg-white p-6">
              <p className="text-sm text-muted-foreground">
                {key === "totalGhostPosts" ? "Total Ghost Posts" : key === "activeThisHour" ? "Active This Hour" : "Avg Engagement"}
              </p>
              <p className="mt-2 text-3xl font-bold text-primary">
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-20" /> : Number((summary as any)?.[key] ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Content Breakdown</h3>
              <p className="text-xs text-muted-foreground">Last pull</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {["textPosts", "imagePosts", "videoPosts", "audioPosts"].map((metric) => (
                <div key={metric} className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-muted-foreground">
                    {metric === "textPosts"
                      ? "Words only"
                      : metric === "imagePosts"
                        ? "Images"
                        : metric === "videoPosts"
                          ? "Videos"
                          : "Audio/Music"}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {insightsQuery.isLoading ? (
                      <Skeleton className="mt-1 h-7 w-14" />
                    ) : (
                      insights?.breakdown?.[metric]?.toLocaleString() ?? "-"
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Flagged Ghost Posts</h3>
              <p className="text-xs text-muted-foreground">Auto-hide after 3+ reports</p>
            </div>
            {insightsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-16 w-full" />
                ))}
              </div>
            ) : !insights || insights.flagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing flagged right now.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {insights.flagged.map((item: any) => (
                  <div key={item.id} className="rounded-lg bg-secondary/40 p-3">
                    <p className="text-sm text-foreground line-clamp-2">{item.contentPreview || "No preview"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.reportCount} reports Жњ {item.ghostName || "Ghost"}
                    </p>
                    {item.reasons?.length ? (
                      <p className="mt-1 text-xs text-muted-foreground">Reasons: {item.reasons.join(", ")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Ghost Names</h3>
            <p className="text-xs text-muted-foreground">Reserve or restrict names from assignment</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Ghost Name</th>
                  <th className="px-4 py-2 text-left font-semibold">User</th>
                  <th className="px-4 py-2 text-left font-semibold">School</th>
                  <th className="px-4 py-2 text-left font-semibold">Work</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ghostNamesQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4">
                      <TableSkeleton rows={3} />
                    </td>
                  </tr>
                ) : ghostNames.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">
                      No ghost names found.
                    </td>
                  </tr>
                ) : (
                  ghostNames.map((entry) => (
                    <tr key={entry.name}>
                      <td className="px-4 py-3 font-medium text-foreground">{entry.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.username || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.school || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.work || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{entry.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGhostNameStatus(entry.name, "restricted")}
                            disabled={nameMutation.isPending}
                          >
                            Restrict
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGhostNameStatus(entry.name, "reserved")}
                            disabled={nameMutation.isPending}
                          >
                            Reserve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGhostNameStatus(entry.name, "available")}
                            disabled={nameMutation.isPending}
                          >
                            Allow
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Content</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Author</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Likes</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Comments</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {postsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                      No ghost posts found.
                    </td>
                  </tr>
                ) : (
                  posts.map((post: any) => (
                    <tr key={post.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">{post.content}</td>
                      <td className="px-6 py-4 text-sm font-medium text-primary">{post.author}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{post.likes}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{post.comments}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{post.createdAt}</td>
                      <td className="px-6 py-4 text-sm">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedPost(post)}>
                          View
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

      <Dialog open={!!selectedPost} onOpenChange={(open) => (open ? null : setSelectedPost(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ghost Post Details</DialogTitle>
            <DialogDescription>View the full post and engagement stats.</DialogDescription>
          </DialogHeader>
          {selectedPost ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Content</p>
                <p className="mt-1 text-foreground">{selectedPost.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Author</p>
                  <p className="font-medium text-foreground">{selectedPost.author}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium text-foreground">{selectedPost.createdAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Likes</p>
                  <p className="font-medium text-foreground">{selectedPost.likes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Comments</p>
                  <p className="font-medium text-foreground">{selectedPost.comments}</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPost(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
