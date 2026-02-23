-- GigLedger (Creator / DJ Operations Kit)
-- RLS-first schema and policies

create extension if not exists pgcrypto;

-- ----------
-- Utilities
-- ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Keep invoice_line_items.user_id in sync with parent invoice ownership.
create or replace function public.sync_invoice_line_item_user_id()
returns trigger
language plpgsql
as $$
declare
  v_invoice_user_id uuid;
begin
  select i.user_id
  into v_invoice_user_id
  from public.invoices i
  where i.id = new.invoice_id;

  if v_invoice_user_id is null then
    raise exception 'Invalid invoice_id for invoice_line_items';
  end if;

  if new.user_id is distinct from v_invoice_user_id then
    new.user_id = v_invoice_user_id;
  end if;

  return new;
end;
$$;

-- Keep payments.user_id in sync with parent invoice ownership.
create or replace function public.sync_payment_user_id()
returns trigger
language plpgsql
as $$
declare
  v_invoice_user_id uuid;
begin
  select i.user_id
  into v_invoice_user_id
  from public.invoices i
  where i.id = new.invoice_id;

  if v_invoice_user_id is null then
    raise exception 'Invalid invoice_id for payments';
  end if;

  if new.user_id is distinct from v_invoice_user_id then
    new.user_id = v_invoice_user_id;
  end if;

  return new;
end;
$$;

-- Keep invoice_shares.user_id in sync with parent invoice ownership.
create or replace function public.sync_invoice_share_user_id()
returns trigger
language plpgsql
as $$
declare
  v_invoice_user_id uuid;
begin
  select i.user_id
  into v_invoice_user_id
  from public.invoices i
  where i.id = new.invoice_id;

  if v_invoice_user_id is null then
    raise exception 'Invalid invoice_id for invoice_shares';
  end if;

  if new.user_id is distinct from v_invoice_user_id then
    new.user_id = v_invoice_user_id;
  end if;

  return new;
end;
$$;

-- ----------
-- Tables
-- ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  billing_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  event_date date,
  status text not null default 'lead' check (status in ('lead', 'booked', 'completed', 'cancelled')),
  location text,
  rate_cents integer not null default 0,
  deposit_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  gig_id uuid references public.gigs(id) on delete set null,
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  currency char(3) not null default 'USD',
  subtotal_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0,
  line_total_cents integer not null default 0,
  sort_order integer not null default 0,
  service_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  payment_date date not null default current_date,
  method text,
  external_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  brand_name text,
  brand_email text,
  brand_phone text,
  brand_address text,
  logo_url text,
  payment_instructions text,
  default_payment_terms_days integer not null default 30,
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.w9_info (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  legal_name text not null,
  business_name text,
  tax_classification text,
  tin_last4 text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------
-- Indexes
-- ----------
create index if not exists idx_clients_user_id on public.clients(user_id);

create index if not exists idx_gigs_user_id on public.gigs(user_id);
create index if not exists idx_gigs_user_status on public.gigs(user_id, status);
create index if not exists idx_gigs_user_event_date on public.gigs(user_id, event_date desc);

create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_user_status on public.invoices(user_id, status);
create index if not exists idx_invoices_user_due_date on public.invoices(user_id, due_date asc);
create index if not exists idx_invoices_user_issue_date on public.invoices(user_id, issue_date desc);

create index if not exists idx_line_items_user_id on public.invoice_line_items(user_id);
create index if not exists idx_line_items_invoice_id on public.invoice_line_items(invoice_id);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_invoice_id on public.payments(invoice_id);
create index if not exists idx_payments_user_payment_date on public.payments(user_id, payment_date desc);

create index if not exists idx_settings_user_id on public.settings(user_id);

create index if not exists idx_invoice_shares_user_id on public.invoice_shares(user_id);
create index if not exists idx_invoice_shares_invoice_id on public.invoice_shares(invoice_id);
create index if not exists idx_invoice_shares_token on public.invoice_shares(token);
create index if not exists idx_invoice_shares_active on public.invoice_shares(expires_at, revoked_at);

create index if not exists idx_w9_info_user_id on public.w9_info(user_id);

-- ----------
-- Triggers
-- ----------
drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

drop trigger if exists set_gigs_updated_at on public.gigs;
create trigger set_gigs_updated_at
before update on public.gigs
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoice_line_items_updated_at on public.invoice_line_items;
create trigger set_invoice_line_items_updated_at
before update on public.invoice_line_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoice_shares_updated_at on public.invoice_shares;
create trigger set_invoice_shares_updated_at
before update on public.invoice_shares
for each row
execute function public.set_updated_at();

drop trigger if exists set_w9_info_updated_at on public.w9_info;
create trigger set_w9_info_updated_at
before update on public.w9_info
for each row
execute function public.set_updated_at();

drop trigger if exists sync_invoice_line_item_user_id_tg on public.invoice_line_items;
create trigger sync_invoice_line_item_user_id_tg
before insert or update of invoice_id, user_id on public.invoice_line_items
for each row
execute function public.sync_invoice_line_item_user_id();

drop trigger if exists sync_payment_user_id_tg on public.payments;
create trigger sync_payment_user_id_tg
before insert or update of invoice_id, user_id on public.payments
for each row
execute function public.sync_payment_user_id();

drop trigger if exists sync_invoice_share_user_id_tg on public.invoice_shares;
create trigger sync_invoice_share_user_id_tg
before insert or update of invoice_id, user_id on public.invoice_shares
for each row
execute function public.sync_invoice_share_user_id();

-- ----------
-- RLS
-- ----------
alter table public.clients enable row level security;
alter table public.gigs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;
alter table public.invoice_shares enable row level security;
alter table public.w9_info enable row level security;

alter table public.clients force row level security;
alter table public.gigs force row level security;
alter table public.invoices force row level security;
alter table public.invoice_line_items force row level security;
alter table public.payments force row level security;
alter table public.settings force row level security;
alter table public.invoice_shares force row level security;
alter table public.w9_info force row level security;

-- Clients
create policy "clients_select_own" on public.clients
for select to authenticated
using (user_id = auth.uid());

create policy "clients_insert_own" on public.clients
for insert to authenticated
with check (user_id = auth.uid());

create policy "clients_update_own" on public.clients
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "clients_delete_own" on public.clients
for delete to authenticated
using (user_id = auth.uid());

-- Gigs
create policy "gigs_select_own" on public.gigs
for select to authenticated
using (user_id = auth.uid());

create policy "gigs_insert_own" on public.gigs
for insert to authenticated
with check (user_id = auth.uid());

create policy "gigs_update_own" on public.gigs
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "gigs_delete_own" on public.gigs
for delete to authenticated
using (user_id = auth.uid());

-- Invoices
create policy "invoices_select_own" on public.invoices
for select to authenticated
using (user_id = auth.uid());

create policy "invoices_insert_own" on public.invoices
for insert to authenticated
with check (user_id = auth.uid());

create policy "invoices_update_own" on public.invoices
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "invoices_delete_own" on public.invoices
for delete to authenticated
using (user_id = auth.uid());

-- Invoice line items (must belong to owned parent invoice)
create policy "invoice_line_items_select_own" on public.invoice_line_items
for select to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_line_items_insert_own" on public.invoice_line_items
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_line_items_update_own" on public.invoice_line_items
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and i.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_line_items_delete_own" on public.invoice_line_items
for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and i.user_id = auth.uid()
  )
);

