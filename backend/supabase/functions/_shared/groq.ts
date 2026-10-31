import { buildGroqMessages, buildReviewPrompt, buildReviewSystemPrompt, buildOutputSchema, REVIEW_FLAGS, REVIEW_SCHEMA } from './prompts.ts';
import { safeFallback, validateTutorOutput } from './guardrails.ts';
import type { GroqResult, HintLevel, HistoryItem, PromptContext, TutorOutput } from './types.ts';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqApiResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string; code?: string };
}

export class GroqError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly providerCode: string | null;
  readonly validationCode: string | null;
  constructor(code: string, status: number | null, retryable: boolean, providerCode: string | null = null, validationCode: string | null = null) {
    super(code);
    this.name = 'GroqError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.providerCode = providerCode;
    this.validationCode = validationCode;
  }
}

const PROVIDER_CODES = new Set([
  'invalid_api_key', 'model_not_found', 'model_decommissioned', 'model_permission_blocked',
  'model_not_allowed', 'insufficient_quota', 'rate_limit_exceeded', 'json_validate_failed',
  'invalid_request_error', 'organization_restricted', 'account_restricted', 'permission_denied',
]);
const VALIDATION_CODES = new Set([
  'output_not_object', 'invalid_message', 'message_too_long', 'invalid_interaction_type',
  'hint_level_escalation', 'hint_level_mismatch', 'student_action_required',
  'invalid_student_action', 'student_action_too_long', 'self_reported_final_answer',
  'invalid_safety_flags', 'masked_output_too_long', 'interaction_level_mismatch',
  'isolated_final_answer', 'final_answer_pattern', 'excessive_ready_code', 'no_student_action_language',
]);

// Somente categorias previamente autorizadas. Nunca incluir error.message nem resposta bruta.
export function groqDiagnostic(error: unknown) {
  let code = 'ai_unexpected_failure';
  let httpStatus: number | null = null;
  let providerCode: string | null = null;
  let validationCode: string | null = null;
  if (error instanceof GroqError) {
    httpStatus = Number.isInteger(error.status) && Number(error.status) >= 100 && Number(error.status) <= 599 ? error.status : null;
    const localCodes: Record<string, string> = {
      groq_missing_api_key: 'ai_configuration_missing',
      groq_invalid_json: 'ai_invalid_json',
      groq_empty_response: 'ai_empty_response',
      groq_output_truncated: 'ai_output_truncated',
      groq_output_rejected: 'ai_output_rejected',
      groq_timeout: 'ai_timeout',
      groq_network_or_timeout: 'ai_network_failure',
    };
    code = localCodes[error.code] ?? (httpStatus === 401 ? 'ai_authentication_failed'
      : httpStatus === 403 ? 'ai_access_denied'
      : httpStatus === 404 ? 'ai_model_unavailable'
      : httpStatus === 429 ? 'ai_rate_limited'
      : httpStatus !== null && httpStatus >= 500 ? 'ai_provider_unavailable'
      : httpStatus !== null && httpStatus >= 400 ? 'ai_request_rejected' : 'ai_unexpected_failure');
    providerCode = error.providerCode && PROVIDER_CODES.has(error.providerCode) ? error.providerCode : null;
    validationCode = error.validationCode && VALIDATION_CODES.has(error.validationCode) ? error.validationCode : null;
  }
  return { code, http_status: httpStatus, provider_code: providerCode, validation_code: validationCode };
}

function env(name: string, fallback?: string): string {
  const value = (Deno.env.get(name) ?? fallback)?.trim();
  if (!value && name === 'GROQ_API_KEY') throw new GroqError('groq_missing_api_key', null, false);
  if (!value) throw new Error(`missing_environment_${name}`);
  return value;
}

function cleanJson(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(4000, retryAfter * 1000);
  return Math.min(4000, 300 * 2 ** attempt + Math.floor(Math.random() * 200));
}

