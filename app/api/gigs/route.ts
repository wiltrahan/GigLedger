import { gigCreateSchema, gigFilterSchema } from "@/lib/api/schemas";
import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk, jsonSupabaseError, jsonZodError } from "@/lib/api/response";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const filterRaw = new URL(request.url).searchParams.get("filter") ?? undefined;
  const filter = gigFilterSchema.safeParse(filterRaw);
  if (!filter.success) return jsonError(400, "VALIDATION_ERROR", "Invalid gigs filter.", filter.error.flatten());

  const { supabase } = auth;
  let query = supabase.from("gigs").select("*, clients(id,name)").order("event_date", { ascending: true, nullsFirst: false });

  const today = new Date().toISOString().slice(0, 10);
  if (filter.data === "upcoming") query = query.gte("event_date", today);
  if (filter.data === "past") query = query.lt("event_date", today);

  const { data, error } = await query;
  if (error) return jsonSupabaseError(error);

  return jsonOk(data);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  const parsed = gigCreateSchema.safeParse(payload);
  if (!parsed.success) return jsonZodError(parsed.error);

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("gigs")
    .insert({
      ...parsed.data,
      user_id: user.id
    })
    .select("*, clients(id,name)")
    .single();

  if (error) return jsonSupabaseError(error);
  return jsonOk(data, 201);
}
