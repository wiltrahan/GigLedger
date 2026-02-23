-- GigLedger seed data
-- Replace the placeholder user UUID with an actual auth.users.id before running.

begin;

-- 1) Set seed user
-- Replace this UUID with your auth.users.id.
-- Example:
-- select id, email from auth.users order by created_at desc;

do $$
declare
  v_user_id uuid := '11111111-1111-1111-1111-111111111111'::uuid;
begin
  -- 2) Clients
  insert into public.clients (id, user_id, name, email, phone, billing_address, notes)
  values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, v_user_id, 'Neon Nights Venue', 'booking@neonnights.example', '+1-555-0101', '120 Sunset Blvd, Los Angeles, CA', 'Monthly residency contact'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, v_user_id, 'Pulse Events Co.', 'ops@pulseevents.example', '+1-555-0102', '45 Warehouse Ln, Brooklyn, NY', 'Festival organizer')
  on conflict (id) do nothing;

  -- 3) Gigs
  insert into public.gigs (id, user_id, client_id, title, event_date, status, location, rate_cents, deposit_cents, notes)
  values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid, v_user_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'Friday Night Residency', current_date - 14, 'completed', 'Los Angeles, CA', 120000, 30000, '4-hour DJ set'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid, v_user_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'Rooftop Brand Launch', current_date - 7, 'completed', 'Brooklyn, NY', 185000, 50000, 'Included custom intro edit'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'::uuid, v_user_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'Spring Opening Weekend', current_date + 21, 'booked', 'Los Angeles, CA', 150000, 40000, 'Travel not required')
  on conflict (id) do nothing;

  -- 4) Invoices
  insert into public.invoices (
    id, user_id, client_id, gig_id, invoice_number, issue_date, due_date, status, currency,
    subtotal_cents, tax_cents, total_cents, notes
  )
  values
    (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
      v_user_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
      'INV-2026-001',
      current_date - 12,
      current_date + 18,
      'sent',
      'USD',
      120000,
      9600,
      129600,
      'Thank you for the residency booking.'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid,
      v_user_id,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
      'INV-2026-002',
      current_date - 5,
      current_date + 25,
      'paid',
      'USD',
      185000,
      14800,
      199800,
      'Launch event performance package.'
    )
  on conflict (id) do nothing;

  -- 5) Invoice line items
  insert into public.invoice_line_items (
    id, user_id, invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order, service_date
  )
  values
    (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'::uuid,
      v_user_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
      'DJ performance (4 hours)',
      1,
      120000,
      120000,
      1,
      current_date - 14
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'::uuid,
      v_user_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid,
      'Headline DJ set',
      1,
      165000,
      165000,
      1,
      current_date - 7
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd3'::uuid,
      v_user_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid,
      'Custom edit / prep session',
      2,
      10000,
      20000,
      2,
      current_date - 8
    )
  on conflict (id) do nothing;

  -- 6) Payment
  insert into public.payments (
    id, user_id, invoice_id, amount_cents, payment_date, method, external_reference, notes
  )
  values
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'::uuid,
      v_user_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid,
      199800,
      current_date - 1,
      'bank_transfer',
      'wire-239841',
      'Paid in full'
    )
  on conflict (id) do nothing;

  -- 7) Settings
  insert into public.settings (
    id,
    user_id,
    brand_name,
    brand_email,
    brand_phone,
    brand_address,
    logo_url,
    payment_instructions,
    default_payment_terms_days,
    currency
  )
  values (
    'ffffffff-ffff-4fff-8fff-fffffffffff1'::uuid,
    v_user_id,
    'DJ Nova',
    'hello@djnova.example',
    '+1-555-0199',
    'Los Angeles, CA',
    'https://example.com/logo.png',
    'ACH preferred. Please include invoice number in memo.',
    30,
    'USD'
  )
  on conflict (id) do nothing;
end $$;

commit;
