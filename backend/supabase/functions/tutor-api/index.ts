import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { ApiError, errorPayload } from '../_shared/errors.ts';
import { generateTutorResponse, groqDiagnostic, reviewTutorResponse } from '../_shared/groq.ts';
import {
  calculateHintLevel,
  hasMeaningfulAttempt,
  needsHumanSupport,
  precheckStudentMessage,
  reportsDifficulty,
  safeFallback,
} from '../_shared/guardrails.ts';
import { maskPersonalData } from '../_shared/pii.ts';
import { PROFILES, type HintLevel, type TutorOutput, type TutorProfile } from '../_shared/types.ts';
import { buildLearningSummary } from '../_shared/summary.ts';

interface AuthContext {
  userId: string;
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
}

const requestIds = new WeakMap<Request, string>();

function env(name: string, fallback?: string): string {
  const value = Deno.env.get(name) ?? fallback;
  if (!value) throw new ApiError(`missing_environment_${name}`, { status: 500 });
  return value;
}

function json(
  request: Request,
  body: unknown,
  status = 200,
  extra: HeadersInit = {},
  requestId?: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      ...extra,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...((requestId ?? requestIds.get(request))
        ? { 'X-Request-Id': requestId ?? requestIds.get(request)! }
        : {}),
    },
  });
}

function textField(
  body: Record<string, unknown>,
  name: string,
  min: number,
  max: number,
): string {
  const value = body[name];
  if (typeof value !== 'string') throw new ApiError(`invalid_${name}`, { status: 400, retryable: false });
  const clean = value.normalize('NFKC').trim();
  if (clean.length < min || clean.length > max) throw new ApiError(`invalid_${name}`, { status: 400, retryable: false });
  return clean;
}

function optionalText(body: Record<string, unknown>, name: string, max: number): string | null {
  const value = body[name];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new ApiError(`invalid_${name}`, { status: 400, retryable: false });
  }
  return value.normalize('NFKC').trim();
}

function uuidField(body: Record<string, unknown>, name = 'session_id'): string {
  const value = body[name];
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(`invalid_${name}`, { status: 400, retryable: false });
  }
  return value;
}

function profileField(value: unknown): TutorProfile {
  if (typeof value !== 'string' || !PROFILES.includes(value as TutorProfile)) {
    throw new ApiError('invalid_profile', { status: 400, retryable: false });
  }
  return value as TutorProfile;
}

function ratingField(body: Record<string, unknown>, name: string): number {
  const value = body[name];
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) {
    throw new ApiError(`invalid_${name}`, { status: 400, retryable: false });
  }
  return Number(value);
}

function integerField(
  body: Record<string, unknown>,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = body[name] ?? fallback;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new ApiError(`invalid_${name}`, { status: 400, retryable: false });
  }
  return Number(value);
}

function optionalTimestamp(body: Record<string, unknown>, name: string): string | null {
  const value = body[name];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new ApiError(`invalid_${name}`, { status: 400, retryable: false });
  }
  return new Date(value).toISOString();
}

async function bodyAsObject(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) {
    throw new ApiError('content_type_must_be_json');
  }
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 20_000) throw new ApiError('request_too_large');
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError('invalid_json');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20_000) {
        await reader.cancel();
        throw new ApiError('request_too_large');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('invalid_json');
  }
}

async function authenticate(request: Request): Promise<AuthContext> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError('missing_bearer_token');

  const url = env('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!publicKey) throw new ApiError('missing_supabase_public_key', { status: 500 });
  if (!secretKey) throw new ApiError('missing_supabase_secret_key', { status: 500 });

  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new ApiError('invalid_or_expired_token');
  // Contas do piloto são provisionadas pela instituição. Cadastro anônimo não basta.
  if (data.user.is_anonymous) throw new ApiError('invalid_or_expired_token');

  const adminClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { userId: data.user.id, userClient, adminClient };
}

