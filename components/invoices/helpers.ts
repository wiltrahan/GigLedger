import type { Invoice, InvoiceFormState, InvoiceLineItem } from "@/components/invoices/types";

export function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatDate(dateLike?: string | null) {
  if (!dateLike) return "-";
  const date = new Date(dateLike);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export function getStatusClass(status: Invoice["status"]) {
  if (status === "paid") return "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20";
  if (status === "sent") return "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/20";
  if (status === "overdue") return "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20";
  if (status === "void") return "bg-slate-400/15 text-slate-200 ring-1 ring-slate-300/10";
  return "bg-white/10 text-slate-100 ring-1 ring-white/10";
}

export function emptyInvoiceForm(): InvoiceFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    client_id: "",
    gig_id: "",
    invoice_number: "",
    issue_date: today,
    due_date: "",
    notes: "",
    line_items: [
      {
        description: "",
        quantity: 1,
        unit_price_cents: 0,
        unit_price_display: "",
        service_date: today,
        sort_order: 0
      }
    ]
  };
}

export function invoiceToForm(invoice: Invoice): InvoiceFormState {
  return {
    client_id: invoice.client_id ?? "",
    gig_id: invoice.gig_id ?? "",
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date?.slice(0, 10) ?? "",
    due_date: invoice.due_date?.slice(0, 10) ?? "",
    notes: invoice.notes ?? "",
    line_items:
      invoice.invoice_line_items?.length
        ? [...invoice.invoice_line_items]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unit_price_cents: item.unit_price_cents,
              unit_price_display: (item.unit_price_cents / 100).toFixed(2),
              service_date: item.service_date ?? null,
              sort_order: item.sort_order ?? index
            }))
        : [
            {
              description: "",
              quantity: 1,
              unit_price_cents: 0,
              unit_price_display: "",
              service_date: invoice.issue_date?.slice(0, 10) ?? null,
              sort_order: 0
            }
          ]
  };
}

export function calcLineTotal(item: InvoiceLineItem) {
  return Math.round(item.quantity * item.unit_price_cents);
}

export function calcSubtotal(lineItems: InvoiceLineItem[]) {
  return lineItems.reduce((sum, item) => sum + calcLineTotal(item), 0);
}

export function calcPaid(invoice: Invoice) {
  return (invoice.payments ?? []).reduce((sum, payment) => sum + payment.amount_cents, 0);
}
