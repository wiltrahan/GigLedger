export type Client = {
  id: string;
  name: string;
  email?: string | null;
};

export type Gig = {
  id: string;
  title: string;
  event_date?: string | null;
};

export type InvoiceLineItem = {
  id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  unit_price_display?: string;
  line_total_cents?: number;
  sort_order?: number;
  service_date?: string | null;
};

export type Payment = {
  id: string;
  amount_cents: number;
  payment_date?: string | null;
  method?: string | null;
  external_reference?: string | null;
};

export type Invoice = {
  id: string;
  client_id?: string | null;
  gig_id?: string | null;
  invoice_number: string;
  issue_date?: string | null;
  due_date?: string | null;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  notes?: string | null;
  created_at: string;
  clients?: Client | null;
  invoice_line_items?: InvoiceLineItem[];
  payments?: Payment[];
};

export type InvoiceFormState = {
  client_id: string;
  gig_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  notes: string;
  line_items: InvoiceLineItem[];
};
