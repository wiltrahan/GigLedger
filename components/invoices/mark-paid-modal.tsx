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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Record Payment: {invoice.invoice_number}</CardTitle>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <p>Total: {formatCurrency(invoice.total_cents, invoice.currency)}</p>
            <p>Paid so far: {formatCurrency(paid, invoice.currency)}</p>
            <p className="font-semibold">Remaining: {formatCurrency(remaining, invoice.currency)}</p>
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Amount (cents)</span>
            <Input type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value || 0))} />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Method</span>
            <Input value={method} onChange={(event) => setMethod(event.target.value)} placeholder="bank_transfer" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Date</span>
            <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Reference</span>
            <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="wire-123" />
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
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
