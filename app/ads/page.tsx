"use client"

import { useEffect, useState } from "react"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
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

export default function AdsPage() {
  const [summary, setSummary] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    avgCtr: 0,
    totalSpend: 0,
    totalViews: 0,
    totalReports: 0,
  })
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      const [summaryData, campaignsData] = await Promise.all([getAdSummary(), getAdCampaigns()])
      setSummary(summaryData as any)
      setCampaigns(campaignsData)
    } catch (error: any) {
      toast.error(error.message || "Failed to load ad campaigns")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Campaign name is required")
      return
    }
    if (!form.contentType) {
      toast.error("Select a content type")
      return
    }

    setSaving(true)
    try {
      await createAdCampaign({
        name: form.name.trim(),
        contentType: form.contentType as any,
        contentText: form.contentText,
        mediaUrl: form.mediaUrl,
        linkUrl: form.linkUrl,
        startTime: form.startTime,
        endTime: form.endTime,
        allowedUserIds: form.allowedUserIds ? form.allowedUserIds.split(",").map((id) => id.trim()) : [],
        allowedGroupIds: form.allowedGroupIds ? form.allowedGroupIds.split(",").map((id) => id.trim()) : [],
      })
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
      await loadCampaigns()
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusToggle = async (campaign: any) => {
    const nextStatus = campaign.status === "paused" ? "active" : "paused"
    try {
      await updateAdCampaignStatus(campaign.id, nextStatus)
      toast.success(`Campaign ${nextStatus === "active" ? "resumed" : "paused"}`)
      await loadCampaigns()
    } catch (error: any) {
      toast.error(error.message || "Failed to update campaign")
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this campaign?")) return
    try {
      await deleteAdCampaign(id)
      toast.success("Campaign deleted")
      await loadCampaigns()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete campaign")
    }
  }

  const formatSpend = (value: number) => `$${value.toFixed(2)}`

  return (
    <div>
      <Header title="Ad Campaigns" description="Manage advertising campaigns and analytics" />

      <div className="p-8 space-y-6">
        <Button className="w-full" onClick={() => setCreateOpen(true)}>
          Create New Campaign
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  {summary.totalImpressions.toLocaleString()}
                </p>
              </div>
              <Eye className="w-8 h-8 text-primary/20" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold text-primary mt-2">{summary.totalClicks.toLocaleString()}</p>
              </div>
              <Click className="w-8 h-8 text-primary/20" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg CTR</p>
                <p className="text-2xl font-bold text-primary mt-2">{summary.avgCtr.toFixed(2)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary/20" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold text-primary mt-2">{formatSpend(summary.totalSpend)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary/20" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reports</p>
                <p className="text-2xl font-bold text-primary mt-2">{(summary.totalReports ?? 0).toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary/20" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
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
                      <div className="text-sm text-muted-foreground">Loading campaigns...</div>
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
                    <tr key={campaign.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{campaign.name}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{campaign.contentType}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {campaign.startTime ? campaign.startTime.split("T")[0] : "-"} ? {" "}
                        {campaign.endTime ? campaign.endTime.split("T")[0] : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{campaign.impressions.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{campaign.clicks.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {campaign.metrics?.views?.toLocaleString?.() || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary font-semibold">
                        {campaign.ctr.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground capitalize">{campaign.status}</td>
                      <td className="px-6 py-4 text-sm flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => handleStatusToggle(campaign)}>
                          {campaign.status === "paused" ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                          {campaign.status === "paused" ? "Resume" : "Pause"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(campaign.id)}>
                          <Trash2 className="w-4 h-4 mr-1" />
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
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Content Type</label>
              <select
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.contentType}
                onChange={(e) => setForm((prev) => ({ ...prev, contentType: e.target.value }))}
              >
                <option value="text">Text</option>
                <option value="image">Photo</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-foreground">Content / Caption</label>
              <textarea
                className="w-full px-4 py-2 border border-border rounded-lg text-sm min-h-24"
                value={form.contentText}
                onChange={(e) => setForm((prev) => ({ ...prev, contentText: e.target.value }))}
                placeholder="Ad text or caption"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Media URL (if photo/video/audio)</label>
              <input
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.mediaUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, mediaUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Link URL (optional)</label>
              <input
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.linkUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Start Time</label>
              <input
                type="datetime-local"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">End Time</label>
              <input
                type="datetime-local"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.endTime}
                onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Allowed User IDs (comma separated)</label>
              <input
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.allowedUserIds}
                onChange={(e) => setForm((prev) => ({ ...prev, allowedUserIds: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Allowed Group IDs (comma separated)</label>
              <input
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.allowedGroupIds}
                onChange={(e) => setForm((prev) => ({ ...prev, allowedGroupIds: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
