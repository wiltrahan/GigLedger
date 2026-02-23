import type { z } from "zod";

import type { invoiceLineItemInputSchema } from "@/lib/api/schemas";

type InvoiceLineItemInput = z.infer<typeof invoiceLineItemInputSchema>;

export function normalizeLineItems(lineItems: InvoiceLineItemInput[]) {
  return lineItems.map((item, index) => {
    const line_total_cents = Math.round(item.quantity * item.unit_price_cents);

    return {
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      line_total_cents,
      service_date: item.service_date ?? null,
      sort_order: item.sort_order ?? index
    };
  });
}

export function computeTotals(
  lineItems: Array<{ line_total_cents: number }>,
  taxRatePercent?: number,
  explicitTaxCents?: number,
  fallbackTaxCents = 0
) {
  const subtotal_cents = lineItems.reduce((sum, item) => sum + item.line_total_cents, 0);
  const tax_cents =
    explicitTaxCents ??
    (typeof taxRatePercent === "number" ? Math.round(subtotal_cents * (taxRatePercent / 100)) : fallbackTaxCents);
  const total_cents = subtotal_cents + tax_cents;

  return {
    subtotal_cents,
    tax_cents,
    total_cents
  };
}
