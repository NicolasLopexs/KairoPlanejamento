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
  archived_at timestamptz,
  contact_email text,
  created_at timestamptz not null default now()
);

-- Se a tabela já existia antes destas colunas, garante que apareçam.
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.clients add column if not exists contact_email text;

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
  email text,
  created_at timestamptz not null default now()
);

-- Se a tabela já existia (projeto criado antes desta versão do schema),
-- garante que a coluna email exista. Seguro rodar de novo quantas vezes quiser.
alter table public.profiles add column if not exists email text;

-- Cria automaticamente um perfil (role client, sem client_id) quando alguém
-- se cadastra pelo Supabase Auth. A equipe promove pra staff ou associa a um
-- cliente depois (veja instruções no README).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
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
drop policy if exists "staff manages clients" on public.clients;
create policy "staff manages clients" on public.clients
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "client reads own client row" on public.clients;
create policy "client reads own client row" on public.clients
  for select using (id = public.my_client_id());

-- ---- profiles ----
drop policy if exists "user reads own profile" on public.profiles;
create policy "user reads own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "staff reads all profiles" on public.profiles;
create policy "staff reads all profiles" on public.profiles
  for select using (public.is_staff());

drop policy if exists "staff manages profiles" on public.profiles;
create policy "staff manages profiles" on public.profiles
  for update using (public.is_staff()) with check (public.is_staff());

-- ---- feed_posts ----
drop policy if exists "staff manages feed_posts" on public.feed_posts;
create policy "staff manages feed_posts" on public.feed_posts
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "client reads own feed_posts" on public.feed_posts;
create policy "client reads own feed_posts" on public.feed_posts
  for select using (client_id = public.my_client_id());

drop policy if exists "client updates own feed_posts" on public.feed_posts;
create policy "client updates own feed_posts" on public.feed_posts
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- ---- stories_template ----
drop policy if exists "staff manages stories_template" on public.stories_template;
create policy "staff manages stories_template" on public.stories_template
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "client reads own stories_template" on public.stories_template;
create policy "client reads own stories_template" on public.stories_template
  for select using (client_id = public.my_client_id());

drop policy if exists "client updates own stories_template" on public.stories_template;
create policy "client updates own stories_template" on public.stories_template
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- ---- capture_guide ----
drop policy if exists "staff manages capture_guide" on public.capture_guide;
create policy "staff manages capture_guide" on public.capture_guide
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "client reads own capture_guide" on public.capture_guide;
create policy "client reads own capture_guide" on public.capture_guide
  for select using (client_id = public.my_client_id());

drop policy if exists "client updates own capture_guide" on public.capture_guide;
create policy "client updates own capture_guide" on public.capture_guide
  for update using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- ============================================================
