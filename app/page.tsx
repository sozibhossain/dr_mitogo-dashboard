"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import MetricCard from "@/components/metric-card"
import { Skeleton, TableSkeleton } from "@/components/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  getDashboardSummary,
  DashboardSummary,
  getUsers,
  updateUserStatus,
  getContentFlags,
  reviewContent,
  getVerificationRequests,
  updateVerificationRequest,
} from "@/lib/api"
import { toast } from "sonner"

const PANEL_USERS_LIMIT = 6
const PANEL_FLAGS_LIMIT = 5

const formatDuration = (ms: number) => {
  if (ms <= 0) return "00:00:00"
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

type PanelType = "users" | "online" | "verified" | "flagged" | null
type PanelData =
  | { type: "users" | "online"; items: any[] }
  | { type: "flagged"; items: any[] }
  | { type: "verified"; items: any[] }
  | null

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<PanelType>(null)
  const [fomoStatus, setFomoStatus] = useState("Loading...")
  const [fomoStats, setFomoStats] = useState({ posts: 0, users: 0 })

  const panelQueryKey = useMemo(() => ["dashboard-panel", panel], [panel])

  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
  } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!summary) return
    if (summary.fomoStatus.isActive) {
      setFomoStats({
        posts: summary.fomoStatus.stats.postCount,
        users: summary.fomoStatus.stats.participantCount,
      })
      setFomoStatus("Calculating...")
    } else {
      setFomoStatus("No active window")
      setFomoStats({ posts: 0, users: 0 })
    }
  }, [summary])

  useEffect(() => {
    if (!summary?.fomoStatus.isActive) return

    const endTime = new Date(summary.fomoStatus.endTime).getTime()
    const updateStatus = () => {
      const remaining = endTime - Date.now()
      if (remaining <= 0) {
        setFomoStatus("Window ended")
        return
      }
      setFomoStatus(`Active for another ${formatDuration(remaining)}`)
    }

    updateStatus()
    const interval = window.setInterval(updateStatus, 1000)
    return () => window.clearInterval(interval)
  }, [summary])

  const {
    data: panelData,
    isFetching: panelLoading,
    isLoading: panelInitialLoading,
  } = useQuery<PanelData>({
    queryKey: panelQueryKey,
    queryFn: async () => {
      if (!panel) return null
      if (panel === "flagged") {
        const data = await getContentFlags(1, PANEL_FLAGS_LIMIT, "pending")
        return { type: "flagged", items: data.flags }
      }
      if (panel === "verified") {
        const data = await getVerificationRequests("pending")
        return { type: "verified", items: data }
      }
      const status = panel === "online" ? "active" : undefined
      const data = await getUsers(1, PANEL_USERS_LIMIT, "", status)
      return { type: panel, items: data.users }
    },
    enabled: !!panel,
    refetchOnWindowFocus: false,
  })

  const panelTitle = useMemo(() => {
    if (!panel) return ""
    switch (panel) {
      case "users":
        return "Total Users"
      case "online":
        return "Online Users"
      case "verified":
        return "Verification Queue"
      case "flagged":
        return "Flagged Content"
      default:
        return ""
    }
  }, [panel])

  const openPanel = (type: PanelType) => {
    setPanel(type)
  }

  const handleUserAction = async (userId: string, action: string) => {
    try {
      await updateUserStatus(userId, { action })
      toast.success("User updated")
      queryClient.setQueryData(panelQueryKey, (prev: PanelData) => {
        if (prev && (prev.type === "users" || prev.type === "online")) {
          return {
            ...prev,
            items: prev.items.map((user: any) =>
              user.id === userId
                ? {
                    ...user,
                    verified: action === "verify" ? true : action === "unverify" ? false : user.verified,
                    status:
                      action === "ban" || action === "suspend"
                        ? "suspended"
                        : action === "restrict"
                          ? "inactive"
                          : ["unban", "unsuspend", "unrestrict"].includes(action)
                            ? "active"
                            : user.status,
                  }
                : user
            ),
          }
        }
        return prev
      })
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    }
  }

  const handleModerationAction = async (flagId: string, action: "approve" | "hide") => {
    try {
      await reviewContent(flagId, action)
      toast.success(`Post ${action === "approve" ? "approved" : "hidden"}`)
      queryClient.setQueryData(panelQueryKey, (prev: PanelData) => {
        if (prev && prev.type === "flagged") {
          return { ...prev, items: prev.items.filter((item: any) => item.id !== flagId) }
        }
        return prev
      })
    } catch (error: any) {
      toast.error(error.message || "Action failed")
    }
  }

  const handleVerificationAction = async (id: string, next: "approved" | "rejected") => {
    try {
      await updateVerificationRequest({
        id,
        status: next,
        reason: next === "rejected" ? "Rejected via dashboard" : undefined,
      })
      toast.success(`Request ${next}`)
      queryClient.setQueryData(panelQueryKey, (prev: PanelData) => {
        if (prev && prev.type === "verified") {
          return { ...prev, items: prev.items.filter((item: any) => item.id !== id) }
        }
        return prev
      })
    } catch (error: any) {
      toast.error(error.message || "Update failed")
    }
  }

  const panelUsers = panelData && (panelData.type === "users" || panelData.type === "online") ? panelData.items : []
  const panelModeration = panelData && panelData.type === "flagged" ? panelData.items : []
  const panelVerifications = panelData && panelData.type === "verified" ? panelData.items : []

  return (
    <div>
      <Header title="Dashboard" description="Welcome to Casa Rancha Admin Panel" />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Total Users"
            value={
              summaryLoading ? <Skeleton className="h-8 w-24" /> : summary?.totals.users.toLocaleString() || "-"
            }
            icon="U"
            trend={summaryFetching ? "Refreshing..." : "-"}
            trendUp={true}
            onClick={() => openPanel("users")}
          />
          <MetricCard
            label="Online Now"
            value={
              summaryLoading ? <Skeleton className="h-8 w-20" /> : summary?.totals.onlineNow.toLocaleString() || "-"
            }
            icon="O"
            trend={summaryFetching ? "Refreshing..." : "-"}
            trendUp={true}
            onClick={() => openPanel("online")}
          />
          <MetricCard
            label="Verified Accounts"
            value={
              summaryLoading ? <Skeleton className="h-8 w-20" /> : summary?.totals.verifiedAccounts.toLocaleString() || "-"
            }
            icon="V"
            trend={summaryFetching ? "Refreshing..." : "-"}
            trendUp={true}
            onClick={() => openPanel("verified")}
          />
          <MetricCard
            label="Ghost Posts (24h)"
            value={
              summaryLoading ? <Skeleton className="h-8 w-20" /> : summary?.totals.ghostPosts24h.toLocaleString() || "-"
            }
            icon="G"
            trend={summaryFetching ? "Refreshing..." : "-"}
            trendUp={false}
          />
          <MetricCard
            label="Flagged Content"
            value={
              summaryLoading ? <Skeleton className="h-8 w-20" /> : summary?.totals.flaggedContent.toLocaleString() || "-"
            }
            icon="!"
            trend={summaryFetching ? "Refreshing..." : "-"}
            trendUp={false}
            onClick={() => openPanel("flagged")}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Top 5 Most Active Users</h2>
              <Button variant="outline" size="sm" onClick={() => openPanel("users")}>
                Quick manage
              </Button>
            </div>
            <div className="space-y-4">
              {summaryLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : summary?.topActiveUsers?.length ? (
                summary.topActiveUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {index + 1}. {user.username || user.displayName || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.posts} posts / {user.comments} comments
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{user.interactions}</p>
                      <p className="text-xs text-muted-foreground">interactions</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">AI Engagement Today</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {summaryLoading ? <Skeleton className="mx-auto h-8 w-12" /> : summary?.aiEngagementToday.comments ?? 0}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">AI Comments</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {summaryLoading ? <Skeleton className="mx-auto h-8 w-12" /> : summary?.aiEngagementToday.likes ?? 0}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">AI Likes</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {summaryLoading ? <Skeleton className="mx-auto h-8 w-12" /> : summary?.aiEngagementToday.replies ?? 0}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">AI Replies</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">FOMO Window Status</h2>
            <div className="space-y-4">
              <div className="rounded bg-secondary p-4">
                <p className="text-sm font-medium text-foreground">{fomoStatus}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {summary?.fomoStatus.isActive
                    ? "Current FOMO window is active"
                    : "No active FOMO window"}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>- {fomoStats.posts.toLocaleString()} posts created</p>
                <p>- {fomoStats.users.toLocaleString()} unique users participated</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">Flagged Explicit Content</h2>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-primary">
                {summaryLoading ? <Skeleton className="h-10 w-20" /> : summary?.flaggedExplicitContent.total ?? 0}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Last 24 hours detected by AI</p>
                <p>
                  -{" "}
                  {summaryLoading ? (
                    <Skeleton className="mt-1 h-3 w-24" />
                  ) : (
                    summary?.flaggedExplicitContent.hiddenUnder18 ?? 0
                  )}{" "}
                  items hidden from under-18
                </p>
                <p>
                  -{" "}
                  {summaryLoading ? (
                    <Skeleton className="mt-1 h-3 w-24" />
                  ) : (
                    summary?.flaggedExplicitContent.escalated ?? 0
                  )}{" "}
                  items escalated for review
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openPanel("flagged")}>
                Review flagged posts
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!panel} onOpenChange={(open) => (!open ? setPanel(null) : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{panelTitle}</DialogTitle>
            <DialogDescription>
              {panel === "users" && "Quick actions for recently active accounts."}
              {panel === "online" && "Manage users currently marked as active."}
              {panel === "verified" && "Approve or reject pending verification requests without leaving the dashboard."}
              {panel === "flagged" && "Review and clear the most recent flagged content."}
            </DialogDescription>
          </DialogHeader>

          {panelLoading || panelInitialLoading ? (
            <TableSkeleton />
          ) : panel === "verified" ? (
            <div className="space-y-3">
              {panelVerifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                panelVerifications.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-lg bg-secondary/40 p-3">
                    <div>
                      <p className="font-medium text-foreground">{req.displayName}</p>
                      <p className="text-xs text-muted-foreground">{req.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleVerificationAction(req.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleVerificationAction(req.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : panel === "flagged" ? (
            <div className="space-y-3">
              {panelModeration.length === 0 ? (
                <p className="text-sm text-muted-foreground">No flagged posts.</p>
              ) : (
                panelModeration.map((flag) => (
                  <div key={flag.id} className="flex items-start justify-between rounded-lg bg-secondary/30 p-3">
                    <div className="pr-4">
                      <p className="line-clamp-2 font-medium text-foreground">{flag.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Reason: {flag.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleModerationAction(flag.id, "approve")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleModerationAction(flag.id, "hide")}>
                        Hide
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {panelUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found.</p>
              ) : (
                panelUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3">
                    <div>
                      <p className="font-medium text-foreground">{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email} Жњ {user.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, "verify")}>
                        Verify
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleUserAction(user.id, "ban")}>
                        Ban
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, "restrict")}>
                        Restrict
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
