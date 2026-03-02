"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`
      }
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for a magic link.");
  };

  const onGoogle = async () => {
    const supabase = createClient();
    const origin = window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`
      }
    });
  };

  return (
    <Card className="dashboard-panel-strong w-full rounded-[28px] border-white/10 text-slate-100 shadow-[0_24px_80px_rgba(1,7,17,0.45)]">
      <CardHeader>
        <CardTitle className="text-3xl text-white">Sign in</CardTitle>
        <CardDescription className="text-slate-400">Email magic link with optional Google OAuth through Supabase.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onMagicLink} className="space-y-4">
          <Input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 rounded-2xl border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
          <Button
            className="h-12 w-full rounded-2xl bg-[var(--dashboard-accent)] text-slate-950 hover:bg-[var(--dashboard-accent-strong)]"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send magic link"}
          </Button>
          <Button
            className="h-12 w-full rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
            type="button"
            variant="outline"
            onClick={onGoogle}
          >
            Continue with Google
          </Button>
          {message ? <p className="text-sm text-slate-400">{message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
