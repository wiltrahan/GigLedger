"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import { MarkPaidModal } from "@/components/invoices/mark-paid-modal";
import { ShareLinkModal } from "@/components/invoices/share-link-modal";
import type { Client, Gig, Invoice, InvoiceFormState } from "@/components/invoices/types";
import { calcSubtotal, emptyInvoiceForm, formatCurrency, formatDate, getStatusClass, invoiceToForm } from "@/components/invoices/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FormMode = "create" | "edit" | "view";

export function InvoicesClient() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [search, setSearch] = useState(searchParams.get("invoice") ?? "");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(emptyInvoiceForm());

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [invoicesRes, clientsRes, gigsRes] = await Promise.all([
      fetch("/api/invoices", { cache: "no-store" }),
      fetch("/api/clients", { cache: "no-store" }),
      fetch("/api/gigs", { cache: "no-store" })
    ]);

    const [invoicesJson, clientsJson, gigsJson] = await Promise.all([invoicesRes.json(), clientsRes.json(), gigsRes.json()]);

    if (!invoicesRes.ok) {
      setError(invoicesJson.error?.message ?? "Failed to load invoices.");
      setLoading(false);
      return;
    }

    setInvoices(invoicesJson.data ?? []);
    setClients(clientsJson.data ?? []);
    setGigs((gigsJson.data ?? []).map((gig: Gig & { clients?: Client | null }) => ({ id: gig.id, title: gig.title, event_date: gig.event_date })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const invoiceQuery = searchParams.get("invoice") ?? "";
    setSearch(invoiceQuery);
  }, [searchParams]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (clientFilter !== "all" && invoice.client_id !== clientFilter) return false;
      if (search.trim()) {
        const target = search.trim().toLowerCase();
        if (!invoice.invoice_number.toLowerCase().includes(target)) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, clientFilter, search]);

  async function submitInvoice() {
    setSaving(true);
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

    const isEdit = formMode === "edit" && editingInvoiceId;
    const endpoint = isEdit ? `/api/invoices/${editingInvoiceId}` : "/api/invoices";
    const method = isEdit ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await response.json();
    if (!response.ok) {
      setError(json.error?.message ?? "Failed to save invoice.");
      setSaving(false);
      return;
    }

    setFormOpen(false);
    setSaving(false);
    setEditingInvoiceId(null);
    setInvoiceForm(emptyInvoiceForm());
    await loadAll();
  }

  async function deleteInvoice(id: string) {
    const confirmed = window.confirm("Delete this invoice?");
    if (!confirmed) return;

    const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error?.message ?? "Failed to delete invoice.");
      return;
    }

    await loadAll();
  }

  async function recordPayment(payload: { amount_cents: number; method: string; payment_date: string; external_reference: string }) {
    if (!selectedInvoice) return;

    setSaving(true);
    const response = await fetch(`/api/invoices/${selectedInvoice.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error?.message ?? "Failed to record payment.");
      setSaving(false);
      return;
    }

    setPayModalOpen(false);
    setSelectedInvoice(null);
    setSaving(false);
    await loadAll();
  }

  async function createShareLink(invoice: Invoice) {
    const response = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
    const json = await response.json();

    if (!response.ok) {
      setError(json.error?.message ?? "Failed to create share link.");
      return;
    }

    const origin = window.location.origin;
    const token = json.data?.share?.token as string | undefined;
    const urlPath = json.data?.share?.url_path as string | undefined;
    setShareLink(token ? `${origin}/i/${token}` : `${origin}${urlPath ?? ""}`);
    setShareModalOpen(true);
    await loadAll();
  }

  async function downloadPdf(invoice: Invoice) {
    window.open(`/api/invoices/${invoice.id}/pdf`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Invoices</CardTitle>
          <Button
            onClick={() => {
              setFormMode("create");
              setEditingInvoiceId(null);
              setInvoiceForm(emptyInvoiceForm());
              setFormOpen(true);
            }}
          >
            New Invoice
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search invoice #" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            >
              <option value="all">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading invoices...</p> : null}

          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Invoice #</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Issue Date</th>
                  <th className="px-4 py-2 font-medium">Due Date</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t">
                    <td className="px-4 py-2">{invoice.invoice_number}</td>
                    <td className="px-4 py-2">{invoice.clients?.name ?? "-"}</td>
                    <td className="px-4 py-2">{formatDate(invoice.issue_date)}</td>
                    <td className="px-4 py-2">{formatDate(invoice.due_date)}</td>
                    <td className="px-4 py-2">{formatCurrency(invoice.total_cents, invoice.currency)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(invoice.status)}`}>{invoice.status.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormMode("view");
                            setEditingInvoiceId(invoice.id);
                            setInvoiceForm(invoiceToForm(invoice));
                            setFormOpen(true);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormMode("edit");
                            setEditingInvoiceId(invoice.id);
                            setInvoiceForm(invoiceToForm(invoice));
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPayModalOpen(true);
                          }}
                        >
                          Mark Paid
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void createShareLink(invoice)}>
                          Share Link
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void downloadPdf(invoice)}>
                          Download PDF
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void deleteInvoice(invoice.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredInvoices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={7}>
                      No invoices match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InvoiceFormModal
        mode={formMode}
        open={formOpen}
        title={formMode === "create" ? "New Invoice" : formMode === "edit" ? "Edit Invoice" : "View Invoice"}
        form={invoiceForm}
        clients={clients}
        gigs={gigs}
        loading={saving}
        onClose={() => setFormOpen(false)}
        onChange={setInvoiceForm}
        onSubmit={() => void submitInvoice()}
      />

      <MarkPaidModal
        open={payModalOpen}
        invoice={selectedInvoice}
        loading={saving}
        onClose={() => {
          setPayModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSubmit={(payload) => void recordPayment(payload)}
      />

      <ShareLinkModal
        open={shareModalOpen}
        link={shareLink}
        onClose={() => {
          setShareModalOpen(false);
          setShareLink("");
        }}
      />
    </div>
  );
}
