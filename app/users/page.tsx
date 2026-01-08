"use client"

import { useEffect, useState } from "react"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableSkeleton } from "@/components/skeleton"
import { getUsers } from "@/lib/api"
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

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const pageSize = 10

  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    setLoading(true)
    getUsers(page, pageSize, searchTerm, statusFilter)
      .then((data) => {
        setUsers(data.users)
        setTotal(data.total)
      })
      .catch((error) => {
        toast.error(error.message || "Failed to load users")
      })
      .finally(() => setLoading(false))
  }, [page, searchTerm, statusFilter])

  const totalPages = Math.ceil(total / pageSize)

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

  return (
    <div>
      <Header title="User Management" description="Manage and view all platform users" />

      <div className="p-8 space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Username</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Posts</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Comments</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Verified</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Join Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-6">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{user.username}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.joinDate}</td>
                      <td className="px-6 py-4 text-sm">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedUser(user)}>
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
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} users
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || totalPages === 0}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4" />
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
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => (open ? null : setSelectedUser(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View account information and activity.</DialogDescription>
          </DialogHeader>
          {selectedUser ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Username</p>
                  <p className="font-medium text-foreground">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground">{selectedUser.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Verified</p>
                  <p className="font-medium text-foreground">{selectedUser.verified ? "Yes" : "No"}</p>
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
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
