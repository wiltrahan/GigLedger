"use client";

import { useEffect, useMemo, useState } from "react";

import type { Invoice } from "@/components/invoices/types";
import { calcPaid, formatCurrency } from "@/components/invoices/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  invoice: Invoice | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    amount_cents: number;
    method: string;
    payment_date: string;
    external_reference: string;
  }) => void;
};

export function MarkPaidModal({ open, invoice, loading = false, onClose, onSubmit }: Props) {
  const paid = useMemo(() => (invoice ? calcPaid(invoice) : 0), [invoice]);
  const remaining = useMemo(() => (invoice ? Math.max(invoice.total_cents - paid, 0) : 0), [invoice, paid]);

  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  useEffect(() => {
    setAmount(remaining);
    setMethod("bank_transfer");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReference("");
  }, [invoice?.id, remaining]);

  if (!open || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="dashboard-panel-strong w-full max-w-lg rounded-[28px] border-white/10 text-slate-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Record Payment: {invoice.invoice_number}</CardTitle>
          <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            <p>Total: {formatCurrency(invoice.total_cents, invoice.currency)}</p>
            <p>Paid so far: {formatCurrency(paid, invoice.currency)}</p>
            <p className="font-semibold text-white">Remaining: {formatCurrency(remaining, invoice.currency)}</p>
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Amount (cents)</span>
            <Input className="dashboard-input" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value || 0))} />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Method</span>
            <Input className="dashboard-input" value={method} onChange={(event) => setMethod(event.target.value)} placeholder="bank_transfer" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Date</span>
            <Input className="dashboard-input" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Reference</span>
            <Input className="dashboard-input" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="wire-123" />
          </label>

          <div className="flex justify-end gap-2">
            <Button className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--dashboard-accent)] text-slate-950 hover:bg-[var(--dashboard-accent-strong)]"
              disabled={loading}
              onClick={() =>
                onSubmit({
                  amount_cents: amount,
                  method,
                  payment_date: paymentDate,
                  external_reference: reference
                })
              }
            >
              {loading ? "Saving..." : "Mark Paid"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
