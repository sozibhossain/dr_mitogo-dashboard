"use client"

import { useEffect, useState } from "react"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
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

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ status: "open", priority: "medium" })

  const pageSize = 10

  const loadTickets = () => {
    setLoading(true)
    getSupportTickets(page, pageSize)
      .then((data) => {
        setTickets(data.tickets)
        setTotal(data.total)
      })
      .catch((error) => toast.error(error.message || "Failed to load tickets"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTickets()
  }, [page])

  const handleResolve = async (id: string) => {
    try {
      await updateSupportTicketStatus({ ticketId: id, status: "resolved" })
      toast.success("Ticket resolved")
      loadTickets()
    } catch (error: any) {
      toast.error(error.message || "Failed to update ticket")
    }
  }

  const openDetails = (ticket: any) => {
    setSelectedTicket(ticket)
    setForm({
      status: ticket.status || "open",
      priority: ticket.priority || "medium",
    })
  }

  const handleSave = async () => {
    if (!selectedTicket) return
    setSaving(true)
    try {
      await updateSupportTicketStatus({
        ticketId: selectedTicket.id,
        status: form.status,
        priority: form.priority,
      })
      toast.success("Ticket updated")
      setSelectedTicket(null)
      loadTickets()
    } catch (error: any) {
      toast.error(error.message || "Failed to update ticket")
    } finally {
      setSaving(false)
    }
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
        return <MessageSquare className="w-4 h-4 mr-1" />
      case "in_progress":
        return <Clock className="w-4 h-4 mr-1" />
      case "resolved":
        return <CheckCircle className="w-4 h-4 mr-1" />
      default:
        return null
    }
  }

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <Header title="Support Tickets" description="Manage customer support requests" />

      <div className="p-8 space-y-6">
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6">
                      <div className="text-sm text-muted-foreground">Loading tickets...</div>
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
                    <tr key={ticket.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{ticket.subject}</td>
                      <td className="px-6 py-4 text-sm text-primary">{ticket.user}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="flex items-center text-foreground">
                          {getStatusIcon(ticket.status)}
                          {formatStatus(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                        >
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{ticket.createdAt}</td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(ticket)}>
                          View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleResolve(ticket.id)}>
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
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} tickets
          </p>
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
                  <p className="font-medium text-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
              ) : null}
              {selectedTicket.attachments?.length ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Attachments</p>
                  <div className="space-y-1">
                    {selectedTicket.attachments.map((file: string, idx: number) => (
                      <a key={idx} href={file} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                        Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg text-sm"
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
