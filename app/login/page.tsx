import { redirect } from "next/navigation";

import { LoginForm } from "@/components/layout/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md items-center px-6 py-16">
      <LoginForm />
    </main>
  );
}
