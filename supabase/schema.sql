-- Cronograma de Clientes — schema inicial
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (Supabase Dashboard > SQL Editor > New query).
-- Pode colar e rodar tudo de uma vez.

-- ============================================================
-- 1. Tabela de clientes
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. Perfis (liga cada login do Supabase Auth a um papel + cliente)
--    role = 'staff'  -> vê e gerencia todos os clientes
--    role = 'client' -> vê/edita só o cronograma do client_id dele
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('staff', 'client')),
  client_id uuid references public.clients (id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Cria automaticamente um perfil (role client, sem client_id) quando alguém
-- se cadastra pelo Supabase Auth. A equipe promove pra staff ou associa a um
-- cliente depois (veja instruções no README).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 3. Cronograma de feed
-- ============================================================
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  post_date date not null,
  weekday text not null,
  week_label text not null,
  format text not null default 'Reels',
  pillar text not null default 'Jogo',
  tema text not null default '',
  legenda text not null default '',
  status text not null default 'planejado' check (status in ('planejado', 'gravado', 'editado', 'postado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feed_posts_set_updated_at on public.feed_posts;
create trigger feed_posts_set_updated_at
  before update on public.feed_posts
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 4. Guia semanal de stories
-- ============================================================
create table if not exists public.stories_template (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  weekday text not null,
  tipo text not null default '',
  ideia text not null default '',
  sort_order int not null default 0
);

-- ============================================================
-- 5. Orientações de captação
-- ============================================================
create table if not exists public.capture_guide (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  momento text not null default '',
  detalhe text not null default '',
  sort_order int not null default 0
);

-- ============================================================
-- 6. Funções auxiliares para as políticas de acesso (RLS)
--    security definer -> evita recursão ao consultar a própria tabela profiles
-- ============================================================
create or replace function public.is_staff()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'staff'
  );
$$;

create or replace function public.my_client_id()
returns uuid
language sql security definer set search_path = public stable
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- 7. Ativa RLS (Row Level Security) em tudo
-- ============================================================
alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.feed_posts enable row level security;
alter table public.stories_template enable row level security;
alter table public.capture_guide enable row level security;

-- ---- clients ----
create policy "staff manages clients" on public.clients
  for all using (public.is_staff()) with check (public.is_staff());

create policy "client reads own client row" on public.clients
  for select using (id = public.my_client_id());

-- ---- profiles ----
create policy "user reads own profile" on public.profiles
  for select using (id = auth.uid());

create policy "staff reads all profiles" on public.profiles
  for select using (public.is_staff());

create policy "staff manages profiles" on public.profiles
  for update using (public.is_staff()) with check (public.is_staff());

-- ---- feed_posts ----
create policy "staff manages feed_posts" on public.feed_posts
  for all using (public.is_staff()) with check (public.is_staff());

create policy "client reads own feed_posts" on public.feed_posts
  for select using (client_id = public.my_client_id());

create policy "client updates own feed_posts" on public.feed_posts
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- ---- stories_template ----
create policy "staff manages stories_template" on public.stories_template
  for all using (public.is_staff()) with check (public.is_staff());

create policy "client reads own stories_template" on public.stories_template
  for select using (client_id = public.my_client_id());

create policy "client updates own stories_template" on public.stories_template
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- ---- capture_guide ----
create policy "staff manages capture_guide" on public.capture_guide
  for all using (public.is_staff()) with check (public.is_staff());

create policy "client reads own capture_guide" on public.capture_guide
  for select using (client_id = public.my_client_id());

create policy "client updates own capture_guide" on public.capture_guide
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());
