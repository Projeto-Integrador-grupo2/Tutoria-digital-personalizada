begin;

-- Política solicitada: qualquer e-mail válido, com confirmação pelo Supabase Auth.
-- Esta substituição também remove a restrição caso o hook anterior já tenha sido ativado.
-- A confirmação da posse do endereço depende de Confirm Email = ON no Auth.
create or replace function public.hook_tutor_before_user_created(event jsonb)
returns jsonb language plpgsql security invoker
set search_path = pg_catalog
as $$
declare
  normalized_email text;
begin
  if jsonb_typeof(event #> '{user,email}') = 'string' then
    normalized_email := lower(btrim(event #>> '{user,email}'));
  end if;
  if normalized_email is null or char_length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or event #>> '{user,is_anonymous}' = 'true' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 400, 'message', 'O cadastro exige um endereço de e-mail válido.'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.hook_tutor_before_user_created(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_tutor_before_user_created(jsonb) to supabase_auth_admin;

-- A função deixa de consultar aprovações. Registros antigos são preservados, sem uso no cadastro.
do $$ begin
  if to_regclass('tutor_private.signup_approvals') is not null then
    revoke select on tutor_private.signup_approvals from supabase_auth_admin;
  end if;
  if exists (select 1 from pg_namespace where nspname = 'tutor_private') then
    revoke usage on schema tutor_private from supabase_auth_admin;
  end if;
end $$;

commit;
