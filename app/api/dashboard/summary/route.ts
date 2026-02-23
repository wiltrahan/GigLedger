import { requireUser } from "@/lib/api/auth";
import { jsonOk, jsonSupabaseError } from "@/lib/api/response";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const start = `${currentYear}-01-01`;
  const end = `${currentYear + 1}-01-01`;

  const [paymentsRes, invoicesRes, upcomingGigsRes, recentInvoicesRes, clientsRes] = await Promise.all([
    supabase.from("payments").select("amount_cents,payment_date").gte("payment_date", start).lt("payment_date", end),
    supabase.from("invoices").select("id,total_cents,status,issue_date").order("issue_date", { ascending: false }),
    supabase
      .from("gigs")
      .select("id,title,location,event_date,status,rate_cents,clients(id,name)")
      .gte("event_date", today)
      .neq("status", "cancelled")
      .order("event_date", { ascending: true })
      .limit(5),
    supabase
      .from("invoices")
      .select("id,invoice_number,status,total_cents,issue_date,due_date,clients(id,name)")
      .order("issue_date", { ascending: false })
      .limit(5),
    supabase.from("clients").select("id")
  ]);

  if (paymentsRes.error) return jsonSupabaseError(paymentsRes.error);
  if (invoicesRes.error) return jsonSupabaseError(invoicesRes.error);
  if (upcomingGigsRes.error) return jsonSupabaseError(upcomingGigsRes.error);
  if (recentInvoicesRes.error) return jsonSupabaseError(recentInvoicesRes.error);
  if (clientsRes.error) return jsonSupabaseError(clientsRes.error);

  const totalEarnedYtdCents = paymentsRes.data.reduce((sum, payment) => sum + payment.amount_cents, 0);

  const invoiceIds = invoicesRes.data.map((invoice) => invoice.id);
  let invoicePaymentsById = new Map<string, number>();

  if (invoiceIds.length > 0) {
    const invoicePaymentsRes = await supabase.from("payments").select("invoice_id,amount_cents").in("invoice_id", invoiceIds);

    if (invoicePaymentsRes.error) return jsonSupabaseError(invoicePaymentsRes.error);

    invoicePaymentsById = invoicePaymentsRes.data.reduce((map, row) => {
      map.set(row.invoice_id, (map.get(row.invoice_id) ?? 0) + row.amount_cents);
      return map;
    }, new Map<string, number>());
  }

  const outstandingCents = invoicesRes.data.reduce((sum, invoice) => {
    if (invoice.status === "void") return sum;
    const paid = invoicePaymentsById.get(invoice.id) ?? 0;
    return sum + Math.max(invoice.total_cents - paid, 0);
  }, 0);

  return jsonOk({
    kpis: {
      total_earned_ytd_cents: totalEarnedYtdCents,
      outstanding_cents: outstandingCents,
      upcoming_gigs_count: upcomingGigsRes.data.length,
      active_clients_count: clientsRes.data.length
    },
    upcoming_gigs: upcomingGigsRes.data,
    recent_invoices: recentInvoicesRes.data
  });
}
