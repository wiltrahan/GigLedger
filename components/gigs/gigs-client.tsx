"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Gig = {
  id: string;
  client_id?: string | null;
  title: string;
  event_date?: string | null;
  status: "lead" | "booked" | "completed" | "cancelled";
  location?: string | null;
  rate_cents: number;
  clients?: { id: string; name: string } | null;
};

type Client = {
  id: string;
  name: string;
};

type Invoice = {
  id: string;
  gig_id?: string | null;
  invoice_number: string;
  status: string;
};

type Tab = "upcoming" | "past";

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const stamp = String(now.getTime()).slice(-5);
  return `INV-${y}${mm}${dd}-${stamp}`;
}

function statusClass(status: Gig["status"]) {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "booked") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export function GigsClient() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newVenue, setNewVenue] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newClientId, setNewClientId] = useState("");

  const invoiceByGigId = useMemo(() => {
    const map = new Map<string, Invoice>();
    for (const invoice of invoices) {
      if (invoice.gig_id && !map.has(invoice.gig_id)) {
        map.set(invoice.gig_id, invoice);
      }
    }
    return map;
  }, [invoices]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [gigsRes, clientsRes, invoicesRes] = await Promise.all([
      fetch(`/api/gigs?filter=${tab}`, { cache: "no-store" }),
      fetch("/api/clients", { cache: "no-store" }),
      fetch("/api/invoices", { cache: "no-store" })
    ]);

    const [gigsJson, clientsJson, invoicesJson] = await Promise.all([gigsRes.json(), clientsRes.json(), invoicesRes.json()]);

    if (!gigsRes.ok) {
      setError(gigsJson.error?.message ?? "Failed to load gigs.");
      setLoading(false);
      return;
    }

    setGigs(gigsJson.data ?? []);
    setClients(clientsJson.data ?? []);
    setInvoices(invoicesJson.data ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function addGig() {
    setSaving(true);
    setError(null);

    const feeDollars = Number(newFee || "0");
    const feeCents = Math.round(feeDollars * 100);

    const payload = {
      title: newVenue.trim(),
      location: newVenue.trim(),
      event_date: newDate || null,
      rate_cents: feeCents,
      client_id: newClientId || null,
      status: "booked"
    };

    const response = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await response.json();
    if (!response.ok) {
      setError(json.error?.message ?? "Failed to add gig.");
      setSaving(false);
      return;
    }

    setShowAddModal(false);
    setNewVenue("");
    setNewDate("");
    setNewFee("");
    setNewClientId("");
    setSaving(false);
    await loadData();
  }

  async function createInvoiceFromGig(gig: Gig) {
    if (!gig.event_date) {
      setError("Gig must have an event date to create an invoice.");
      return;
    }

    const existing = invoiceByGigId.get(gig.id);
    if (existing) {
      setError(`Gig already linked to invoice ${existing.invoice_number}.`);
      return;
    }

    setSaving(true);
    setError(null);

    const venue = gig.location || gig.title;
    const payload = {
      client_id: gig.client_id ?? null,
      gig_id: gig.id,
      invoice_number: generateInvoiceNumber(),
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      notes: null,
      tax_cents: 0,
      line_items: [
        {
          description: `DJ performance on ${gig.event_date} at ${venue}`,
          quantity: 1,
          unit_price_cents: gig.rate_cents,
          service_date: gig.event_date,
          sort_order: 0
        }
      ]
    };

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await response.json();
    if (!response.ok) {
      setError(json.error?.message ?? "Failed to create invoice from gig.");
      setSaving(false);
      return;
    }

    setSaving(false);
    await loadData();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Gigs</CardTitle>
          <Button onClick={() => setShowAddModal(true)}>Add Gig</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={tab === "upcoming" ? "default" : "outline"} onClick={() => setTab("upcoming")}>
              Upcoming
            </Button>
            <Button variant={tab === "past" ? "default" : "outline"} onClick={() => setTab("past")}>
              Past
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading gigs...</p> : null}

          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Venue</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Fee</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Linked Invoice</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gigs.map((gig) => {
                  const linked = invoiceByGigId.get(gig.id);

                  return (
                    <tr key={gig.id} className="border-t">
                      <td className="px-4 py-2">{formatDate(gig.event_date)}</td>
                      <td className="px-4 py-2">{gig.location || gig.title || "-"}</td>
                      <td className="px-4 py-2">{gig.clients?.name ?? "-"}</td>
                      <td className="px-4 py-2">{formatCurrency(gig.rate_cents)}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(gig.status)}`}>{gig.status.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-2">{linked ? `${linked.invoice_number} (${linked.status})` : "-"}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={saving || Boolean(linked)} onClick={() => void createInvoiceFromGig(gig)}>
                            Create Invoice from Gig
                          </Button>
                          {linked ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/invoices?invoice=${encodeURIComponent(linked.invoice_number)}`}>Open Invoice</Link>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && gigs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={7}>
                      No gigs in this tab yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add Gig</CardTitle>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Venue</span>
                <Input value={newVenue} onChange={(event) => setNewVenue(event.target.value)} placeholder="Neon Nights" />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Date</span>
                <Input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Fee ($)</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newFee}
                  onChange={(event) => setNewFee(event.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="450.00"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Client (optional)</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={newClientId}
                  onChange={(event) => setNewClientId(event.target.value)}
                >
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button disabled={saving || !newVenue.trim() || !newDate || !newFee} onClick={() => void addGig()}>
                  {saving ? "Saving..." : "Add Gig"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