async function requestGroq(body: Record<string, unknown>, attempts = 2): Promise<GroqApiResponse> {
  const apiKey = env('GROQ_API_KEY');
  let lastError = 'groq_unavailable';
  let lastStatus: number | null = null;
  let lastRetryable = true;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as GroqApiResponse;
      if (response.ok) return payload;

      lastError = `groq_http_${response.status}`;
      lastStatus = response.status;
      const transient = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
      lastRetryable = transient;
      if (!transient || attempt === attempts - 1) {
        throw new GroqError(lastError, response.status, transient,
          payload.error?.code && PROVIDER_CODES.has(payload.error.code) ? payload.error.code : null);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
    } catch (error) {
      if (error instanceof GroqError) throw error;
      lastError = controller.signal.aborted ? 'groq_timeout' : 'groq_network_or_timeout';
      lastStatus = null;
      lastRetryable = true;
      if (attempt === attempts - 1) throw new GroqError(lastError, lastStatus, lastRetryable);
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new GroqError(lastError, lastStatus, lastRetryable);
}

function responseFormat(model: string, schema: { name: string; schema: unknown }): Record<string, unknown> {
  const configured = Deno.env.get('GROQ_STRICT_JSON_SCHEMA')?.trim().toLowerCase();
  const useStrictSchema = configured === undefined
    ? /^openai\/gpt-oss-(?:20b|120b)$/.test(model)
    : configured === 'true';
  if (useStrictSchema) {
    return { type: 'json_schema', json_schema: { ...schema, strict: true } };
  }
  return { type: 'json_object' };
}

function completionSettings(model: string, review = false): Record<string, unknown> {
  if (/^openai\/gpt-oss-(?:20b|120b)$/.test(model)) {
    // Modelos de raciocínio compartilham o orçamento entre raciocínio e resposta.
    return { reasoning_effort: 'low', include_reasoning: false, max_completion_tokens: review ? 1024 : 2048 };
  }
  return { max_completion_tokens: review ? 180 : 600 };
}

export async function generateTutorResponse(context: PromptContext): Promise<GroqResult> {
  const model = env('GROQ_MODEL', 'openai/gpt-oss-20b');
  const payload = await requestGroq({
    model,
    temperature: 0.2,
    ...completionSettings(model),
    response_format: responseFormat(model, buildOutputSchema(context.hintLevel)),
    messages: buildGroqMessages(context),
  });

  const content = payload.choices?.[0]?.message?.content;
  if (payload.choices?.[0]?.finish_reason === 'length') throw new GroqError('groq_output_truncated', 200, true);
  if (!content) throw new GroqError('groq_empty_response', 200, true);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJson(content));
  } catch {
    throw new GroqError('groq_invalid_json', 200, false);
  }

  let output: TutorOutput;
  try { output = validateTutorOutput(parsed, context.hintLevel); }
  catch (error) {
    const detail = error instanceof Error && VALIDATION_CODES.has(error.message) ? error.message : null;
    throw new GroqError('groq_output_rejected', 200, false, null, detail);
  }
  return {
    output,
    model: payload.model ?? model,
    usage: payload.usage ?? {},
  };
}

export async function reviewTutorResponse(
  activity: string,
  studentMessage: string,
  output: TutorOutput,
  level: HintLevel,
  history: HistoryItem[] = [],
): Promise<TutorOutput> {
  const enabled = (Deno.env.get('GROQ_ENABLE_REVIEW') ?? 'true').toLowerCase() === 'true';
  if (!enabled) return output;

  const model = env('GROQ_REVIEW_MODEL', env('GROQ_MODEL', 'openai/gpt-oss-20b'));
  try {
    const payload = await requestGroq({
      model,
      temperature: 0,
      ...completionSettings(model, true),
      response_format: responseFormat(model, REVIEW_SCHEMA),
      messages: [
        { role: 'system', content: buildReviewSystemPrompt(level) },
        { role: 'user', content: buildReviewPrompt(activity, studentMessage, output.message + '\nAÇÃO PROPOSTA: ' + output.student_action, history) },
      ],
    }, 1);
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return safeFallback(level, 'review_empty');
    const review = JSON.parse(cleanJson(raw)) as { blocked?: unknown; flags?: unknown };
    if (review.blocked === true && Array.isArray(review.flags)) {
      const reason = review.flags.find(flag => typeof flag === 'string' && (REVIEW_FLAGS as readonly string[]).includes(flag));
      return safeFallback(level, reason ? `ai_review_${reason}` : 'ai_review_blocked_or_invalid');
    }
    if (review.blocked !== false || !Array.isArray(review.flags) || !review.flags.every((flag) => typeof flag === 'string')) {
      return safeFallback(level, 'ai_review_blocked_or_invalid');
    }
    if (review.flags.length !== 0) return safeFallback(level, 'ai_review_contradictory');
    return output;
  } catch {
    return safeFallback(level, 'review_failed_closed');
  }
}
