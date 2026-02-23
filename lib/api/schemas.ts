import { z } from "zod";

const dateString = z.string().date();
const nullableDateString = dateString.nullish();

export const uuidSchema = z.string().uuid();

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().max(255).nullish(),
  phone: z.string().trim().max(50).nullish(),
  billing_address: z.string().trim().max(1000).nullish(),
  notes: z.string().trim().max(5000).nullish()
});

export const clientUpdateSchema = clientCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});

export const gigCreateSchema = z.object({
  client_id: uuidSchema.nullish(),
  title: z.string().trim().min(1).max(200),
  event_date: nullableDateString,
  status: z.enum(["lead", "booked", "completed", "cancelled"]).optional(),
  location: z.string().trim().max(500).nullish(),
  rate_cents: z.number().int().min(0).optional(),
  deposit_cents: z.number().int().min(0).optional(),
  notes: z.string().trim().max(5000).nullish()
});

export const gigUpdateSchema = gigCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required."
});

export const gigFilterSchema = z.enum(["upcoming", "past"]).optional();

export const invoiceLineItemInputSchema = z.object({
  description: z.string().trim().min(1).max(1000),
  quantity: z.number().positive(),
  unit_price_cents: z.number().int().min(0),
  sort_order: z.number().int().optional(),
  service_date: nullableDateString
});

export const invoiceCreateSchema = z.object({
  client_id: uuidSchema.nullish(),
  gig_id: uuidSchema.nullish(),
  invoice_number: z.string().trim().min(1).max(100),
  issue_date: dateString.optional(),
  due_date: nullableDateString,
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]).optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  notes: z.string().trim().max(5000).nullish(),
  tax_rate_percent: z.number().min(0).max(100).optional(),
  tax_cents: z.number().int().min(0).optional(),
  line_items: z.array(invoiceLineItemInputSchema).min(1)
});

export const invoiceUpdateSchema = z
  .object({
    client_id: uuidSchema.nullish(),
    gig_id: uuidSchema.nullish(),
    invoice_number: z.string().trim().min(1).max(100).optional(),
    issue_date: dateString.optional(),
    due_date: nullableDateString,
    status: z.enum(["draft", "sent", "paid", "overdue", "void"]).optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    notes: z.string().trim().max(5000).nullish(),
    tax_rate_percent: z.number().min(0).max(100).optional(),
    tax_cents: z.number().int().min(0).optional(),
    line_items: z.array(invoiceLineItemInputSchema).min(1).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

export const invoiceStatusFilterSchema = z.enum(["draft", "sent", "paid", "overdue", "void"]).optional();

export const paymentCreateSchema = z.object({
  amount_cents: z.number().int().positive(),
  payment_date: dateString.optional(),
  method: z.string().trim().max(80).nullish(),
  external_reference: z.string().trim().max(200).nullish(),
  notes: z.string().trim().max(5000).nullish()
});
