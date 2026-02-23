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
};

export function InvoiceFormModal({ mode, open, title, form, clients, gigs, loading = false, onClose, onChange, onSubmit }: Props) {
  const isReadOnly = mode === "view";

  const subtotal = useMemo(() => calcSubtotal(form.line_items), [form.line_items]);
  const tax = 0;
  const total = subtotal + tax;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <Card className="w-full max-w-5xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Client</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                value={form.invoice_number}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, invoice_number: event.target.value })}
                placeholder="INV-2026-001"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Issue Date</span>
              <Input
                type="date"
                value={form.issue_date}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, issue_date: event.target.value })}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Due Date</span>
              <Input
                type="date"
                value={form.due_date}
                disabled={isReadOnly}
                onChange={(event) => onChange({ ...form, due_date: event.target.value })}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line Items</h3>
              {!isReadOnly ? (
                <Button
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
                <div key={index} className="rounded-md border p-3">
                  <div className="grid gap-3 md:grid-cols-12">
                    <label className="md:col-span-4">
                      <span className="mb-1 block text-xs font-medium">Description</span>
                      <Input
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
                      <span className="whitespace-nowrap text-sm font-medium">{formatCurrency(calcLineTotal(item))}</span>
                      {!isReadOnly ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
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
              value={form.notes}
              disabled={isReadOnly}
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
              placeholder="Optional payment details or event notes"
            />
          </label>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">Totals auto-calculate from line items.</div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</p>
              <p className="text-sm text-muted-foreground">Tax: {formatCurrency(tax)}</p>
              <p className="text-xl font-semibold">Total: {formatCurrency(total)}</p>
            </div>
          </div>

          {!isReadOnly ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={loading} onClick={onSubmit}>
                {loading ? "Saving..." : mode === "create" ? "Create Invoice" : "Save Changes"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
