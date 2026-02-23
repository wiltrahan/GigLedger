import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/response";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: jsonError(401, "UNAUTHORIZED", "You must be logged in.")
    };
  }

  return { supabase, user: user as User };
}