async function consumeQuota(ctx: AuthContext): Promise<void> {
  const max = Math.trunc(Math.max(1, Math.min(100, Number(env('RATE_LIMIT_REQUESTS', '12')) || 12)));
  const windowSeconds = Math.max(
    10,
    Math.trunc(Math.min(3600, Number(env('RATE_LIMIT_WINDOW_SECONDS', '60')) || 60)),
  );
  const { data, error } = await ctx.adminClient.rpc('consume_tutor_quota', {
    p_user_id: ctx.userId,
    p_limit: max,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new ApiError('rate_limit_check_failed', { status: 503 });
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.allowed) {
    throw new ApiError('rate_limit_exceeded', {
      retryAfterSeconds: Number(result?.retry_after_seconds ?? 60),
    });
  }
}

async function ownedSession(ctx: AuthContext, sessionId: string) {
  const { data, error } = await ctx.userClient
    .from('tutoring_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (error || !data) throw new ApiError('session_not_found');
  return data;
}

async function createSession(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const subject = maskPersonalData(textField(body, 'subject', 2, 80));
  const activity = maskPersonalData(textField(body, 'activity', 5, 4000));
  if (needsHumanSupport(activity.text)) activity.text = '[CONTEÚDO ENCAMINHADO PARA APOIO HUMANO]';
  if (subject.text.length > 80 || activity.text.length > 4000) throw new ApiError('invalid_activity');
  const profile = profileField(body.profile);
  const consentVersion = textField(body, 'consent_version', 1, 30);
  if (body.privacy_notice_accepted !== true) {
    throw new ApiError('privacy_notice_must_be_accepted');
  }
  const retentionDays = Math.max(1, Math.min(365, Number(env('DATA_RETENTION_DAYS', '90')) || 90));
  const expiresAt = new Date(Date.now() + retentionDays * 86_400_000).toISOString();

  const { data, error } = await ctx.adminClient.from('tutoring_sessions').insert({
    user_id: ctx.userId,
    subject: subject.text,
    activity: activity.text,
    profile,
    consent_version: consentVersion,
    privacy_notice_accepted: true,
    expires_at: expiresAt,
  }).select('*').single();
  if (error || !data) throw new ApiError('session_create_failed', { status: 500 });

  const { error: privacyEventError } = await ctx.adminClient.from('privacy_events').insert({
    user_id: ctx.userId,
    session_id: data.id,
    event_type: 'notice_accepted',
    notice_version: consentVersion,
  });
  if (privacyEventError) {
    await ctx.adminClient.from('tutoring_sessions').delete().eq('id', data.id).eq('user_id', ctx.userId);
    throw new ApiError('privacy_event_save_failed', { status: 500 });
  }

  return json(request, {
    session: data,
    privacy: {
      pii_masked: subject.masked || activity.masked,
      categories: [...new Set([...subject.categories, ...activity.categories])],
      retention_days: retentionDays,
      expires_at: expiresAt,
    },
  }, 201);
}

async function getSession(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const sessionId = uuidField(body);
  const limit = integerField(body, 'limit', 50, 1, 100);
  const beforeId = body.before_message_id === undefined || body.before_message_id === null
    ? null
    : integerField(body, 'before_message_id', 0, 1, Number.MAX_SAFE_INTEGER);
  const session = await ownedSession(ctx, sessionId);
  let query = ctx.userClient
    .from('messages')
    .select('id,role,content,interaction_type,hint_level,safety_status,request_more_help,created_at')
    .eq('session_id', sessionId)
    .order('id', { ascending: false })
    .limit(limit + 1);
  if (beforeId !== null) query = query.lt('id', beforeId);
  const { data: rows, error } = await query;
  if (error) throw new ApiError('messages_read_failed', { status: 500 });
  const hasMore = (rows?.length ?? 0) > limit;
  const page = (rows ?? []).slice(0, limit);
  const messages = [...page].reverse();
  return json(request, {
    session,
    messages,
    pagination: {
      has_more: hasMore,
      next_before_message_id: hasMore && page.length ? page[page.length - 1].id : null,
    },
  });
}

async function listSessions(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const limit = integerField(body, 'limit', 20, 1, 50);
  const before = optionalTimestamp(body, 'before_created_at');
  const beforeId = body.before_session_id ? uuidField(body, 'before_session_id') : null;
  if (Boolean(before) !== Boolean(beforeId)) throw new ApiError('invalid_history_cursor');
  const status = body.status;
  if (status !== undefined && status !== 'active' && status !== 'finished') {
    throw new ApiError('invalid_status', { status: 400, retryable: false });
  }

  let query = ctx.userClient
    .from('tutoring_sessions')
    .select('id,subject,profile,hint_level,status,summary,created_at,updated_at,finished_at,expires_at')
    .eq('user_id', ctx.userId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);
  if (status) query = query.eq('status', status);
  if (before && beforeId) query = query.or(`created_at.lt.${before},and(created_at.eq.${before},id.lt.${beforeId})`);
  const { data: rows, error } = await query;
  if (error) throw new ApiError('history_read_failed', { status: 500 });
  const hasMore = (rows?.length ?? 0) > limit;
  const sessions = (rows ?? []).slice(0, limit);
  return json(request, {
    sessions,
    pagination: {
      has_more: hasMore,
      next_before_created_at: hasMore && sessions.length
        ? sessions[sessions.length - 1].created_at
        : null,
      next_before_session_id: hasMore && sessions.length ? sessions[sessions.length - 1].id : null,
    },
  });
}

async function sendMessage(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const sessionId = uuidField(body);
  const clientRequestId = body.client_request_id === undefined
    ? crypto.randomUUID()
    : uuidField(body, 'client_request_id');
  const session = await ownedSession(ctx, sessionId);
  const content = textField(body, 'content', 1, 6000);
  const requestMoreHelp = body.request_more_help === true;
  if (body.request_more_help !== undefined && typeof body.request_more_help !== 'boolean') throw new ApiError('invalid_request_more_help');
  const precheck = precheckStudentMessage(content);
  const humanSupport = needsHumanSupport(content) || needsHumanSupport(session.activity) || session.activity === '[CONTEÚDO ENCAMINHADO PARA APOIO HUMANO]';
  if (humanSupport) precheck.sanitized = '[CONTEÚDO ENCAMINHADO PARA APOIO HUMANO]';
  if (precheck.sanitized.length > 6000) throw new ApiError('invalid_content');

  const { data: existingStudent, error: existingError } = await ctx.userClient
    .from('messages')
    .select('exchange_id,content,request_more_help')
    .eq('session_id', sessionId)
    .eq('role', 'student')
    .eq('client_request_id', clientRequestId)
    .maybeSingle();
  if (existingError) throw new ApiError('history_read_failed', { status: 500 });
  if (existingStudent?.exchange_id) {
    if (existingStudent.content !== precheck.sanitized || existingStudent.request_more_help !== requestMoreHelp) {
      throw new ApiError('idempotency_key_reused');
    }
    const { data: previousTutor, error: tutorReadError } = await ctx.userClient
      .from('messages')
      .select('content,interaction_type,hint_level,safety_status,safety_flags')
      .eq('session_id', sessionId)
      .eq('exchange_id', existingStudent.exchange_id)
      .eq('role', 'tutor')
      .maybeSingle();
    if (tutorReadError) throw new ApiError('history_read_failed', { status: 500 });
    if (!previousTutor) throw new ApiError('request_in_progress', { retryAfterSeconds: 2 });
    return json(request, {
      tutor: {
        message: previousTutor.content,
        interaction_type: previousTutor.interaction_type,
        hint_level: previousTutor.hint_level,
        requires_student_action: true,
        student_action: 'Continue apresentando seu raciocínio com suas palavras.',
        contains_final_answer: false,
        safety_flags: previousTutor.safety_flags ?? [],
      },
      session: { id: sessionId, hint_level: previousTutor.hint_level, profile: session.profile },
      safety: { status: previousTutor.safety_status, flags: previousTutor.safety_flags },
      availability: { degraded: (previousTutor.safety_flags ?? []).includes('ai_temporarily_unavailable') },
      idempotency: { client_request_id: clientRequestId, replayed: true },
    });
  }

  if (session.status !== 'active') throw new ApiError('session_is_finished');

  const maxHistory = Math.trunc(Math.max(2, Math.min(30, Number(env('MAX_HISTORY_MESSAGES', '12')) || 12)));
  const { data: recent, error: historyError } = await ctx.userClient
    .from('messages')
    .select('role,content,created_at')
    .eq('session_id', sessionId)
    .order('id', { ascending: false })
    .limit(maxHistory);
  if (historyError) throw new ApiError('history_read_failed', { status: 500 });
  const history = [...(recent ?? [])].reverse().map((item) => ({
    role: item.role as 'student' | 'tutor',
    content: String(item.content).slice(0, 1800),
  }));
  while (history.reduce((total, item) => total + item.content.length, 0) > 12000) history.shift();
  let level = calculateHintLevel(Number(session.hint_level), requestMoreHelp,
    reportsDifficulty(precheck.sanitized), history.some((item) => item.role === 'tutor'));
  if (level === 5 && Number(session.hint_level) < 5 && ![...history.filter((item) => item.role === 'student').map((item) => item.content), precheck.sanitized].some(hasMeaningfulAttempt)) {
    level = 4; // Correção comentada exige uma tentativa para comentar.
  }

  let output: TutorOutput;
  let modelId: string | null = null;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let safetyStatus = 'accepted';
  let degradedReason: string | null = null;

  if (humanSupport) {
    output = { ...safeFallback(level, 'human_support_required'), interaction_type: 'safe_refusal',
      message: 'Sua segurança vem primeiro. Procure agora um adulto de confiança ou a equipe de apoio do campus. Se houver perigo imediato, procure o serviço de emergência da sua região.',
      student_action: 'Procure uma pessoa de confiança para apoio presencial.' };
    safetyStatus = 'handoff';
  } else if (precheck.directAnswerRequest || precheck.promptInjection || precheckStudentMessage(session.activity).promptInjection) {
    output = safeFallback(
      level,
      precheck.promptInjection || precheckStudentMessage(session.activity).promptInjection ? 'prompt_injection_blocked' : 'direct_answer_request_blocked',
      session.profile,
    );
    safetyStatus = 'fallback';
  } else {
    try {
      const result = await generateTutorResponse({
        subject: session.subject,
        activity: session.activity,
        profile: session.profile,
        hintLevel: level,
        studentMessage: precheck.sanitized,
        history,
        precheckFlags: precheck.flags,
      });
      output = await reviewTutorResponse(session.activity, precheck.sanitized, result.output, level, history);
      modelId = result.model;
      promptTokens = result.usage.prompt_tokens ?? null;
      completionTokens = result.usage.completion_tokens ?? null;
      if (output.safety_flags.some((flag) => flag.includes('fallback') || flag.includes('review_'))) {
        safetyStatus = 'fallback';
      }
    } catch (error) {
      const diagnostic = groqDiagnostic(error);
      console.warn('tutor_ai_diagnostic', JSON.stringify({
        request_id: requestIds.get(request), stage: 'generation', ...diagnostic,
      }));
      output = safeFallback(level, 'ai_temporarily_unavailable', session.profile);
      output.safety_flags.push(diagnostic.code);
      safetyStatus = 'fallback';
      degradedReason = diagnostic.code;
    }
  }

  let safetyFlags = [...new Set([...precheck.flags, ...output.safety_flags])];
  const { data: persisted, error: persistError } = await ctx.adminClient.rpc('persist_tutor_exchange_v3', {
    p_session_id: sessionId,
    p_user_id: ctx.userId,
    p_client_request_id: clientRequestId,
    p_student_content: precheck.sanitized,
    p_tutor_content: output.message,
    p_interaction_type: output.interaction_type,
    p_hint_level: level,
    p_request_more_help: requestMoreHelp,
    p_safety_status: safetyStatus,
    p_safety_flags: safetyFlags,
    p_model_id: modelId,
    p_prompt_tokens: promptTokens,
    p_completion_tokens: completionTokens,
    p_expected_revision: session.revision,
  });
  if (persistError) {
    if (persistError.message.includes('session_changed')) throw new ApiError('session_changed');
    if (persistError.message.includes('idempotency_key_reused')) throw new ApiError('idempotency_key_reused');
    throw new ApiError('exchange_persist_failed', { status: 500 });
  }

  const persistResult = Array.isArray(persisted) ? persisted[0] : persisted;
  if (persistResult?.duplicate === true) {
    const { data: storedTutor, error: storedError } = await ctx.userClient
      .from('messages')
      .select('content,interaction_type,hint_level,safety_status,safety_flags')
      .eq('id', persistResult.tutor_message_id)
      .single();
    if (storedError || !storedTutor) throw new ApiError('history_read_failed', { status: 500 });
    output = {
      message: storedTutor.content,
      interaction_type: storedTutor.interaction_type,
      hint_level: storedTutor.hint_level,
      requires_student_action: true,
      student_action: 'Continue apresentando seu raciocínio com suas palavras.',
      contains_final_answer: false,
      safety_flags: storedTutor.safety_flags ?? [],
    };
    safetyStatus = storedTutor.safety_status;
    safetyFlags = storedTutor.safety_flags ?? [];
    degradedReason = safetyFlags.includes('ai_temporarily_unavailable') ? 'ai_temporarily_unavailable' : null;
  }

  return json(request, {
    tutor: output,
    session: { id: sessionId, hint_level: output.hint_level, profile: session.profile },
    privacy: { pii_masked: precheck.piiMasked },
    safety: { status: safetyStatus, flags: safetyFlags },
    availability: { degraded: degradedReason !== null, reason: degradedReason },
    idempotency: {
      client_request_id: clientRequestId,
      replayed: persistResult?.duplicate === true,
    },
  });
}

async function updateProfile(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const sessionId = uuidField(body);
  const session = await ownedSession(ctx, sessionId);
  if (session.status !== 'active') throw new ApiError('session_is_finished');
  const profile = profileField(body.profile);
  const { data, error } = await ctx.adminClient.from('tutoring_sessions')
    .update({ profile })
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .eq('revision', session.revision)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .select('*')
    .single();
  if (error || !data) throw new ApiError('session_changed');
  return json(request, { session: data });
}

async function finishSession(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const sessionId = uuidField(body);
  const session = await ownedSession(ctx, sessionId);
  if (session.status === 'finished') return json(request, { session });
  const { count, error: countError } = await ctx.userClient.from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);
  if (countError) throw new ApiError('history_read_failed', { status: 500 });
  const summary = buildLearningSummary(session.subject, body, Math.floor((count ?? 0) / 2));
  const { data, error } = await ctx.adminClient.from('tutoring_sessions')
    .update({ status: 'finished', finished_at: new Date().toISOString(), summary })
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .eq('revision', session.revision)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .select('*')
    .single();
  if (error || !data) throw new ApiError('session_changed');
  return json(request, { session: data });
}

async function submitFeedback(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const sessionId = uuidField(body);
  await ownedSession(ctx, sessionId);
  const comment = optionalText(body, 'comment', 1000);
  const maskedComment = comment ? maskPersonalData(comment).text : null;
  const values = {
    session_id: sessionId,
    user_id: ctx.userId,
    useful: ratingField(body, 'useful'),
    clear: ratingField(body, 'clear'),
    profile_fit: ratingField(body, 'profile_fit'),
    autonomy: ratingField(body, 'autonomy'),
    comment: maskedComment,
  };
  const { data, error } = await ctx.adminClient.from('feedback')
    .upsert(values, { onConflict: 'session_id' })
    .select('*')
    .single();
  if (error || !data) throw new ApiError('feedback_save_failed', { status: 500 });
  return json(request, { feedback: data }, 201);
}

async function deleteSession(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  const sessionId = uuidField(body);
  const session = await ownedSession(ctx, sessionId);
  await ctx.adminClient.from('privacy_events').insert({
    user_id: ctx.userId,
    session_id: null,
    event_type: 'session_deleted',
    notice_version: session.consent_version,
  });
  const { error } = await ctx.adminClient.from('tutoring_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', ctx.userId);
  if (error) throw new ApiError('session_delete_failed', { status: 500 });
  return json(request, { deleted: true, session_id: sessionId });
}

async function getPrivacyStatus(request: Request, _body: Record<string, unknown>, ctx: AuthContext) {
  const retentionDays = Math.max(1, Math.min(365, Number(env('DATA_RETENTION_DAYS', '90')) || 90));
  const [{ count: sessionCount, error: sessionError }, { count: messageCount, error: messageError }] =
    await Promise.all([
      ctx.userClient.from('tutoring_sessions').select('*', { count: 'exact', head: true }),
      ctx.userClient.from('messages').select('*', { count: 'exact', head: true }),
    ]);
  if (sessionError || messageError) throw new ApiError('privacy_status_failed', { status: 500 });
  return json(request, {
    privacy: {
      retention_days: retentionDays,
      session_count: sessionCount ?? 0,
      message_count: messageCount ?? 0,
      stores_ip_address: false,
      stores_auth_token: false,
      automatic_pii_masking: true,
      deletion_available: true,
    },
  });
}

async function deleteAllHistory(request: Request, body: Record<string, unknown>, ctx: AuthContext) {
  if (body.confirmation !== 'APAGAR_MEU_HISTORICO') {
    throw new ApiError('invalid_delete_confirmation');
  }
  const { count, error } = await ctx.adminClient
    .from('tutoring_sessions')
    .delete({ count: 'exact' })
    .eq('user_id', ctx.userId);
  if (error) throw new ApiError('history_delete_failed', { status: 500 });

  const { error: eventError } = await ctx.adminClient.from('privacy_events').insert({
    user_id: ctx.userId,
    session_id: null,
    event_type: 'history_deleted',
    notice_version: 'bulk-delete-v1',
  });
  if (eventError) {
    console.error('privacy_event_write_failed', requestIds.get(request));
  }
  return json(request, { deleted: true, deleted_sessions: count ?? 0 });
}

export async function handleRequest(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  requestIds.set(request, requestId);
  if (!isAllowedOrigin(request)) {
    const error = new ApiError('origin_not_allowed');
    return json(request, errorPayload(error, requestId), error.status, {}, requestId);
  }
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(request) });
  }
  if (request.method !== 'POST') {
    const error = new ApiError('method_not_allowed');
    return json(request, errorPayload(error, requestId), error.status, { Allow: 'POST, OPTIONS' }, requestId);
  }

  try {
    const body = await bodyAsObject(request);
    const action = body.action;
    if (action === 'health') {
      return json(request, { service: 'tutor-api', status: 'ok', version: '1.2.0-rc.1', build: 'groq20b-grounding-r4' });
    }
    if (typeof action !== 'string') throw new ApiError('invalid_action');

    const ctx = await authenticate(request);
    await consumeQuota(ctx);

    switch (action) {
      case 'create_session':
        return await createSession(request, body, ctx);
      case 'get_session':
        return await getSession(request, body, ctx);
      case 'list_sessions':
        return await listSessions(request, body, ctx);
      case 'send_message':
        return await sendMessage(request, body, ctx);
      case 'update_profile':
        return await updateProfile(request, body, ctx);
      case 'finish_session':
        return await finishSession(request, body, ctx);
      case 'submit_feedback':
        return await submitFeedback(request, body, ctx);
      case 'delete_session':
        return await deleteSession(request, body, ctx);
      case 'get_privacy_status':
        return await getPrivacyStatus(request, body, ctx);
      case 'delete_all_history':
        return await deleteAllHistory(request, body, ctx);
      default:
        throw new ApiError('unknown_action');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      const headers: HeadersInit = error.retryAfterSeconds
        ? { 'Retry-After': String(error.retryAfterSeconds) }
        : {};
      return json(request, errorPayload(error, requestId), error.status, headers, requestId);
    }
    console.error('tutor_api_unhandled', {
      request_id: requestId,
      name: error instanceof Error ? error.name : 'unknown',
    });
    const internal = new ApiError('internal_error');
    return json(request, errorPayload(internal, requestId), 500, {}, requestId);
  }
}

if (import.meta.main) Deno.serve(handleRequest);
