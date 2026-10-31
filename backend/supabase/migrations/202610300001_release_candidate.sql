begin;

-- Falha explícita se o schema antigo do Apps Script tiver sido usado neste banco.
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tutoring_sessions' and column_name = 'user_id') then
    raise exception 'Use um projeto separado para a RC; schema legado não é compatível.';
  end if;
end $$;

alter table public.tutoring_sessions add column if not exists revision bigint not null default 0;
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  new.revision = old.revision + 1;
  return new;
end;
$$;

-- Expiração bloqueia leitura imediatamente, mesmo antes da limpeza agendada.
drop policy if exists "owner reads sessions" on public.tutoring_sessions;
create policy "owner reads sessions" on public.tutoring_sessions for select to authenticated
using ((select auth.uid()) = user_id and expires_at > now());
drop policy if exists "owner reads messages" on public.messages;
create policy "owner reads messages" on public.messages for select to authenticated
using ((select auth.uid()) = user_id and exists (
  select 1 from public.tutoring_sessions s where s.id = session_id and s.user_id = (select auth.uid()) and s.expires_at > now()
));
drop policy if exists "owner reads feedback" on public.feedback;
create policy "owner reads feedback" on public.feedback for select to authenticated
using ((select auth.uid()) = user_id and exists (
  select 1 from public.tutoring_sessions s where s.id = session_id and s.user_id = (select auth.uid()) and s.expires_at > now()
));

create or replace function public.persist_tutor_exchange_v3(
  p_session_id uuid, p_user_id uuid, p_client_request_id uuid,
  p_student_content text, p_tutor_content text, p_interaction_type text,
  p_hint_level smallint, p_request_more_help boolean, p_safety_status text,
  p_safety_flags text[], p_model_id text, p_prompt_tokens integer,
  p_completion_tokens integer, p_expected_revision bigint
)
returns table(exchange_id uuid, student_message_id bigint, tutor_message_id bigint, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_session public.tutoring_sessions%rowtype;
  v_student public.messages%rowtype;
  v_exchange uuid;
  v_student_id bigint;
  v_tutor_id bigint;
begin
  select * into v_session from public.tutoring_sessions
    where id = p_session_id and user_id = p_user_id for update;
  if not found or v_session.expires_at <= now() then raise exception 'session_changed'; end if;

  select * into v_student from public.messages m
    where m.session_id = p_session_id and m.user_id = p_user_id
      and m.role = 'student' and m.client_request_id = p_client_request_id;
  if found then
    if v_student.content <> p_student_content or v_student.request_more_help <> p_request_more_help then
      raise exception 'idempotency_key_reused';
    end if;
    select m.id into v_tutor_id from public.messages m
      where m.session_id = p_session_id and m.exchange_id = v_student.exchange_id and m.role = 'tutor';
    return query select v_student.exchange_id, v_student.id, v_tutor_id, true;
    return;
  end if;

  if p_expected_revision is null or p_client_request_id is null or v_session.status <> 'active' or v_session.revision <> p_expected_revision then
    raise exception 'session_changed';
  end if;
  if p_hint_level is null or p_hint_level < 0 or p_hint_level > least(5, v_session.hint_level + 1) then
    raise exception 'invalid_hint_level';
  end if;
  if not exists (select 1 from public.messages where session_id = p_session_id and role = 'tutor')
    and p_hint_level <> 0 then raise exception 'diagnostic_required'; end if;

  v_exchange := gen_random_uuid();
  insert into public.messages(session_id,user_id,role,content,hint_level,request_more_help,
    safety_status,safety_flags,exchange_id,client_request_id)
  values (p_session_id,p_user_id,'student',p_student_content,p_hint_level,p_request_more_help,
    p_safety_status,p_safety_flags,v_exchange,p_client_request_id) returning id into v_student_id;
  insert into public.messages(session_id,user_id,role,content,interaction_type,hint_level,
    safety_status,safety_flags,model_id,prompt_tokens,completion_tokens,exchange_id)
  values (p_session_id,p_user_id,'tutor',p_tutor_content,p_interaction_type,p_hint_level,
    p_safety_status,p_safety_flags,p_model_id,p_prompt_tokens,p_completion_tokens,v_exchange) returning id into v_tutor_id;
  update public.tutoring_sessions set hint_level = greatest(hint_level,p_hint_level)
    where id = p_session_id and user_id = p_user_id;
  return query select v_exchange,v_student_id,v_tutor_id,false;
end;
$$;

revoke all on function public.persist_tutor_exchange_v3(uuid,uuid,uuid,text,text,text,smallint,boolean,text,text[],text,integer,integer,bigint) from public,anon,authenticated;
grant execute on function public.persist_tutor_exchange_v3(uuid,uuid,uuid,text,text,text,smallint,boolean,text,text[],text,integer,integer,bigint) to service_role;
-- Remove as rotas internas antigas que não verificavam revisão nem expiração.
revoke execute on function public.persist_tutor_exchange(uuid,uuid,text,text,text,smallint,boolean,text,text[],text,integer,integer) from service_role;
revoke execute on function public.persist_tutor_exchange_v2(uuid,uuid,uuid,text,text,text,smallint,boolean,text,text[],text,integer,integer) from service_role;

commit;
