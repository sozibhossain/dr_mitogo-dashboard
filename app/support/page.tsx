"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/skeleton"
import { getSupportTickets, updateSupportTicketStatus } from "@/lib/api"
import { toast } from "sonner"
import { MessageSquare, CheckCircle, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TicketsResponse = Awaited<ReturnType<typeof getSupportTickets>>

export default function SupportPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [form, setForm] = useState({ status: "open", priority: "medium" })

  const pageSize = 10

  const ticketsQuery = useQuery<TicketsResponse>({
    queryKey: ["support-tickets", { page, pageSize }],
    queryFn: () => getSupportTickets(page, pageSize),
    keepPreviousData: true,
  })

  const tickets = ticketsQuery.data?.tickets ?? []
  const total = ticketsQuery.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status?: string; priority?: string }) =>
      updateSupportTicketStatus({ ticketId: payload.id, status: payload.status, priority: payload.priority }),
    onSuccess: () => {
      toast.success("Ticket updated")
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
      setSelectedTicket(null)
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update ticket"),
  })

  const handleResolve = (id: string) => {
    updateMutation.mutate({ id, status: "resolved" })
  }

  const openDetails = (ticket: any) => {
    setSelectedTicket(ticket)
    setForm({
      status: ticket.status || "open",
      priority: ticket.priority || "medium",
    })
  }

  const handleSave = () => {
    if (!selectedTicket) return
    updateMutation.mutate({ id: selectedTicket.id, status: form.status, priority: form.priority })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-primary/10 text-primary"
      case "medium":
        return "bg-yellow-100 text-yellow-700"
      case "low":
        return "bg-blue-100 text-blue-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <MessageSquare className="mr-1 h-4 w-4" />
      case "in_progress":
        return <Clock className="mr-1 h-4 w-4" />
      case "resolved":
        return <CheckCircle className="mr-1 h-4 w-4" />
      default:
        return null
    }
  }

  const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const paginationLabel = useMemo(
    () =>
      `Showing ${Math.min((page - 1) * pageSize + 1, total)} to ${Math.min(page * pageSize, total)} of ${total} tickets`,
    [page, pageSize, total]
  )

  return (
    <div>
      <Header title="Support Tickets" description="Manage customer support requests" />

      <div className="p-8 space-y-6">
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Subject</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Priority</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ticketsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6">
                      <TableSkeleton />
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6">
                      <div className="text-sm text-muted-foreground">No tickets found.</div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket: any) => (
                    <tr key={ticket.id} className="transition-colors hover:bg-secondary/30">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{ticket.subject}</td>
                      <td className="px-6 py-4 text-sm text-primary">{ticket.user}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="flex items-center text-foreground">
                          {getStatusIcon(ticket.status)}
                          {formatStatus(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{ticket.createdAt}</td>
                      <td className="flex gap-2 px-6 py-4 text-sm">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(ticket)}>
                          View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleResolve(ticket.id)} disabled={updateMutation.isPending}>
                          Resolve
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
              Prev
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => (open ? null : setSelectedTicket(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>Review and update ticket status.</DialogDescription>
          </DialogHeader>
          {selectedTicket ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Subject</p>
                <p className="font-medium text-foreground">{selectedTicket.subject}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User</p>
                <p className="font-medium text-foreground">{selectedTicket.user}</p>
              </div>
              {selectedTicket.description ? (
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap font-medium text-foreground">{selectedTicket.description}</p>
                </div>
              ) : null}
              {selectedTicket.attachments?.length ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Attachments</p>
                  <div className="space-y-1">
                    {selectedTicket.attachments.map((file: string, idx: number) => (
                      <a key={idx} href={file} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                        Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>
              Close
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
