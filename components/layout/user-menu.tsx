"use client";

import { ChevronDown, LogOut } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function UserMenu({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto rounded-full border border-white/10 bg-white/5 px-2 py-2 text-slate-100 hover:bg-white/10 hover:text-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dashboard-accent)] text-sm font-semibold text-slate-950">
            {initials}
          </span>
          <span className="hidden px-3 text-left sm:block">
            <span className="block text-[10px] uppercase tracking-[0.24em] text-slate-400">Signed in</span>
            <span className="block max-w-[180px] truncate text-sm font-medium">{email}</span>
          </span>
          <ChevronDown className="mr-1 hidden h-4 w-4 text-slate-400 sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl border-white/10 bg-slate-950/95 text-slate-100 backdrop-blur">
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.22em] text-slate-400">Signed in as</DropdownMenuLabel>
        <DropdownMenuItem className="cursor-default rounded-xl text-sm text-slate-200 focus:bg-white/5 focus:text-white">{email}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild className="cursor-pointer rounded-xl focus:bg-white/5 focus:text-white">
            <button type="submit" className="flex w-full items-center">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