-- 8. Avisos por e-mail (Fase 2)
--    Extensões pg_net (chamar HTTP a partir do banco) e pg_cron (agendar
--    tarefas) precisam estar habilitadas — normalmente já vêm assim em
--    projetos Supabase recentes; se der erro aqui, habilite as duas em
--    Database > Extensions no painel antes de rodar este bloco.
--
--    A service_role key fica guardada no Supabase Vault (tabela
--    vault.secrets, nome 'service_role_key') em vez de escrita direto
--    aqui — veja README para o passo de configurar isso uma vez.
-- ============================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Dispara quando o status de um post muda, chamando a Edge Function
-- notify-status-change (que só manda e-mail se o cliente tiver
-- contact_email preenchido).
create or replace function public.notify_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  service_key text;
begin
  if new.status is distinct from old.status then
    select decrypted_secret into service_key from vault.decrypted_secrets where name = 'service_role_key';
    if service_key is not null then
      perform net.http_post(
        url := 'https://radciehalkupwltjuaja.supabase.co/functions/v1/notify-status-change',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
        body := jsonb_build_object(
          'post_id', new.id,
          'client_id', new.client_id,
          'old_status', old.status,
          'new_status', new.status
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_feed_post_status_change on public.feed_posts;
create trigger on_feed_post_status_change
  after update on public.feed_posts
  for each row execute procedure public.notify_status_change();

-- Job diário (12:00 UTC ~ 09:00 no horário de Brasília) que chama a Edge
-- Function notify-upcoming-posts, avisando sobre posts com data pra
-- amanhã que ainda estão como "planejado". cron.schedule com um nome que
-- já existe substitui o agendamento antigo (idempotente).
do $$
declare service_key text;
begin
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'service_role_key';
  if service_key is not null then
    perform cron.schedule(
      'notify-upcoming-posts-daily',
      '0 12 * * *',
      format(
        $sql$select net.http_post(
          url := 'https://radciehalkupwltjuaja.supabase.co/functions/v1/notify-upcoming-posts',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer %s'),
          body := '{}'::jsonb
        );$sql$,
        service_key
      )
    );
  end if;
end $$;

-- ============================================================
-- 9. Histórico de alterações (Fase 3)
--    Só staff lê. Escrita só acontece pelo trigger abaixo (security
--    definer), então não existe policy de insert pra client/staff.
--
--    client_id de propósito SEM foreign key: é um log de auditoria, deve
--    sobreviver mesmo se o cliente original for apagado de verdade (via
--    SQL direto — pelo painel só existe "arquivar"). Com FK + cascade,
--    apagar um cliente quebrava, porque o trigger de feed_posts/stories/
--    capture_guide tenta inserir no log referenciando um client_id que
--    está sendo removido no mesmo cascade.
-- ============================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  table_name text not null,
  row_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete', 'error')),
  actor_id uuid references public.profiles (id) on delete set null,
  summary text not null,
  created_at timestamptz not null default now()
);

-- 'error' foi adicionado depois (Fase 4) — as Edge Functions de notificação
-- registram aqui quando um e-mail falha ao enviar, pra ficar visível na aba
-- Histórico em vez de falhar em silêncio.
alter table public.activity_log drop constraint if exists activity_log_action_check;
alter table public.activity_log add constraint activity_log_action_check
  check (action in ('insert', 'update', 'delete', 'error'));

alter table public.activity_log drop constraint if exists activity_log_client_id_fkey;
alter table public.activity_log enable row level security;

drop policy if exists "staff reads activity_log" on public.activity_log;
create policy "staff reads activity_log" on public.activity_log
  for select using (public.is_staff());

-- Registra inserts/deletes sempre, e updates só quando algum campo de
-- conteúdo de verdade mudou (ignora sort_order/updated_at/created_at, pra
-- não poluir o histórico com reordenação por arrastar).
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cid uuid;
  changes text;
begin
  if tg_op = 'DELETE' then
    cid := old.client_id;
    insert into public.activity_log (client_id, table_name, row_id, action, actor_id, summary)
    values (cid, tg_table_name, old.id, 'delete', auth.uid(), 'removeu o item');
    return old;
  end if;

  if tg_op = 'INSERT' then
    insert into public.activity_log (client_id, table_name, row_id, action, actor_id, summary)
    values (new.client_id, tg_table_name, new.id, 'insert', auth.uid(), 'criou o item');
    return new;
  end if;

  select string_agg(format('%s: "%s" → "%s"', o.key, left(o.value, 60), left(n.value, 60)), '; ')
  into changes
  from jsonb_each_text(to_jsonb(old)) o
  join jsonb_each_text(to_jsonb(new)) n using (key)
  where o.key not in ('updated_at', 'created_at', 'id', 'client_id', 'sort_order')
    and o.value is distinct from n.value;

  if changes is not null then
    insert into public.activity_log (client_id, table_name, row_id, action, actor_id, summary)
    values (new.client_id, tg_table_name, new.id, 'update', auth.uid(), changes);
  end if;
  return new;
end;
$$;

drop trigger if exists on_feed_posts_activity on public.feed_posts;
create trigger on_feed_posts_activity
  after insert or update or delete on public.feed_posts
  for each row execute procedure public.log_activity();

drop trigger if exists on_stories_template_activity on public.stories_template;
create trigger on_stories_template_activity
  after insert or update or delete on public.stories_template
  for each row execute procedure public.log_activity();

drop trigger if exists on_capture_guide_activity on public.capture_guide;
create trigger on_capture_guide_activity
  after insert or update or delete on public.capture_guide
  for each row execute procedure public.log_activity();
