begin;

alter table public.tutoring_sessions
  add column if not exists expires_at timestamptz;

update public.tutoring_sessions
set expires_at = created_at + interval '90 days'
where expires_at is null;

alter table public.tutoring_sessions
  alter column expires_at set default (now() + interval '90 days'),
  alter column expires_at set not null;

create index if not exists tutoring_sessions_user_history_idx
  on public.tutoring_sessions (user_id, created_at desc, id desc);
create index if not exists tutoring_sessions_expiry_idx
  on public.tutoring_sessions (expires_at);

alter table public.messages
  add column if not exists exchange_id uuid,
  add column if not exists client_request_id uuid;

create unique index if not exists messages_student_idempotency_idx
  on public.messages (session_id, user_id, client_request_id)
  where role = 'student' and client_request_id is not null;
create index if not exists messages_exchange_idx
  on public.messages (session_id, exchange_id)
  where exchange_id is not null;

alter table public.privacy_events
  drop constraint if exists privacy_events_event_type_check;
alter table public.privacy_events
  add constraint privacy_events_event_type_check
  check (event_type in ('notice_accepted', 'session_deleted', 'history_deleted'));

create or replace function public.persist_tutor_exchange_v2(
  p_session_id uuid,
  p_user_id uuid,
  p_client_request_id uuid,
  p_student_content text,
  p_tutor_content text,
  p_interaction_type text,
  p_hint_level smallint,
  p_request_more_help boolean,
  p_safety_status text,
  p_safety_flags text[],
  p_model_id text,
  p_prompt_tokens integer,
  p_completion_tokens integer
)
returns table(exchange_id uuid, student_message_id bigint, tutor_message_id bigint, duplicate boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exchange_id uuid;
  v_student_id bigint;
  v_tutor_id bigint;
begin
  perform 1 from public.tutoring_sessions
  where id = p_session_id and user_id = p_user_id and status = 'active'
  for update;

  if not found then
    raise exception 'session_not_available';
  end if;

  select m.exchange_id, m.id
  into v_exchange_id, v_student_id
  from public.messages m
  where m.session_id = p_session_id
    and m.user_id = p_user_id
    and m.role = 'student'
    and m.client_request_id = p_client_request_id;

  if found then
    select m.id into v_tutor_id
    from public.messages m
    where m.session_id = p_session_id
      and m.exchange_id = v_exchange_id
      and m.role = 'tutor'
    limit 1;
    return query select v_exchange_id, v_student_id, v_tutor_id, true;
    return;
  end if;

  v_exchange_id := gen_random_uuid();

  insert into public.messages(
    session_id, user_id, role, content, hint_level, request_more_help,
    safety_status, safety_flags, exchange_id, client_request_id
  ) values (
    p_session_id, p_user_id, 'student', p_student_content, p_hint_level,
    p_request_more_help, 'accepted', p_safety_flags, v_exchange_id, p_client_request_id
  ) returning id into v_student_id;

  insert into public.messages(
    session_id, user_id, role, content, interaction_type, hint_level,
    safety_status, safety_flags, model_id, prompt_tokens, completion_tokens, exchange_id
  ) values (
    p_session_id, p_user_id, 'tutor', p_tutor_content, p_interaction_type, p_hint_level,
    p_safety_status, p_safety_flags, p_model_id, p_prompt_tokens, p_completion_tokens,
    v_exchange_id
  ) returning id into v_tutor_id;

  update public.tutoring_sessions
  set hint_level = greatest(hint_level, p_hint_level)
  where id = p_session_id and user_id = p_user_id;

  return query select v_exchange_id, v_student_id, v_tutor_id, false;
end;
$$;

revoke all on function public.persist_tutor_exchange_v2(
  uuid, uuid, uuid, text, text, text, smallint, boolean, text, text[], text, integer, integer
) from public, anon, authenticated;
grant execute on function public.persist_tutor_exchange_v2(
  uuid, uuid, uuid, text, text, text, smallint, boolean, text, text[], text, integer, integer
) to service_role;

create or replace function public.delete_expired_tutor_data(p_retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_retention_days < 1 or p_retention_days > 3650 then
    raise exception 'invalid retention period';
  end if;

  delete from public.tutoring_sessions
  where expires_at <= now()
     or (expires_at is null and created_at < now() - make_interval(days => p_retention_days));
  get diagnostics v_deleted = row_count;

  delete from public.api_usage_windows
  where window_started_at < now() - interval '2 days';

  delete from public.privacy_events
  where created_at < now() - interval '365 days';

  return v_deleted;
end;
$$;

commit;