-- Payments
create policy "payments_select_own" on public.payments
for select to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "payments_insert_own" on public.payments
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "payments_update_own" on public.payments
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "payments_delete_own" on public.payments
for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.user_id = auth.uid()
  )
);

-- Settings
create policy "settings_select_own" on public.settings
for select to authenticated
using (user_id = auth.uid());

create policy "settings_insert_own" on public.settings
for insert to authenticated
with check (user_id = auth.uid());

create policy "settings_update_own" on public.settings
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "settings_delete_own" on public.settings
for delete to authenticated
using (user_id = auth.uid());

-- Invoice shares
create policy "invoice_shares_select_own" on public.invoice_shares
for select to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_shares.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_shares_insert_own" on public.invoice_shares
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_shares.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_shares_update_own" on public.invoice_shares
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_shares.invoice_id
      and i.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_shares.invoice_id
      and i.user_id = auth.uid()
  )
);

create policy "invoice_shares_delete_own" on public.invoice_shares
for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_shares.invoice_id
      and i.user_id = auth.uid()
  )
);

-- W9 info
create policy "w9_info_select_own" on public.w9_info
for select to authenticated
using (user_id = auth.uid());

create policy "w9_info_insert_own" on public.w9_info
for insert to authenticated
with check (user_id = auth.uid());

create policy "w9_info_update_own" on public.w9_info
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "w9_info_delete_own" on public.w9_info
for delete to authenticated
using (user_id = auth.uid());

-- ----------
-- Public invoice-share token accessor
-- ----------
-- No direct public table access to invoices is granted. This function returns
-- only the shared invoice payload for a valid share token.
create or replace function public.get_shared_invoice_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', i.id,
      'invoice_number', i.invoice_number,
      'issue_date', i.issue_date,
      'due_date', i.due_date,
      'status', i.status,
      'currency', i.currency,
      'subtotal_cents', i.subtotal_cents,
      'tax_cents', i.tax_cents,
      'total_cents', i.total_cents,
      'notes', i.notes
    ),
    'client', case when c.id is null then null else jsonb_build_object(
      'name', c.name,
      'email', c.email,
      'phone', c.phone,
      'billing_address', c.billing_address
    ) end,
    'settings', case when s.id is null then null else jsonb_build_object(
      'brand_name', s.brand_name,
      'brand_email', s.brand_email,
      'brand_phone', s.brand_phone,
      'brand_address', s.brand_address,
      'payment_instructions', s.payment_instructions,
      'currency', s.currency
    ) end,
    'line_items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', li.id,
            'description', li.description,
            'quantity', li.quantity,
            'unit_price_cents', li.unit_price_cents,
            'line_total_cents', li.line_total_cents,
            'service_date', li.service_date,
            'sort_order', li.sort_order
          )
          order by li.sort_order asc, li.created_at asc
        )
        from public.invoice_line_items li
        where li.invoice_id = i.id
      ),
      '[]'::jsonb
    ),
    'payments', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'amount_cents', p.amount_cents,
            'payment_date', p.payment_date,
            'method', p.method
          )
          order by p.payment_date asc, p.created_at asc
        )
        from public.payments p
        where p.invoice_id = i.id
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from public.invoice_shares sh
  join public.invoices i
    on i.id = sh.invoice_id
  left join public.clients c
    on c.id = i.client_id
  left join public.settings s
    on s.user_id = i.user_id
  where sh.token = p_token
    and sh.revoked_at is null
    and (sh.expires_at is null or sh.expires_at > now())
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.get_shared_invoice_by_token(text) from public;
grant execute on function public.get_shared_invoice_by_token(text) to anon, authenticated;
