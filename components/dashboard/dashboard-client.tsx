"use client";

import Link from "next/link";
import { CalendarClock, CircleDollarSign, Users2, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import { emptyInvoiceForm, invoiceToForm } from "@/components/invoices/helpers";
import type { Client, Gig, Invoice, InvoiceFormState } from "@/components/invoices/types";

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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function invoiceStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20";
  if (normalized === "sent") return "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/20";
  if (normalized === "overdue") return "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20";
  if (normalized === "void") return "bg-slate-400/15 text-slate-200 ring-1 ring-slate-300/10";
  return "bg-white/10 text-slate-100 ring-1 ring-white/10";
}

function kpiCard(
  label: string,
  value: string | number,
  detail: string,
  Icon: ComponentType<{ className?: string }>
) {
  return (
    <div className="dashboard-panel rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-[var(--dashboard-accent)]" />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceModalMode, setInvoiceModalMode] = useState<"create" | "view" | "edit">("view");
  const [invoiceModalSaving, setInvoiceModalSaving] = useState(false);
  const [invoiceModalId, setInvoiceModalId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(emptyInvoiceForm());
  const [invoiceClients, setInvoiceClients] = useState<Client[]>([]);
  const [invoiceGigs, setInvoiceGigs] = useState<Gig[]>([]);
  const [handledNewInvoiceQuery, setHandledNewInvoiceQuery] = useState(false);

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

  const kpis = data?.kpis ?? {
    total_earned_ytd_cents: 0,
    outstanding_cents: 0,
    upcoming_gigs_count: 0,
    active_clients_count: 0
  };
  const recentInvoices = data?.recent_invoices ?? [];
  const upcomingGigs = data?.upcoming_gigs ?? [];
  const followUpsNeeded = recentInvoices.filter((invoice) => !["paid", "void"].includes(invoice.status.toLowerCase())).length;

  async function loadInvoiceSupportData() {
    const [clientsRes, gigsRes] = await Promise.all([fetch("/api/clients", { cache: "no-store" }), fetch("/api/gigs", { cache: "no-store" })]);
    const [clientsJson, gigsJson] = await Promise.all([clientsRes.json(), gigsRes.json()]);
    setInvoiceClients(clientsJson.data ?? []);
    setInvoiceGigs((gigsJson.data ?? []).map((gig: Gig & { clients?: Client | null }) => ({ id: gig.id, title: gig.title, event_date: gig.event_date })));
  }

  useEffect(() => {
    const shouldOpenCreate = searchParams.get("newInvoice") === "1";
    if (!shouldOpenCreate) {
      if (handledNewInvoiceQuery) setHandledNewInvoiceQuery(false);
      return;
    }
    if (handledNewInvoiceQuery) return;

    void (async () => {
      await loadInvoiceSupportData();
      setInvoiceModalId(null);
      setInvoiceForm(emptyInvoiceForm());
      setInvoiceModalMode("create");
      setInvoiceModalOpen(true);
      setHandledNewInvoiceQuery(true);
    })();
  }, [handledNewInvoiceQuery, searchParams]);

  async function openInvoiceModal(invoiceId: string) {
    setError(null);

    const [invoicesRes, clientsRes, gigsRes] = await Promise.all([
      fetch("/api/invoices", { cache: "no-store" }),
      fetch("/api/clients", { cache: "no-store" }),
      fetch("/api/gigs", { cache: "no-store" })
    ]);

    const [invoicesJson, clientsJson, gigsJson] = await Promise.all([invoicesRes.json(), clientsRes.json(), gigsRes.json()]);

    if (!invoicesRes.ok) {
      setError(invoicesJson.error?.message ?? "Failed to load invoice.");
      return;
    }

    const matchedInvoice = (invoicesJson.data ?? []).find((invoice: Invoice) => invoice.id === invoiceId) as Invoice | undefined;
    if (!matchedInvoice) {
      setError("Invoice not found.");
      return;
    }

    setInvoiceClients(clientsJson.data ?? []);
    setInvoiceGigs((gigsJson.data ?? []).map((gig: Gig & { clients?: Client | null }) => ({ id: gig.id, title: gig.title, event_date: gig.event_date })));
    setInvoiceModalId(matchedInvoice.id);
    setInvoiceForm(invoiceToForm(matchedInvoice));
    setInvoiceModalMode("view");
    setInvoiceModalOpen(true);
  }

  async function saveInvoiceFromDashboard() {
    setInvoiceModalSaving(true);
    setError(null);

    const payload = {
      client_id: invoiceForm.client_id || null,
      gig_id: invoiceForm.gig_id || null,
      invoice_number: invoiceForm.invoice_number,
      issue_date: invoiceForm.issue_date || undefined,
      due_date: invoiceForm.due_date || null,
      notes: invoiceForm.notes || null,
      line_items: invoiceForm.line_items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        service_date: item.service_date || null,
        sort_order: index
      })),
      tax_cents: 0
    };

    const isEdit = Boolean(invoiceModalId) && invoiceModalMode === "edit";
    const endpoint = isEdit ? `/api/invoices/${invoiceModalId}` : "/api/invoices";
    const method = isEdit ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await response.json();

    if (!response.ok) {
      setError(json.error?.message ?? "Failed to save invoice.");
      setInvoiceModalSaving(false);
      return;
    }

    const savedInvoice = json.data as Invoice;
    setInvoiceModalId(savedInvoice.id);
    setInvoiceForm(invoiceToForm(savedInvoice));
    setInvoiceModalMode("view");
    setInvoiceModalSaving(false);
    await loadDashboard();
  }

  return (
    <div className="space-y-6 text-slate-100">
      {error ? (
        <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCard("Earned YTD", formatCurrency(kpis.total_earned_ytd_cents), "Settled payments recorded this year.", CircleDollarSign)}
        {kpiCard("Outstanding", formatCurrency(kpis.outstanding_cents), `${followUpsNeeded} invoices still need attention.`, WalletCards)}
        {kpiCard("Upcoming gigs", kpis.upcoming_gigs_count, "Booked dates coming up next.", CalendarClock)}
        {kpiCard("Active clients", kpis.active_clients_count, "Current client relationships in play.", Users2)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="dashboard-panel rounded-[28px] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">Recent invoices</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Latest billing activity</h3>
            </div>
            <Link href="/invoices" className="text-sm text-[var(--dashboard-accent)] transition hover:text-white">
              View all
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[22px] border border-white/10 bg-white/5">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="cursor-pointer border-t border-white/5 text-slate-200 transition hover:bg-white/5"
                    onClick={() => void openInvoiceModal(invoice.id)}
                  >
                    <td className="px-4 py-3 font-medium text-white">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-slate-300">{invoice.clients?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(invoice.due_date)}</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(invoice.total_cents)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${invoiceStatusClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No invoices yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="dashboard-panel rounded-[28px] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">Quick actions</p>
            <div className="mt-5 space-y-3">
              <Link
                href="/dashboard?newInvoice=1"
                className="block rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                New invoice
              </Link>
              <Link
                href="/gigs"
                className="block rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Add gig
              </Link>
              <Link
                href="/clients"
                className="block rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Add client
              </Link>
            </div>
          </section>

          <section className="dashboard-accent-glow rounded-[28px] bg-[linear-gradient(180deg,#74f7df_0%,#43e0c4_100%)] p-6 text-slate-950">
            <p className="text-xs uppercase tracking-[0.24em]">Outstanding balance</p>
            <p className="mt-4 text-4xl font-semibold tracking-tight">{formatCurrency(kpis.outstanding_cents)}</p>
            <p className="mt-3 text-sm text-slate-800/80">Use this as the follow-up queue for the week.</p>
          </section>
        </aside>
      </div>

      <section className="dashboard-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">Upcoming gigs</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">What is coming up next</h3>
          </div>
          <Link href="/gigs" className="text-sm text-[var(--dashboard-accent)] transition hover:text-white">
            View all
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcomingGigs.map((gig) => (
            <div key={gig.id} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-medium text-white">{gig.location || gig.title || "Gig"}</p>
                  <p className="mt-1 text-sm text-slate-400">{gig.clients?.name ?? "No client"}</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">{gig.status}</span>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                <p>{formatDate(gig.event_date)}</p>
                <p className="text-white">{formatCurrency(gig.rate_cents)}</p>
              </div>
            </div>
          ))}
          {!loading && upcomingGigs.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400 md:col-span-2 xl:col-span-3">
              No upcoming gigs.
            </div>
          ) : null}
        </div>
      </section>

      <InvoiceFormModal
        mode={invoiceModalMode}
        open={invoiceModalOpen}
        title={invoiceModalMode === "create" ? "New Invoice" : invoiceModalMode === "edit" ? "Edit Invoice" : "View Invoice"}
        form={invoiceForm}
        clients={invoiceClients}
        gigs={invoiceGigs}
        loading={invoiceModalSaving}
        onClose={() => {
          setInvoiceModalOpen(false);
          setInvoiceModalMode("view");
          setInvoiceModalId(null);
          if (searchParams.get("newInvoice")) {
            setHandledNewInvoiceQuery(true);
            router.replace("/dashboard");
          }
        }}
        onChange={setInvoiceForm}
        onSubmit={() => void saveInvoiceFromDashboard()}
        onRequestEdit={() => setInvoiceModalMode("edit")}
      />
    </div>
  );
}
