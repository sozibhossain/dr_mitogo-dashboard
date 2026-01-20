"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/skeleton"
import { getAICampaigns, createAICampaign, updateAICampaignStatus, deleteAICampaign } from "@/lib/api"
import { toast } from "sonner"
import { Play, Pause, Trash2 } from "lucide-react"

const getTypeLabel = (type: string) => {
  switch (type) {
    case "engagement":
      return "Engagement Booster"
    case "posts":
      return "Content Seeding"
    case "comments":
      return "Comment Catalyst"
    default:
      return type
  }
}

type CampaignsResponse = Awaited<ReturnType<typeof getAICampaigns>>

export default function AISettingsPage() {
  const queryClient = useQueryClient()
  const [campaignName, setCampaignName] = useState("")
  const [campaignType, setCampaignType] = useState("engagement")

  const campaignsQuery = useQuery<CampaignsResponse>({
    queryKey: ["ai-campaigns"],
    queryFn: getAICampaigns,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createAICampaign({
        name: campaignName.trim(),
        type: campaignType as any,
        status: "active",
      }),
    onSuccess: () => {
      toast.success("Campaign created successfully")
      setCampaignName("")
      queryClient.invalidateQueries({ queryKey: ["ai-campaigns"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to create campaign"),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAICampaignStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-campaigns"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update campaign"),
  })

  const deleteMutation = useMutation({
    mutationFn: (campaignId: string) => deleteAICampaign(campaignId),
    onSuccess: () => {
      toast.success("Campaign deleted")
      queryClient.invalidateQueries({ queryKey: ["ai-campaigns"] })
    },
    onError: (error: any) => toast.error(error?.message || "Failed to delete campaign"),
  })

  const handleCreateCampaign = () => {
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name")
      return
    }
    createMutation.mutate()
  }

  const handleToggleStatus = (campaign: any) => {
    const nextStatus = campaign.status === "active" ? "paused" : "active"
    statusMutation.mutate({ id: campaign.id, status: nextStatus })
  }

  const handleDelete = (campaignId: string) => {
    if (!window.confirm("Delete this campaign?")) return
    deleteMutation.mutate(campaignId)
  }

  const campaigns = campaignsQuery.data ?? []
  const loadingCampaigns = campaignsQuery.isLoading || campaignsQuery.isFetching

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700"
      case "paused":
        return "bg-yellow-100 text-yellow-700"
      case "completed":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div>
      <Header title="AI & Automation" description="Manage AI campaigns and automation settings" />

      <div className="p-8 space-y-6">
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">Create New Campaign</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Campaign Name</label>
              <Input
                placeholder="e.g., Summer Engagement Boost"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Campaign Type</label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm"
              >
                <option value="engagement">Engagement Booster</option>
                <option value="posts">Content Seeding</option>
                <option value="comments">Comment Catalyst</option>
              </select>
            </div>
            <Button onClick={handleCreateCampaign} disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Active Campaigns</h2>
          {loadingCampaigns ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-white p-6">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-4 w-64" />
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-sm text-muted-foreground">No campaigns yet.</div>
          ) : (
            campaigns.map((campaign: any) => (
              <div key={campaign.id} className="rounded-lg border border-border bg-white p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{campaign.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Type: {getTypeLabel(campaign.type)} | Started {campaign.startedAt}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(campaign.status)}`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Interactions</p>
                    <p className="text-2xl font-bold text-primary">{campaign.interactions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reach</p>
                    <p className="text-2xl font-bold text-primary">{campaign.reach.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleToggleStatus(campaign)} disabled={statusMutation.isPending}>
                    {campaign.status === "active" ? (
                      <Pause className="mr-1 h-4 w-4" />
                    ) : (
                      <Play className="mr-1 h-4 w-4" />
                    )}
                    {campaign.status === "active" ? "Pause" : "Start"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(campaign.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
