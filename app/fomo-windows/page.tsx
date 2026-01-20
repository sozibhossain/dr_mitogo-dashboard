"use client"

import { useEffect, useState } from "react"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  getFOMOWindows,
  createFOMOWindow,
  updateFOMOWindow,
  deleteFOMOWindow,
  getFOMOWindowAnalytics,
  sendNotification,
} from "@/lib/api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const toIsoDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return date.toISOString()
}

const isDurationValid = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const min = 5 * 60 * 1000
  const max = 48 * 60 * 60 * 1000
  return diff >= min && diff <= max
}

export default function FOMOWindowsPage() {
  const [windows, setWindows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [activeWindow, setActiveWindow] = useState<any | null>(null)
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    maxPostsPerUser: "",
  })

  const loadWindows = () =>
    getFOMOWindows()
      .then(setWindows)
      .catch((error) => toast.error(error.message || "Failed to load windows"))
      .finally(() => setLoading(false))

  useEffect(() => {
    loadWindows()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700"
      case "scheduled":
        return "bg-blue-100 text-blue-700"
      case "ended":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const resetForm = () =>
    setForm({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      maxPostsPerUser: "",
    })

  const openCreate = () => {
    resetForm()
    setCreateOpen(true)
  }

  const openEdit = (fomoWindow: any) => {
    setActiveWindow(fomoWindow)
    setForm({
      title: fomoWindow.name || "",
      description: fomoWindow.description || "",
      startDate: fomoWindow.startDate || "",
      endDate: fomoWindow.endDate || "",
      maxPostsPerUser: fomoWindow.maxPostsPerUser?.toString() || "",
    })
    setEditOpen(true)
  }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      toast.error("Title, start date, and end date are required")
      return
    }
    if (!isDurationValid(form.startDate, form.endDate)) {
      toast.error("Window must be between 5 minutes and 48 hours long")
      return
    }

    setSaving(true)
    try {
      await createFOMOWindow({
        title: form.title.trim(),
        description: form.description.trim(),
        startTime: toIsoDate(form.startDate),
        endTime: toIsoDate(form.endDate),
        maxPostsPerUser: form.maxPostsPerUser ? Number(form.maxPostsPerUser) : null,
      })
      toast.success("FOMO window created")
      await sendNotification({
        title: "New FOMO window",
        content: `A new FOMO window is open from ${form.startDate} to ${form.endDate}`,
        targetGroup: "all",
      })
      setCreateOpen(false)
      loadWindows()
    } catch (error: any) {
      toast.error(error.message || "Failed to create window")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!activeWindow) return
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      toast.error("Title, start date, and end date are required")
      return
    }
    if (!isDurationValid(form.startDate, form.endDate)) {
      toast.error("Window must be between 5 minutes and 48 hours long")
      return
    }

    setSaving(true)
    try {
      await updateFOMOWindow(activeWindow.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        startTime: toIsoDate(form.startDate),
        endTime: toIsoDate(form.endDate),
        maxPostsPerUser: form.maxPostsPerUser ? Number(form.maxPostsPerUser) : null,
      })
      toast.success("FOMO window updated")
      await sendNotification({
        title: "FOMO window updated",
        content: `${form.title} runs from ${form.startDate} to ${form.endDate}`,
        targetGroup: "all",
      })
      setEditOpen(false)
      setActiveWindow(null)
      loadWindows()
    } catch (error: any) {
      toast.error(error.message || "Failed to update window")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (windowId: string) => {
    if (!window.confirm("Disable this FOMO window?")) return
    try {
      await deleteFOMOWindow(windowId)
      toast.success("FOMO window disabled")
      loadWindows()
    } catch (error: any) {
      toast.error(error.message || "Failed to disable window")
    }
  }

  const handleAnalytics = async (windowId: string) => {
    try {
      const response: any = await getFOMOWindowAnalytics(windowId)
      const stats = response?.data?.stats
      if (!stats) {
        toast.error("Analytics unavailable")
        return
      }
      setAnalytics(stats)
      setAnalyticsOpen(true)
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch analytics")
    }
  }

  return (
    <div>
      <Header title="FOMO Windows" description="Manage time-limited engagement windows" />

      <div className="p-8 space-y-6">
        <Button className="w-full" onClick={openCreate}>
          Create New FOMO Window
        </Button>

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading windows...</div>
          ) : windows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No FOMO windows found.</div>
          ) : (
            windows.map((fomoWindow: any) => (
              <div
                key={fomoWindow.id}
                className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{fomoWindow.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fomoWindow.startDate} to {fomoWindow.endDate}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(fomoWindow.status)}`}>
                    {fomoWindow.status.charAt(0).toUpperCase() + fomoWindow.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Posts Created</p>
                    <p className="text-2xl font-bold text-primary">{fomoWindow.postsCreated.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Users Participated</p>
                    <p className="text-2xl font-bold text-primary">{fomoWindow.usersParticipated.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max posts/user</p>
                    <p className="text-2xl font-bold text-primary">{fomoWindow.maxPostsPerUser ?? "-"}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEdit(fomoWindow)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAnalytics(fomoWindow.id)}>
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(fomoWindow.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create FOMO Window</DialogTitle>
            <DialogDescription>Schedule a new time-limited engagement event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
              <input
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
              <textarea
                className="w-full px-4 py-2 border border-border rounded-lg text-sm min-h-24"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Start Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">End Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Max posts per user (0 = unlimited)</label>
              <input
                type="number"
                min={0}
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.maxPostsPerUser}
                onChange={(event) => setForm((prev) => ({ ...prev, maxPostsPerUser: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Window"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setActiveWindow(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit FOMO Window</DialogTitle>
            <DialogDescription>Update window details and dates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
              <input
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
              <textarea
                className="w-full px-4 py-2 border border-border rounded-lg text-sm min-h-24"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Start Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">End Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Max posts per user (0 = unlimited)</label>
              <input
                type="number"
                min={0}
                className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                value={form.maxPostsPerUser}
                onChange={(event) => setForm((prev) => ({ ...prev, maxPostsPerUser: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>FOMO Analytics</DialogTitle>
            <DialogDescription>Engagement summary for this window.</DialogDescription>
          </DialogHeader>
          {analytics ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Posts</p>
                  <p className="font-medium text-foreground">{analytics.postCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Participants</p>
                  <p className="font-medium text-foreground">{analytics.participantCount}</p>
                </div>
              </div>
              {analytics.postsByDay && analytics.postsByDay.length > 0 ? (
                <div>
                  <p className="text-muted-foreground mb-2">Posts by Day</p>
                  <div className="space-y-2">
                    {analytics.postsByDay.map((item: any) => (
                      <div key={item.date} className="flex items-center justify-between text-foreground">
                        <span>{item.date}</span>
                        <span>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No daily breakdown available.</p>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Loading analytics...</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyticsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
