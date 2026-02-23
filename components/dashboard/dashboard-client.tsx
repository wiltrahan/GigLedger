"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardPayload = {
  kpis: {
    total_earned_ytd_cents: number;
    outstanding_cents: number;
    upcoming_gigs_count: number;
    active_clients_count: number;
  };
  upcoming_gigs: Array<{
    id: string;
    title: string;
    location?: string | null;
    event_date?: string | null;
    status: string;
    rate_cents: number;
    clients?: { id: string; name: string } | null;
  }>;
  recent_invoices: Array<{
    id: string;
    invoice_number: string;
    status: string;
    total_cents: number;
    issue_date?: string | null;
    due_date?: string | null;
    clients?: { id: string; name: string } | null;
  }>;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function invoiceStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "bg-emerald-100 text-emerald-700";
  if (normalized === "sent") return "bg-blue-100 text-blue-700";
  if (normalized === "overdue") return "bg-amber-100 text-amber-700";
  if (normalized === "void") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
    const json = (await response.json()) as ApiErrorResponse & { data?: DashboardPayload };

    if (!response.ok) {
      setError(json.error?.message ?? "Failed to load dashboard summary.");
      setLoading(false);
      return;
    }

    setData(json.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(data?.kpis.total_earned_ytd_cents ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(data?.kpis.outstanding_cents ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Gigs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data?.kpis.upcoming_gigs_count ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data?.kpis.active_clients_count ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Quick Actions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/invoices">New Invoice</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/gigs">Add Gig</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/clients">Add Client</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading dashboard...</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Recent Invoices</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Invoice #</th>
                    <th className="px-3 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent_invoices ?? []).map((invoice) => (
                    <tr key={invoice.id} className="border-t">
                      <td className="px-3 py-2">{invoice.invoice_number}</td>
                      <td className="px-3 py-2">{invoice.clients?.name ?? "-"}</td>
                      <td className="px-3 py-2">{formatCurrency(invoice.total_cents)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${invoiceStatusClass(invoice.status)}`}>{invoice.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                  {!loading && (data?.recent_invoices ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        No invoices yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Upcoming Gigs</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/gigs">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data?.upcoming_gigs ?? []).map((gig) => (
                <div key={gig.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{gig.location || gig.title || "Gig"}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(gig.rate_cents)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(gig.event_date)} • {gig.clients?.name ?? "No client"}</p>
                </div>
              ))}
              {!loading && (data?.upcoming_gigs ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No upcoming gigs.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
