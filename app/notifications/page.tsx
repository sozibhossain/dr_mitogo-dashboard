"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/skeleton"
import { sendNotification, getNotifications } from "@/lib/api"
import { toast } from "sonner"
import { Send } from "lucide-react"

type NotificationsResponse = Awaited<ReturnType<typeof getNotifications>>

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [targetType, setTargetType] = useState("all")
  const [targetValue, setTargetValue] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")

  const notificationsQuery = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  })

  const sendMutation = useMutation({
    mutationFn: () =>
      sendNotification({
        title,
        content,
        targetType,
        targetValue: targetValue.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Notification sent successfully!")
      setTitle("")
      setContent("")
      setMediaUrl("")
      setTargetValue("")
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to send notification"),
  })

  const handleSend = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in title and content")
      return
    }
    if ((targetType === "group" || targetType === "user") && !targetValue.trim()) {
      toast.error("Please provide a target group or user id")
      return
    }
    sendMutation.mutate()
  }

  const notifications = notificationsQuery.data ?? []

  return (
    <div>
      <Header title="Push Notifications" description="Send notifications to users" />

      <div className="p-8 space-y-6">
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="mb-6 text-lg font-bold text-foreground">Send New Notification</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Audience</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
              >
                <option value="all">All Users</option>
                <option value="verified">Verified Only</option>
                <option value="active">Active Users</option>
                <option value="group">Specific Group</option>
                <option value="user">Specific User</option>
              </select>
            </div>
            {(targetType === "group" || targetType === "user") && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {targetType === "group" ? "Group ID" : "User ID"}
                </label>
                <Input
                  placeholder={targetType === "group" ? "Enter group id" : "Enter user id"}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Title</label>
              <Input placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Content</label>
              <textarea
                placeholder="Notification content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-24 w-full rounded-lg border border-border px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Media URL (optional)</label>
              <Input
                placeholder="Attach image/video/audio via URL"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleSend} disabled={sendMutation.isPending} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {sendMutation.isPending ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">Recent Notifications</h2>
          <div className="space-y-3">
            {notificationsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-secondary/50 p-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3 w-64" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              ))
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications sent yet</p>
            ) : (
              notifications.map((notif: any) => (
                <div key={notif.id} className="rounded-lg border border-border bg-secondary/50 p-4">
                  <p className="font-medium text-foreground">{notif.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notif.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Audience: {notif.targetType || notif.targetGroup}
                    {notif.targetValue ? ` (${notif.targetValue})` : ""}
                  </p>
                  {notif.mediaUrl ? (
                    <p className="mt-1 break-all text-xs text-primary">Media: {notif.mediaUrl}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Delivered to {notif.deliveredCount.toLocaleString()} users
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
