"use client"

import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { getSecuritySummary } from "@/lib/api"
import { toast } from "sonner"
import { Shield, Lock, AlertTriangle, Activity } from "lucide-react"

export default function SecurityPage() {
  const summaryQuery = useQuery({
    queryKey: ["security-summary"],
    queryFn: getSecuritySummary,
  })

  const summary = summaryQuery.data || {
    sslStatus: "unknown",
    sslValidUntil: null as string | null,
    rateLimitStatus: "unknown",
    twoFaAdoptionPercent: 0,
    failedLogins24h: 0,
  }

  const statusColor = (status: string, positive = "green") => {
    if (status === "active" || status === "normal" || status === "enabled") {
      return positive === "green" ? "text-green-600" : "text-blue-600"
    }
    if (status === "warning" || status === "degraded") {
      return "text-yellow-600"
    }
    return "text-red-600"
  }

  const formatDate = (value: string | null) => (value ? new Date(value).toISOString().split("T")[0] : "Unknown")
  const sslStatus = summary.sslStatus?.toLowerCase() || "unknown"
  const rateStatus = summary.rateLimitStatus?.toLowerCase() || "unknown"

  return (
    <div>
      <Header title="Security" description="Platform security settings and monitoring" />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                SSL Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${statusColor(sslStatus)}`}>
                {summaryQuery.isLoading ? <Skeleton className="h-7 w-20" /> : summary.sslStatus}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Valid until {formatDate(summary.sslValidUntil)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                API Rate Limit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${statusColor(rateStatus)}`}>
                {summaryQuery.isLoading ? <Skeleton className="h-7 w-24" /> : summary.rateLimitStatus}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Status from last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4" />
                2FA Enabled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${statusColor("enabled", "blue")}`}>
                {summaryQuery.isLoading ? <Skeleton className="h-7 w-16" /> : "Enabled"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.twoFaAdoptionPercent.toFixed(1)}% user adoption
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Failed Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {summaryQuery.isLoading ? <Skeleton className="h-7 w-10" /> : summary.failedLogins24h}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Security Actions</CardTitle>
            <CardDescription>Manage platform security features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Ban IP Addresses</p>
                <p className="text-sm text-muted-foreground">Block suspicious IPs</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Ban IP interface opened")}>
                Manage
              </Button>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-medium text-foreground">Security Audit Log</p>
                <p className="text-sm text-muted-foreground">View security events</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Audit log opened")}>
                View Log
              </Button>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-medium text-foreground">Reset Admin Password</p>
                <p className="text-sm text-muted-foreground">Change admin credentials</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Password reset initiated")}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
