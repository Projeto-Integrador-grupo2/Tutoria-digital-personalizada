begin;

-- A lista de autorização fica fora do esquema exposto ao navegador.
create schema if not exists tutor_private;
revoke all on schema tutor_private from public, anon, authenticated;

create table if not exists tutor_private.signup_approvals (
  email_hash text primary key check (email_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (expires_at > created_at)
);
alter table tutor_private.signup_approvals enable row level security;
revoke all on tutor_private.signup_approvals from public, anon, authenticated;
grant usage on schema tutor_private to supabase_auth_admin, service_role;
grant select on tutor_private.signup_approvals to supabase_auth_admin;
grant select, insert, update, delete on tutor_private.signup_approvals to service_role;
drop policy if exists "auth reads signup approvals" on tutor_private.signup_approvals;
create policy "auth reads signup approvals" on tutor_private.signup_approvals
  for select to supabase_auth_admin using (true);

-- Ativar em Authentication > Hooks > Before User Created ANTES de liberar signups.
-- Não registra IP, senha, código de confirmação ou conteúdo do evento.
create or replace function public.hook_tutor_before_user_created(event jsonb)
returns jsonb language plpgsql security invoker
set search_path = pg_catalog, tutor_private
as $$
declare
  normalized_email text;
  expected_hash text;
begin
  if jsonb_typeof(event #> '{user,email}') = 'string' then
    normalized_email := lower(btrim(event #>> '{user,email}'));
  end if;
  if normalized_email is null or char_length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or event #>> '{user,is_anonymous}' = 'true' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'Cadastro indisponível para este endereço. Procure o responsável pelo piloto.'));
  end if;
  expected_hash := encode(sha256(convert_to(normalized_email, 'UTF8')), 'hex');
  if not exists (select 1 from tutor_private.signup_approvals
    where email_hash = expected_hash and expires_at > now()) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'Cadastro indisponível para este endereço. Procure o responsável pelo piloto.'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.hook_tutor_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_tutor_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

commit;
