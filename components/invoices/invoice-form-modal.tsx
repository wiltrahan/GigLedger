"use client";

import { useMemo } from "react";

import type { Client, Gig, InvoiceFormState } from "@/components/invoices/types";
import { calcLineTotal, calcSubtotal, formatCurrency } from "@/components/invoices/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  mode: "create" | "edit" | "view";
  open: boolean;
  title: string;
  form: InvoiceFormState;
  clients: Client[];
  gigs: Gig[];
  loading?: boolean;
  onClose: () => void;
  onChange: (next: InvoiceFormState) => void;
  onSubmit: () => void;
  onRequestEdit?: () => void;
};

export function InvoiceFormModal({ mode, open, title, form, clients, gigs, loading = false, onClose, onChange, onSubmit, onRequestEdit }: Props) {
  const isReadOnly = mode === "view";

  const subtotal = useMemo(() => calcSubtotal(form.line_items), [form.line_items]);
  const tax = 0;
  const total = subtotal + tax;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <Card className="dashboard-panel-strong w-full max-w-5xl rounded-[28px] border-white/10 text-slate-100">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-white">{title}</CardTitle>
          <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Client</span>
              <select
                className="dashboard-select h-10 w-full rounded-md px-3 text-sm"
                value={form.client_id}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, client_id: event.target.value })}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Gig (optional)</span>
              <select
                className="dashboard-select h-10 w-full rounded-md px-3 text-sm"
                value={form.gig_id}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, gig_id: event.target.value })}
              >
                <option value="">No linked gig</option>
                {gigs.map((gig) => (
                  <option key={gig.id} value={gig.id}>
                    {gig.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Invoice #</span>
              <Input
                className="dashboard-input"
                value={form.invoice_number}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, invoice_number: event.target.value })}
                placeholder="INV-2026-001"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Issue Date</span>
              <Input
                className="dashboard-input"
                type="date"
                value={form.issue_date}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, issue_date: event.target.value })}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Due Date</span>
              <Input
                className="dashboard-input"
                type="date"
                value={form.due_date}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, due_date: event.target.value })}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Line Items</h3>
              {!isReadOnly ? (
                <Button
                  className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange({
                      ...form,
                      line_items: [
                        ...form.line_items,
                        {
                          description: "",
                          quantity: 1,
                          unit_price_cents: 0,
                          unit_price_display: "",
                          service_date: form.issue_date || null,
                          sort_order: form.line_items.length
                        }
                      ]
                    })
                  }
                >
                  Add line item
                </Button>
              ) : null}
            </div>

            <div className="space-y-3">
              {form.line_items.map((item, index) => (
                <div key={index} className="rounded-[22px] border border-white/10 bg-white/5 p-3">
                  <div className="grid gap-3 md:grid-cols-12">
                    <label className="md:col-span-4">
                      <span className="mb-1 block text-xs font-medium">Description</span>
                      <Input
                        className="dashboard-input"
                        value={item.description}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          const next = [...form.line_items];
                          next[index] = { ...next[index], description: event.target.value };
                          onChange({ ...form, line_items: next });
                        }}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className="mb-1 block text-xs font-medium">Qty</span>
                      <Input
                        className="dashboard-input"
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          const next = [...form.line_items];
                          next[index] = { ...next[index], quantity: Number(event.target.value || 0) };
                          onChange({ ...form, line_items: next });
                        }}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className="mb-1 block text-xs font-medium">Unit Price ($)</span>
                      <Input
                        className="dashboard-input"
                        type="text"
                        inputMode="decimal"
                        value={item.unit_price_display ?? (item.unit_price_cents / 100).toFixed(2)}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const normalized = raw.replace(/[^0-9.]/g, "");
                          const parts = normalized.split(".");
                          const safeValue =
                            parts.length <= 2 ? normalized : `${parts[0]}.${parts.slice(1).join("")}`;

                          let nextCents = item.unit_price_cents;
                          if (safeValue === "" || safeValue === ".") {
                            nextCents = 0;
                          } else {
                            const dollars = Number(safeValue);
                            if (Number.isFinite(dollars)) {
                              nextCents = Math.round(dollars * 100);
                            }
                          }

                          const next = [...form.line_items];
                          next[index] = {
                            ...next[index],
                            unit_price_display: safeValue,
                            unit_price_cents: nextCents
                          };
                          onChange({ ...form, line_items: next });
                        }}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className="mb-1 block text-xs font-medium">Service Date</span>
                      <Input
                        className="dashboard-input"
                        type="date"
                        value={item.service_date ?? ""}
                        disabled={isReadOnly}
                        onChange={(event) => {
                          const next = [...form.line_items];
                          next[index] = { ...next[index], service_date: event.target.value || null };
                          onChange({ ...form, line_items: next });
                        }}
                      />
                    </label>
                    <div className="flex items-end justify-end gap-3 md:col-span-2">
                      <span className="whitespace-nowrap text-sm font-medium text-white">{formatCurrency(calcLineTotal(item))}</span>
                      {!isReadOnly ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                          onClick={() => {
                            const next = form.line_items.filter((_, currentIndex) => currentIndex !== index);
                            onChange({
                              ...form,
                              line_items: next.length
                                ? next
                                : [
                                    {
                                      description: "",
                                      quantity: 1,
                                      unit_price_cents: 0,
                                      unit_price_display: "",
                                      service_date: form.issue_date || null,
                                      sort_order: 0
                                    }
                                  ]
                            });
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="block space-y-2 text-sm">
            <span className="font-medium">Notes</span>
            <Textarea
              className="dashboard-input min-h-[100px]"
              value={form.notes}
              disabled={isReadOnly}
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
              placeholder="Optional payment details or event notes"
            />
          </label>

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div className="text-sm text-slate-400">Totals auto-calculate from line items.</div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-slate-400">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-sm text-slate-400">Tax: {formatCurrency(tax)}</p>
              <p className="text-xl font-semibold text-white">Total: {formatCurrency(total)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={onClose}>
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {isReadOnly ? (
              onRequestEdit ? (
                <Button className="bg-[var(--dashboard-accent)] text-slate-950 hover:bg-[var(--dashboard-accent-strong)]" onClick={onRequestEdit}>
                  Edit Invoice
                </Button>
              ) : null
            ) : (
              <Button className="bg-[var(--dashboard-accent)] text-slate-950 hover:bg-[var(--dashboard-accent-strong)]" disabled={loading} onClick={onSubmit}>
                {loading ? "Saving..." : mode === "create" ? "Create Invoice" : "Save Changes"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
