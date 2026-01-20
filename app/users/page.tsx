"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableSkeleton } from "@/components/skeleton"
import { getUserProfile, getUsers, updateUserStatus } from "@/lib/api"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Search, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type UsersResponse = Awaited<ReturnType<typeof getUsers>>

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const pageSize = 10

  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  const usersQuery = useQuery<UsersResponse>({
    queryKey: ["users", { page, pageSize, searchTerm, statusFilter }],
    queryFn: () => getUsers(page, pageSize, searchTerm, statusFilter),
    keepPreviousData: true,
  })

  const users = usersQuery.data?.users ?? []
  const total = usersQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const profileQuery = useQuery({
    queryKey: ["user-profile", selectedUser?.id],
    queryFn: () => getUserProfile(selectedUser?.id || ""),
    enabled: !!selectedUser,
  })

  const detailLoading = profileQuery.isLoading || profileQuery.isFetching
  const selectedUserProfile = profileQuery.data || selectedUser

  const statusMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: string }) =>
      updateUserStatus(userId, { action }),
    onSuccess: (_, variables) => {
      toast.success("User updated")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["user-profile", variables.userId] })
      setSelectedUser((prev) =>
        prev && prev.id === variables.userId
          ? {
              ...prev,
              verified: variables.action === "verify" ? true : variables.action === "unverify" ? false : prev.verified,
            }
          : prev
      )
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update user")
    },
  })

  const handleExport = () => {
    const csv = [
      ["Username", "Email", "Status", "Posts", "Comments", "Verified", "Join Date"],
      ...users.map((u) => [
        u.username,
        u.email,
        u.status,
        u.postsCount,
        u.commentsCount,
        u.verified ? "Yes" : "No",
        u.joinDate,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    toast.success("Users exported successfully")
  }

  const openManageUser = (user: any) => {
    setSelectedUser(user)
  }

  const handleCloseDialog = () => {
    setSelectedUser(null)
    queryClient.removeQueries({ queryKey: ["user-profile"] })
  }

  const applyStatusLocally = (action: string) => {
    const deriveStatus = (current: string) => {
      if (action === "ban" || action === "suspend") return "suspended"
      if (action === "restrict") return "inactive"
      if (["unban", "unsuspend", "unrestrict"].includes(action)) return "active"
      return current
    }

    queryClient.setQueriesData<UsersResponse>({ queryKey: ["users"] }, (existing) => {
      if (!existing) return existing
      return {
        ...existing,
        users: existing.users.map((user) =>
          user.id === selectedUser?.id
            ? {
                ...user,
                status: deriveStatus(user.status),
                verified: action === "verify" ? true : action === "unverify" ? false : user.verified,
              }
            : user
        ),
      }
    })

    setSelectedUser((prev) =>
      prev
        ? {
            ...prev,
            status: deriveStatus(prev.status),
            verified: action === "verify" ? true : action === "unverify" ? false : prev.verified,
          }
        : prev
    )
  }

  const handleUserAction = (action: string) => {
    if (!selectedUser) return
    statusMutation.mutate(
      { userId: selectedUser.id, action },
      {
        onSuccess: () => applyStatusLocally(action),
      }
    )
  }

  const paginationLabel = useMemo(
    () =>
      `Showing ${Math.min((page - 1) * pageSize + 1, total)} to ${Math.min(page * pageSize, total)} of ${total} users`,
    [page, pageSize, total]
  )

  return (
    <div>
      <Header title="User Management" description="Manage and view all platform users" />

      <div className="p-8 space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-foreground">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Username</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Posts</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Comments</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Verified</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">School</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Work</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Ghost Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Join Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usersQuery.isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-6">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-6 text-sm text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{user.username}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.phoneNumber || "-"}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            user.status === "active"
                              ? "bg-green-100 text-green-700"
                              : user.status === "inactive"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{user.postsCount}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{user.commentsCount}</td>
                      <td className="px-6 py-4 text-sm">{user.verified ? "Yes" : "-"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.education || "-"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.work || "-"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.anonymousId || "-"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.joinDate}</td>
                      <td className="px-6 py-4 text-sm">
                        <Button size="sm" variant="ghost" onClick={() => openManageUser(user)}>
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

      <Dialog open={!!selectedUser} onOpenChange={(open) => (open ? null : handleCloseDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Manage account status and flags.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          ) : selectedUser ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Username</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.phoneNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Verified</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.verified ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ghost Name</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.anonymousId || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">School</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.education || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Work</p>
                  <p className="font-medium text-foreground">{selectedUserProfile?.work || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Posts</p>
                  <p className="font-medium text-foreground">{selectedUser.postsCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Comments</p>
                  <p className="font-medium text-foreground">{selectedUser.commentsCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium text-foreground">{selectedUser.joinDate}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => handleUserAction(selectedUser.verified ? "unverify" : "verify")} disabled={statusMutation.isPending}>
                  {selectedUser.verified ? "Remove verification" : "Verify user"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUserAction("ban")} disabled={statusMutation.isPending}>
                  Ban account
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUserAction("unban")} disabled={statusMutation.isPending}>
                  Lift ban
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUserAction("restrict")} disabled={statusMutation.isPending}>
                  Restrict account
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUserAction("unrestrict")} disabled={statusMutation.isPending}>
                  Lift restriction
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUserAction("suspend")} disabled={statusMutation.isPending}>
                  Suspend
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleUserAction("unsuspend")} disabled={statusMutation.isPending}>
                  Resume
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
