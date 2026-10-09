-- Dukkan schema. Run once in the Supabase SQL editor (or `supabase db query`).
-- Single-seller shop for the hackathon: the browser never talks to Supabase directly,
-- every read and write goes through Next.js route handlers using the secret key.

create table if not exists public.shop (
  id            int primary key default 1 check (id = 1),
  name          text not null default 'My shop',
  lang          text not null default 'ar' check (lang in ('ar','he','en')),
  open          boolean not null default true,
  paypal_email  text,
  onboarded     boolean not null default false,
  notify_paid   boolean not null default true,
  notify_nomatch boolean not null default true,
  notify_weekly boolean not null default false,
  updated_at    timestamptz not null default now()
);
insert into public.shop (id) values (1) on conflict do nothing;

create table if not exists public.products (
  id            text primary key,
  title         text not null,
  short_title   text not null,
  price         numeric(10,2) not null check (price >= 0),
  currency      text not null default 'USD',
  stock         int not null default 1 check (stock >= 0),
  visible       boolean not null default true,
  details       text[] not null default '{}',
  description   text not null default '',
  ai_added      text,                 -- the "Added by AI" line the seller kept, if any
  transcript    text,                 -- what the seller said, in their language
  transcript_lang text,
  art           text not null default 'generic',
  tint          text not null default '#EFE7D6',
  photos        jsonb not null default '[]',   -- [{ "url": "...", "label": "..." }]
  sold          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create sequence if not exists public.order_no start 1043;

create table if not exists public.orders (
  id               text primary key default nextval('public.order_no')::text,
  token            text not null default replace(gen_random_uuid()::text, '-', ''),  -- secret in pay links
  status           text not null default 'pending'
                   check (status in ('pending','paid','shipped','delivered','cancelled')),
  paypal_order_id  text unique,
  paypal_capture_id text,
  amount           numeric(10,2) not null,
  currency         text not null default 'USD',
  items            jsonb not null,    -- [{ product_id, title, qty, unit_price }]
  agent            text,              -- which agent built the cart
  buyer_name       text,
  buyer_email      text,
  shipping         jsonb,             -- PayPal purchase_units[0].shipping
  carrier          text,
  tracking         text,
  cart_built_at    timestamptz not null default now(),
  paid_at          timestamptz,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

create table if not exists public.searches (
  id          bigserial primary key,
  query       text not null,
  found       boolean not null,
  product_id  text references public.products(id) on delete set null,
  agent       text,
  created_at  timestamptz not null default now()
);
create index if not exists searches_created_idx on public.searches (created_at desc);

-- Lock everything down. Only the secret key (service_role) is used, from the server.
alter table public.shop      enable row level security;
alter table public.products  enable row level security;
alter table public.orders    enable row level security;
alter table public.searches  enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on public.shop, public.products, public.orders, public.searches to service_role;
grant usage, select on sequence public.order_no, public.searches_id_seq to service_role;
