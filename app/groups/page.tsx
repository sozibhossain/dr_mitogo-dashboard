"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableSkeleton } from "@/components/skeleton"
import { getGroups, getGroupDetails, updateGroup, deleteGroup } from "@/lib/api"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type GroupsResponse = Awaited<ReturnType<typeof getGroups>>

export default function GroupsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [manageOpen, setManageOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    visibility: "public",
    isVerified: false,
  })

  const pageSize = 10

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const groupsQuery = useQuery<GroupsResponse>({
    queryKey: ["groups", { page, pageSize, searchTerm }],
    queryFn: () => getGroups(page, pageSize, searchTerm),
    keepPreviousData: true,
  })

  const groups = groupsQuery.data?.groups ?? []
  const total = groupsQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const detailQuery = useQuery({
    queryKey: ["group-detail", selectedGroupId],
    queryFn: () => getGroupDetails(selectedGroupId || ""),
    enabled: !!selectedGroupId,
  })

  useEffect(() => {
    if (detailQuery.data) {
      const group = detailQuery.data
      setForm({
        name: group.name || "",
        description: group.description || "",
        visibility: group.visibility || "public",
        isVerified: !!group.isVerified,
      })
    }
  }, [detailQuery.data])

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) => updateGroup(payload.id, payload.data),
    onSuccess: () => {
      toast.success("Group updated")
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["group-detail", selectedGroupId || ""] })
      closeManage()
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update group"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      toast.success("Group deleted")
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      closeManage()
    },
    onError: (error: any) => toast.error(error?.message || "Failed to delete group"),
  })

  const openManage = (groupId: string) => {
    setManageOpen(true)
    setSelectedGroupId(groupId)
  }

  const closeManage = () => {
    setManageOpen(false)
    setSelectedGroupId(null)
    setForm({
      name: "",
      description: "",
      visibility: "public",
      isVerified: false,
    })
  }

  const handleSave = () => {
    if (!selectedGroupId) return
    if (!form.name.trim()) {
      toast.error("Group name is required")
      return
    }
    updateMutation.mutate({
      id: selectedGroupId,
      data: {
        name: form.name.trim(),
        description: form.description,
        visibility: form.visibility,
        isVerified: form.isVerified,
      },
    })
  }

  const handleDelete = () => {
    if (!selectedGroupId) return
    if (!window.confirm("Delete this group?")) return
    deleteMutation.mutate(selectedGroupId)
  }

  const paginationLabel = useMemo(
    () =>
      `Showing ${Math.min((page - 1) * pageSize + 1, total)} to ${Math.min(page * pageSize, total)} of ${total} groups`,
    [page, pageSize, total]
  )

  return (
    <div>
      <Header title="Group Management" description="Manage groups and communities" />

      <div className="p-8 space-y-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-foreground">Search Groups</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Members</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Posts</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Verified</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groupsQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-sm text-muted-foreground">
                      No groups found.
                    </td>
                  </tr>
                ) : (
                  groups.map((group: any) => (
                    <tr key={group.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{group.name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{group.description}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{group.members.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{group.posts.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">{group.verified ? "Yes" : "-"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{group.createdAt}</td>
                      <td className="px-6 py-4 text-sm">
                        <Button size="sm" variant="ghost" onClick={() => openManage(group.id)}>
                          Manage
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

      <Dialog open={manageOpen} onOpenChange={(open) => (open ? null : closeManage())}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Group</DialogTitle>
            <DialogDescription>Review details and update group settings.</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading details...</div>
          ) : detailQuery.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Members</p>
                  <p className="font-medium text-foreground">{detailQuery.data.members}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Posts</p>
                  <p className="font-medium text-foreground">{detailQuery.data.posts}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium text-foreground">{detailQuery.data.createdAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium text-foreground">{detailQuery.data.updatedAt}</p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Name</label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="min-h-24 w-full rounded-lg border border-border px-4 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Visibility</label>
                  <select
                    value={form.visibility}
                    onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="secret">Secret</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Verified</label>
                  <select
                    value={form.isVerified ? "yes" : "no"}
                    onChange={(event) => setForm((prev) => ({ ...prev, isVerified: event.target.value === "yes" }))}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Group details unavailable.</div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeManage}>
              Close
            </Button>
            <Button variant="outline" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || detailQuery.isLoading}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
