-- GigLedger RLS-first schema baseline.
-- Every row is owned by a user_id and policy-scoped to auth.uid().

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  amount_cents integer not null default 0,
  status text not null default 'active',
  gig_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  gig_id uuid references public.gigs(id) on delete set null,
  invoice_number text not null,
  amount_cents integer not null,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

alter table public.clients enable row level security;
alter table public.gigs enable row level security;
alter table public.invoices enable row level security;

create policy "clients_select_own" on public.clients
  for select using (user_id = auth.uid());
create policy "clients_insert_own" on public.clients
  for insert with check (user_id = auth.uid());
create policy "clients_update_own" on public.clients
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clients_delete_own" on public.clients
  for delete using (user_id = auth.uid());

create policy "gigs_select_own" on public.gigs
  for select using (user_id = auth.uid());
create policy "gigs_insert_own" on public.gigs
  for insert with check (user_id = auth.uid());
create policy "gigs_update_own" on public.gigs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "gigs_delete_own" on public.gigs
  for delete using (user_id = auth.uid());

create policy "invoices_select_own" on public.invoices
  for select using (user_id = auth.uid());
create policy "invoices_insert_own" on public.invoices
  for insert with check (user_id = auth.uid());
create policy "invoices_update_own" on public.invoices
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "invoices_delete_own" on public.invoices
  for delete using (user_id = auth.uid());
