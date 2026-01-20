"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Skeleton, TableSkeleton } from "@/components/skeleton"
import {
  getAdSummary,
  getAdCampaigns,
  createAdCampaign,
  updateAdCampaignStatus,
  deleteAdCampaign,
} from "@/lib/api"
import { toast } from "sonner"
import { BarChart3, TrendingUp, Eye, Clock as Click, Pause, Play, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AdsResponse = {
  summary: Awaited<ReturnType<typeof getAdSummary>>
  campaigns: Awaited<ReturnType<typeof getAdCampaigns>>
}

export default function AdsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    contentType: "text",
    contentText: "",
    mediaUrl: "",
    linkUrl: "",
    startTime: "",
    endTime: "",
    allowedUserIds: "",
    allowedGroupIds: "",
  })

  const adsQuery = useQuery<AdsResponse>({
    queryKey: ["ads"],
    queryFn: async () => {
      const [summaryData, campaignsData] = await Promise.all([getAdSummary(), getAdCampaigns()])
      return { summary: summaryData, campaigns: campaignsData }
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createAdCampaign({
        name: form.name.trim(),
        contentType: form.contentType as any,
        contentText: form.contentText,
        mediaUrl: form.mediaUrl,
        linkUrl: form.linkUrl,
        startTime: form.startTime,
        endTime: form.endTime,
        allowedUserIds: form.allowedUserIds ? form.allowedUserIds.split(",").map((id) => id.trim()) : [],
        allowedGroupIds: form.allowedGroupIds ? form.allowedGroupIds.split(",").map((id) => id.trim()) : [],
      }),
    onSuccess: () => {
      toast.success("Ad campaign created")
      setCreateOpen(false)
      setForm({
        name: "",
        contentType: "text",
        contentText: "",
        mediaUrl: "",
        linkUrl: "",
        startTime: "",
        endTime: "",
        allowedUserIds: "",
        allowedGroupIds: "",
      })
      queryClient.invalidateQueries({ queryKey: ["ads"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to create campaign"),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAdCampaignStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update campaign"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdCampaign(id),
    onSuccess: () => {
      toast.success("Campaign deleted")
      queryClient.invalidateQueries({ queryKey: ["ads"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to delete campaign"),
  })

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error("Campaign name is required")
      return
    }
    if (!form.contentType) {
      toast.error("Select a content type")
      return
    }
    createMutation.mutate()
  }

  const handleStatusToggle = (campaign: any) => {
    const nextStatus = campaign.status === "paused" ? "active" : "paused"
    statusMutation.mutate({ id: campaign.id, status: nextStatus })
  }

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this campaign?")) return
    deleteMutation.mutate(id)
  }

  const formatSpend = (value: number) => `$${value.toFixed(2)}`
  const summary = adsQuery.data?.summary
  const campaigns = adsQuery.data?.campaigns ?? []
  const loading = adsQuery.isLoading || adsQuery.isFetching

  const metrics = useMemo(
    () => [
      {
        label: "Total Impressions",
        value: summary?.totalImpressions.toLocaleString() ?? "-",
        icon: <Eye className="h-8 w-8 text-primary/20" />,
      },
      {
        label: "Total Clicks",
        value: summary?.totalClicks.toLocaleString() ?? "-",
        icon: <Click className="h-8 w-8 text-primary/20" />,
      },
      {
        label: "Avg CTR",
        value: summary ? `${summary.avgCtr.toFixed(2)}%` : "-",
        icon: <TrendingUp className="h-8 w-8 text-primary/20" />,
      },
      {
        label: "Total Spend",
        value: summary ? formatSpend(summary.totalSpend) : "-",
        icon: <BarChart3 className="h-8 w-8 text-primary/20" />,
      },
      {
        label: "Reports",
        value: summary?.totalReports?.toLocaleString() ?? "0",
        icon: <BarChart3 className="h-8 w-8 text-primary/20" />,
      },
    ],
    [summary]
  )

  return (
    <div>
      <Header title="Ad Campaigns" description="Manage advertising campaigns and analytics" />

      <div className="p-8 space-y-6">
        <Button className="w-full" onClick={() => setCreateOpen(true)}>
          Create New Campaign
        </Button>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-white p-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-8 w-20" />
                </div>
              ))
            : metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-border bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-2xl font-bold text-primary">{metric.value}</p>
                    </div>
                    {metric.icon}
                  </div>
                </div>
              ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Campaign</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Window</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Impressions</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Clicks</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Views</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">CTR</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-6">
                      <TableSkeleton rows={4} />
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-6">
                      <div className="text-sm text-muted-foreground">No campaigns found.</div>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr key={campaign.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{campaign.name}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{campaign.contentType}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {campaign.startTime ? campaign.startTime.split("T")[0] : "-"} –{" "}
                        {campaign.endTime ? campaign.endTime.split("T")[0] : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{campaign.impressions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{campaign.clicks.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {campaign.metrics?.views?.toLocaleString?.() || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-primary">{campaign.ctr.toFixed(2)}%</td>
                      <td className="px-6 py-4 text-sm text-foreground capitalize">{campaign.status}</td>
                      <td className="px-6 py-4 text-sm flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggle(campaign)}
                          disabled={statusMutation.isPending}
                        >
                          {campaign.status === "paused" ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
                          {campaign.status === "paused" ? "Resume" : "Pause"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(campaign.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Ad Campaign</DialogTitle>
            <DialogDescription>Configure placement, duration, and content.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Campaign Name</label>
              <input
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Content Type</label>
              <select
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.contentType}
                onChange={(e) => setForm((prev) => ({ ...prev, contentType: e.target.value }))}
              >
                <option value="text">Text</option>
                <option value="image">Photo</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground">Content / Caption</label>
              <textarea
                className="min-h-24 w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.contentText}
                onChange={(e) => setForm((prev) => ({ ...prev, contentText: e.target.value }))}
                placeholder="Ad text or caption"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Media URL (if photo/video/audio)</label>
              <input
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.mediaUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, mediaUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Link URL (optional)</label>
              <input
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.linkUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Start Time</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">End Time</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.endTime}
                onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Allowed User IDs (comma separated)</label>
              <input
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.allowedUserIds}
                onChange={(e) => setForm((prev) => ({ ...prev, allowedUserIds: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Allowed Group IDs (comma separated)</label>
              <input
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                value={form.allowedGroupIds}
                onChange={(e) => setForm((prev) => ({ ...prev, allowedGroupIds: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
