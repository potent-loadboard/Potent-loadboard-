-- POTENT — Supabase schema
-- Run this whole file once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New Query → paste this → Run).

-- ============ POSTINGS ============

create table if not exists postings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),

  category text not null,
  vehicle text not null,           -- 'Cargo Van' | 'Sprinter Van' | 'Box Truck'
  pickup_city text not null,
  delivery_city text not null,
  miles numeric not null,
  price numeric not null,

  weight text,
  dimensions text,
  requirements text[] default '{}',
  photos text[] default '{}',

  poster_name text,
  contact_phone text,
  contact_email text,

  status text not null default 'active',  -- 'active' | 'filled' | 'expired' | 'removed'
  paid boolean not null default false,    -- flips to true via Stripe webhook once payment confirms

  -- Lets a poster edit/delete their own listing without needing an account.
  -- Generated client-side at posting time and kept only in the poster's
  -- browser (localStorage) — never exposed via public reads (see grant below).
  edit_token uuid not null default gen_random_uuid()
);

create index if not exists postings_status_idx on postings(status);
create index if not exists postings_category_idx on postings(category);
create index if not exists postings_vehicle_idx on postings(vehicle);

alter table postings enable row level security;

-- Anyone can read active, PAID postings that haven't expired (public board,
-- no login required). Unpaid postings stay invisible until the Stripe webhook
-- flips paid = true, so a draft posting never shows before the fee clears.
create policy "public read active paid postings"
on postings for select
using (status = 'active' and paid = true and expires_at > now());

-- Anyone can create a posting (Craigslist model — no account required to post).
-- It's created as paid = false and stays hidden until Stripe confirms payment.
create policy "public can create postings"
on postings for insert
with check (true);

-- No public UPDATE or DELETE policy exists on purpose. Editing, marking a
-- load filled, soft-deleting, and admin removal all go through Netlify
-- Functions using the Supabase SERVICE ROLE key (server-side only), which
-- bypasses RLS after verifying the poster's edit_token or the admin password.
-- This means the anon key can never modify an existing row directly.

-- Hide edit_token from anyone using the public (anon/authenticated) key —
-- only server-side functions using the service role key can read it, since
-- the service role bypasses grants entirely.
revoke select (edit_token) on public.postings from anon, authenticated;


-- ============ REVIEWS (trust layer, since there's no vetting) ============

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  posting_id uuid references postings(id) on delete cascade,
  reviewer_name text,
  reviewee_role text,   -- 'customer' | 'operator'
  rating int check (rating between 1 and 5),
  comment text
);

alter table reviews enable row level security;

create policy "public read reviews"
on reviews for select
using (true);

create policy "public can create reviews"
on reviews for insert
with check (true);


-- ============ STORAGE (photos) ============

insert into storage.buckets (id, name, public)
values ('load-photos', 'load-photos', true)
on conflict (id) do nothing;

create policy "public read photos"
on storage.objects for select
using (bucket_id = 'load-photos');

create policy "public upload photos"
on storage.objects for insert
with check (bucket_id = 'load-photos');


-- ============ NOTES ============
-- 1. Editing, marking filled, and deleting a posting all happen through the
--    manage-posting Netlify Function, gated by the edit_token generated for
--    that posting at creation time. There's no login — the poster's browser
--    remembers their token in localStorage.
-- 2. Admin moderation happens through the admin-actions Netlify Function,
--    gated by a single password (ADMIN_SECRET env var, server-side only).
--    This is lightweight (fine for one-person moderation) — not a full
--    admin-accounts system.
-- 3. "Auto-expiration" is handled simply: the public read policy above
--    already excludes anything past its expires_at, so expired postings
--    disappear from the board with zero extra jobs or cost. Their status
--    stays 'active' in the row itself (a scheduled cleanup job to flip
--    status to 'expired' would be a nice-to-have later, not required).
