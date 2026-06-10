-- Venpro: esquema multi-tenant con RLS por organización

create extension if not exists "pgcrypto";

-- Organizaciones (un negocio por cuenta de propietario)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text check (industry in ('restaurante', 'tienda')),
  business_structure text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  created_at timestamptz not null default now()
);

-- Perfiles de usuario vinculados a auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  role text not null check (role in ('owner', 'employee')),
  organization_id uuid references public.organizations (id) on delete set null,
  cargo text,
  created_at timestamptz not null default now()
);

-- Configuración de la tienda (una por organización)
create table if not exists public.store_configs (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  store_name text not null,
  currency_symbol text not null default '$',
  address text not null default '',
  phone text not null default '',
  tax_rate numeric not null default 16,
  owner_access_pin text not null default '1234'
);

-- Productos
create table if not exists public.products (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  id text not null,
  code text not null,
  name text not null,
  category text not null,
  buy_price numeric not null,
  sell_price numeric not null,
  quantity numeric not null,
  min_stock numeric not null,
  location text not null,
  image text,
  is_compound boolean not null default false,
  primary key (organization_id, id)
);

-- Ventas
create table if not exists public.sales (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  id text not null,
  date timestamptz not null,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null,
  responsible text not null,
  payment_method text not null,
  primary key (organization_id, id)
);

-- Movimientos de stock
create table if not exists public.stock_transactions (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  id text not null,
  product_id text not null,
  product_name text not null,
  type text not null check (type in ('addition', 'subtraction')),
  quantity numeric not null,
  reason text not null,
  date timestamptz not null,
  responsible text not null,
  primary key (organization_id, id)
);

-- Índices
create index if not exists idx_profiles_org on public.profiles (organization_id);
create index if not exists idx_products_org on public.products (organization_id);
create index if not exists idx_sales_org on public.sales (organization_id);
create index if not exists idx_stock_tx_org on public.stock_transactions (organization_id);
create index if not exists idx_organizations_invite on public.organizations (invite_code);

-- RLS
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.store_configs enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.stock_transactions enable row level security;

-- Helper: organización del usuario autenticado
create or replace function public.user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- Validar código de invitación (accesible antes de autenticarse)
create or replace function public.validate_invite_code(code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.organizations
  where invite_code = lower(trim(code))
  limit 1;
$$;

grant execute on function public.validate_invite_code(text) to anon, authenticated;

-- Organizations
create policy "owners_read_own_org"
  on public.organizations for select
  using (owner_id = auth.uid() or id = public.user_organization_id());

create policy "owners_insert_own_org"
  on public.organizations for insert
  with check (owner_id = auth.uid());

create policy "owners_update_own_org"
  on public.organizations for update
  using (owner_id = auth.uid());

-- Profiles
create policy "users_read_own_profile"
  on public.profiles for select
  using (id = auth.uid() or organization_id = public.user_organization_id());

create policy "users_insert_own_profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "users_update_own_profile"
  on public.profiles for update
  using (id = auth.uid());

-- Store configs
create policy "org_members_read_config"
  on public.store_configs for select
  using (organization_id = public.user_organization_id());

create policy "owners_insert_config"
  on public.store_configs for insert
  with check (organization_id in (
    select id from public.organizations where owner_id = auth.uid()
  ));

create policy "org_members_update_config"
  on public.store_configs for update
  using (organization_id = public.user_organization_id());

-- Products
create policy "org_members_read_products"
  on public.products for select
  using (organization_id = public.user_organization_id());

create policy "org_members_insert_products"
  on public.products for insert
  with check (organization_id = public.user_organization_id());

create policy "org_members_update_products"
  on public.products for update
  using (organization_id = public.user_organization_id());

create policy "org_members_delete_products"
  on public.products for delete
  using (organization_id = public.user_organization_id());

-- Sales
create policy "org_members_read_sales"
  on public.sales for select
  using (organization_id = public.user_organization_id());

create policy "org_members_insert_sales"
  on public.sales for insert
  with check (organization_id = public.user_organization_id());

create policy "org_members_update_sales"
  on public.sales for update
  using (organization_id = public.user_organization_id());

create policy "org_members_delete_sales"
  on public.sales for delete
  using (organization_id = public.user_organization_id());

-- Stock transactions
create policy "org_members_read_transactions"
  on public.stock_transactions for select
  using (organization_id = public.user_organization_id());

create policy "org_members_insert_transactions"
  on public.stock_transactions for insert
  with check (organization_id = public.user_organization_id());

create policy "org_members_update_transactions"
  on public.stock_transactions for update
  using (organization_id = public.user_organization_id());

create policy "org_members_delete_transactions"
  on public.stock_transactions for delete
  using (organization_id = public.user_organization_id());
