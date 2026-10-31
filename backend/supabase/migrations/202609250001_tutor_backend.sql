begin;

do $$ begin
  if to_regclass('public.tutoring_sessions') is not null and not exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='tutoring_sessions' and column_name='user_id'
  ) then
    raise exception 'Schema legado incompatível. Use um projeto Supabase separado para a RC.';
  end if;
end $$;

create extension if not exists pgcrypto;

do $$ begin
  create type public.tutor_profile as enum ('direct', 'supportive', 'investigative');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tutor_session_status as enum ('active', 'finished');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tutor_message_role as enum ('student', 'tutor');
exception when duplicate_object then null;
end $$;

create table if not exists public.tutoring_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 2 and 80),
  profile public.tutor_profile not null,
  activity text not null check (char_length(activity) between 5 and 4000),
  hint_level smallint not null default 0 check (hint_level between 0 and 5),
  status public.tutor_session_status not null default 'active',
  consent_version text not null check (char_length(consent_version) between 1 and 30),
  privacy_notice_accepted boolean not null check (privacy_notice_accepted = true),
  summary text check (summary is null or char_length(summary) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists tutoring_sessions_user_created_idx
  on public.tutoring_sessions (user_id, created_at desc);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.tutoring_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tutor_message_role not null,
  content text not null check (char_length(content) between 1 and 6000),
  interaction_type text,
  hint_level smallint check (hint_level between 0 and 5),
  safety_status text not null default 'accepted',
  safety_flags text[] not null default '{}',
  request_more_help boolean not null default false,
  model_id text,
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists messages_session_created_idx
  on public.messages (session_id, created_at asc);
create index if not exists messages_user_created_idx
  on public.messages (user_id, created_at desc);

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  session_id uuid not null unique references public.tutoring_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  useful smallint not null check (useful between 1 and 5),
  clear smallint not null check (clear between 1 and 5),
  profile_fit smallint not null check (profile_fit between 1 and 5),
  autonomy smallint not null check (autonomy between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.tutoring_sessions(id) on delete cascade,
  event_type text not null check (event_type in ('notice_accepted', 'session_deleted')),
  notice_version text not null check (char_length(notice_version) between 1 and 30),
  created_at timestamptz not null default now()
);

create index if not exists privacy_events_user_created_idx
  on public.privacy_events (user_id, created_at desc);

create table if not exists public.api_usage_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, window_started_at)
);

alter table public.tutoring_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.feedback enable row level security;
alter table public.privacy_events enable row level security;
alter table public.api_usage_windows enable row level security;

drop policy if exists "owner reads sessions" on public.tutoring_sessions;
create policy "owner reads sessions"
  on public.tutoring_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "owner reads messages" on public.messages;
create policy "owner reads messages"
  on public.messages for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "owner reads feedback" on public.feedback;
create policy "owner reads feedback"
  on public.feedback for select to authenticated
  using ((select auth.uid()) = user_id);

-- Escritas são realizadas apenas pela Edge Function, após validação do JWT e da propriedade.
revoke all on public.tutoring_sessions from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.feedback from anon, authenticated;
revoke all on public.privacy_events from anon, authenticated;
revoke all on public.api_usage_windows from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.tutoring_sessions, public.messages, public.feedback to authenticated;

grant select, insert, update, delete on
  public.tutoring_sessions,
  public.messages,
  public.feedback,
  public.privacy_events,
  public.api_usage_windows
to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tutoring_sessions_updated_at on public.tutoring_sessions;
create trigger set_tutoring_sessions_updated_at
before update on public.tutoring_sessions
for each row execute function public.set_updated_at();

create or replace function public.consume_tutor_quota(
  p_user_id uuid,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, request_count integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window timestamptz;
  v_count integer;
  v_retry integer;
begin
  if p_limit < 1 or p_limit > 1000 or p_window_seconds < 10 or p_window_seconds > 3600 then
    raise exception 'invalid quota parameters';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_usage_windows(user_id, window_started_at, request_count)
  values (p_user_id, v_window, 1)
  on conflict (user_id, window_started_at)
  do update set request_count = public.api_usage_windows.request_count + 1
  returning public.api_usage_windows.request_count into v_count;

  v_retry := greatest(
    1,
    ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - v_now)))::integer
  );

  return query select v_count <= p_limit, v_count, v_retry;
end;
$$;

revoke all on function public.consume_tutor_quota(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_tutor_quota(uuid, integer, integer) to service_role;

create or replace function public.persist_tutor_exchange(
  p_session_id uuid,
  p_user_id uuid,
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
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.tutoring_sessions
    where id = p_session_id and user_id = p_user_id and status = 'active'
    for update
  ) then
    raise exception 'session_not_available';
  end if;

  insert into public.messages(
    session_id, user_id, role, content, hint_level,
    request_more_help, safety_status, safety_flags
  ) values (
    p_session_id, p_user_id, 'student', p_student_content, p_hint_level,
    p_request_more_help, 'accepted', p_safety_flags
  );

  insert into public.messages(
    session_id, user_id, role, content, interaction_type, hint_level,
    safety_status, safety_flags, model_id, prompt_tokens, completion_tokens
  ) values (
    p_session_id, p_user_id, 'tutor', p_tutor_content, p_interaction_type, p_hint_level,
    p_safety_status, p_safety_flags, p_model_id, p_prompt_tokens, p_completion_tokens
  );

  update public.tutoring_sessions
  set hint_level = greatest(hint_level, p_hint_level)
  where id = p_session_id and user_id = p_user_id;
end;
$$;

revoke all on function public.persist_tutor_exchange(
  uuid, uuid, text, text, text, smallint, boolean, text, text[], text, integer, integer
) from public, anon, authenticated;
grant execute on function public.persist_tutor_exchange(
  uuid, uuid, text, text, text, smallint, boolean, text, text[], text, integer, integer
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
  where created_at < now() - make_interval(days => p_retention_days);
  get diagnostics v_deleted = row_count;

  delete from public.api_usage_windows
  where window_started_at < now() - interval '2 days';

  return v_deleted;
end;
$$;

revoke all on function public.delete_expired_tutor_data(integer) from public, anon, authenticated;
grant execute on function public.delete_expired_tutor_data(integer) to service_role;

commit;
