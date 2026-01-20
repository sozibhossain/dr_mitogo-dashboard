"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  getVerificationRequests,
  getVerificationStats,
  updateVerificationRequest,
  getVerificationRequestDetails,
} from "@/lib/api"
import { toast } from "sonner"
import { CheckCircle, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/skeleton"

type RequestsResponse = Awaited<ReturnType<typeof getVerificationRequests>>
type StatsResponse = Awaited<ReturnType<typeof getVerificationStats>>

export default function VerificationPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const requestsQuery = useQuery<RequestsResponse>({
    queryKey: ["verification-requests"],
    queryFn: () => getVerificationRequests(),
  })

  const statsQuery = useQuery<StatsResponse>({
    queryKey: ["verification-stats"],
    queryFn: getVerificationStats,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "approved" | "rejected"; reason?: string }) =>
      updateVerificationRequest({ id, status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-requests"] })
      queryClient.invalidateQueries({ queryKey: ["verification-stats"] })
      setSelected(null)
    },
    onError: (error: any) => toast.error(error?.message || "Failed to update verification"),
  })

  const handleApprove = (id: string) => {
    updateMutation.mutate({ id, status: "approved" })
    toast.success("Verification approved")
  }

  const handleReject = (id: string) => {
    const reason = window.prompt("Reason for rejection")
    if (!reason?.trim()) {
      toast.error("Rejection reason is required")
      return
    }
    updateMutation.mutate({ id, status: "rejected", reason: reason.trim() })
    toast.success("Verification rejected")
  }

  const statusLabel = (status: string) => {
    if (!status) return "Pending"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const openDetails = async (request: any) => {
    setSelected(request)
    if (!request.documents?.id_front && !request.documents?.id_back && !request.documents?.selfie) {
      setDetailLoading(true)
      try {
        const details = await getVerificationRequestDetails(request.id)
        setSelected({
          ...request,
          documents: { id_front: details.id_front, id_back: details.id_back, selfie: details.selfie },
        })
      } catch (error: any) {
        toast.error(error.message || "Failed to load documents")
      } finally {
        setDetailLoading(false)
      }
    }
  }

  const requests = requestsQuery.data ?? []
  const stats = statsQuery.data || { pending: 0, approved30d: 0, rejected30d: 0 }

  return (
    <div>
      <Header title="Verification Requests" description="Process user verification applications" />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-white p-6">
            <p className="text-sm text-muted-foreground">Pending Requests</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {statsQuery.isLoading ? <Skeleton className="h-8 w-14" /> : stats.pending}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-6">
            <p className="text-sm text-muted-foreground">Approved (30d)</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {statsQuery.isLoading ? <Skeleton className="h-8 w-14" /> : stats.approved30d}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-6">
            <p className="text-sm text-muted-foreground">Rejected (30d)</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {statsQuery.isLoading ? <Skeleton className="h-8 w-14" /> : stats.rejected30d}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {requestsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-sm text-muted-foreground">No verification requests.</div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{request.displayName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{request.email}</p>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>Type: {request.type}</span>
                      <span>Submitted: {request.submittedAt}</span>
                      <span>Status: {statusLabel(request.status)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDetails(request)}>
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={request.status === "approved" || updateMutation.isPending}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={request.status === "rejected" || updateMutation.isPending}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => (open ? null : setSelected(null))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Verification Documents</DialogTitle>
            <DialogDescription>Review submitted evidence before approval.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{selected.displayName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{selected.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium text-foreground">{selected.submittedAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground">{statusLabel(selected.status)}</p>
                </div>
              </div>

              {detailLoading ? (
                <p className="text-muted-foreground">Loading documents...</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {selected.documents?.id_front && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Front ID</p>
                      <img src={selected.documents.id_front} alt="Front ID" className="rounded border border-border" />
                    </div>
                  )}
                  {selected.documents?.id_back && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Back ID</p>
                      <img src={selected.documents.id_back} alt="Back ID" className="rounded border border-border" />
                    </div>
                  )}
                  {selected.documents?.selfie && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Selfie</p>
                      <img src={selected.documents.selfie} alt="Selfie" className="rounded border border-border" />
                    </div>
                  )}
                  {!selected.documents?.id_front && !selected.documents?.id_back && !selected.documents?.selfie ? (
                    <p className="col-span-3 text-muted-foreground">No documents attached.</p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selected.id)}
                  disabled={selected.status === "approved" || updateMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(selected.id)}
                  disabled={selected.status === "rejected" || updateMutation.isPending}
                >
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
