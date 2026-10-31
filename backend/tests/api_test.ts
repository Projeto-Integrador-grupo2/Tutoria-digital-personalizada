import { handleRequest } from '../supabase/functions/tutor-api/index.ts';
import { generateTutorResponse, groqDiagnostic, reviewTutorResponse } from '../supabase/functions/_shared/groq.ts';
import { safeFallback } from '../supabase/functions/_shared/guardrails.ts';

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
const originalFetch = globalThis.fetch;
const userId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const request = (body: unknown, token = 'test-token') => new Request('https://example.test/tutor-api', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

Deno.test('contratos HTTP, geração e revisão com serviços simulados', async t => {
  Deno.env.set('SUPABASE_URL', 'https://project.supabase.co');
  Deno.env.set('SUPABASE_ANON_KEY', 'test-public-key');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  Deno.env.set('GROQ_API_KEY', 'test-groq-key');
  Deno.env.set('GROQ_ENABLE_REVIEW', 'true');
  Deno.env.set('ALLOWED_ORIGINS', 'https://allowed.example');
  try {
    await t.step('health sem dados privados e erro seguro sem token', async () => {
      equal((await (await handleRequest(request({ action: 'health' }, ''))).json()).version, '1.2.0-rc.1');
      equal((await handleRequest(request({ action: 'list_sessions' }, ''))).status, 401);
      const badOrigin = new Request(request({ action: 'health' }), { headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' } });
      equal((await handleRequest(badOrigin)).status, 403);
    });
    await t.step('limita corpo transmitido mesmo sem Content-Length', async () => {
      const large = request({ action: 'health', content: 'a'.repeat(21000) });
      equal((await handleRequest(large)).status, 413);
      equal((await handleRequest(new Request('https://test', { method: 'GET' }))).status, 405);
    });
    await t.step('JWT inválido e conta anônima não acessam o piloto', async () => {
      globalThis.fetch = async () => response({ message: 'invalid JWT secret details' }, 401);
      const denied = await handleRequest(request({ action: 'list_sessions' }));
      equal(denied.status, 401);
      equal((await denied.text()).includes('secret details'), false);
      globalThis.fetch = async () => response({ id: userId, is_anonymous: true });
      equal((await handleRequest(request({ action: 'list_sessions' }))).status, 401);
    });
    await t.step('campos inválidos não chegam à IA nem geram erro 500', async () => {
      globalThis.fetch = async input => String(input).includes('/auth/v1/user')
        ? response({ id: userId }) : response([{ allowed: true }]);
      equal((await handleRequest(request({ action: 'create_session', profile: 'invalid' }))).status, 400);
    });
    await t.step('falha Groq mantém diagnóstico e persiste somente texto mascarado', async () => {
      let saved: Record<string, unknown> | null = null;
      globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) return response({ id: userId });
        if (url.includes('consume_tutor_quota')) return response([{ allowed: true }]);
        if (url.includes('/tutoring_sessions?')) return response({ id: sessionId, user_id: userId, subject: 'Matemática', activity: 'Calcule uma área.', profile: 'supportive', hint_level: 0, revision: 0, status: 'active' });
        if (url.includes('/messages?')) return response(url.includes('client_request_id') ? null : []);
        if (url.includes('api.groq.com')) return response({ error: { message: 'private provider details' } }, 400);
        if (url.includes('persist_tutor_exchange_v3')) {
          saved = JSON.parse(String(init?.body));
          return response([{ duplicate: false }]);
        }
        throw new Error('Unexpected endpoint');
      };
      const result = await handleRequest(request({ action: 'send_message', session_id: sessionId, client_request_id: requestId, content: 'Tentei a base. Meu contato aluno@example.com', request_more_help: true }));
      equal(result.status, 200);
      const data = await result.json();
      equal(data.tutor.hint_level, 0);
      equal(data.availability.degraded, true);
      equal(JSON.stringify(saved).includes('aluno@example.com'), false);
      equal(JSON.stringify(data).includes('private provider details'), false);
    });
    await t.step('revisor rejeita JSON sem decisão explícita e respostas prontas', async () => {
      const output = safeFallback(1);
      globalThis.fetch = async () => response({ choices: [{ message: { content: '{}' } }] });
      equal((await reviewTutorResponse('Área', 'Tentei multiplicar', output, 1)).safety_flags[0], 'ai_review_blocked_or_invalid');
      globalThis.fetch = async () => response({ choices: [{ message: { content: JSON.stringify({ blocked: false, flags: [] }) } }] });
      equal(await reviewTutorResponse('Área', 'Tentei multiplicar', output, 1), output);
      globalThis.fetch = async () => response({ choices: [{ message: { content: JSON.stringify({ ...output, message: 'A resposta final é 42.' }) } }] });
      let rejected = false;
      try { await generateTutorResponse({ subject: 'Matemática', activity: 'Calcule a área', profile: 'direct', hintLevel: 1, studentMessage: 'Tentei multiplicar', history: [], precheckFlags: [] }); }
      catch { rejected = true; }
      equal(rejected, true);
    });
    await t.step('quota informa Retry-After e erro do banco não expõe detalhes', async () => {
      globalThis.fetch = async input => String(input).includes('/auth/v1/user')
        ? response({ id: userId }) : response([{ allowed: false, retry_after_seconds: 30 }]);
      const limited = await handleRequest(request({ action: 'list_sessions' }));
      equal(limited.status, 429); equal(limited.headers.get('Retry-After'), '30');
      globalThis.fetch = async input => String(input).includes('/auth/v1/user')
        ? response({ id: userId }) : response({ message: 'database secret details', code: 'XX000' }, 400);
      const failed = await handleRequest(request({ action: 'list_sessions' }));
      equal(failed.status, 503);
      equal((await failed.text()).includes('database secret details'), false);
    });
    await t.step('solicitação de gabarito e risco pessoal não chamam Groq', async () => {
      let saved: Record<string, unknown> = {};
      globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) return response({ id: userId });
        if (url.includes('consume_tutor_quota')) return response([{ allowed: true }]);
        if (url.includes('/tutoring_sessions?')) return response({ id: sessionId, subject: 'Matemática', activity: 'Calcule uma área.', profile: 'supportive', hint_level: 0, revision: 0, status: 'active' });
        if (url.includes('/messages?')) return response(url.includes('client_request_id') ? null : []);
        if (url.includes('persist_tutor_exchange_v3')) { saved = JSON.parse(String(init?.body)); return response([{ duplicate: false }]); }
        throw new Error('Unexpected call, including Groq');
      };
      const blocked = await (await handleRequest(request({ action: 'send_message', session_id: sessionId, content: 'Só a resposta, sem explicação.' }))).json();
      equal(blocked.safety.status, 'fallback');
      equal(blocked.tutor.safety_flags.includes('direct_answer_request_blocked'), true);
      const handoff = await (await handleRequest(request({ action: 'send_message', session_id: sessionId, content: 'Eu quero me matar' }))).json();
      equal(handoff.safety.status, 'handoff');
      equal(saved.p_student_content, '[CONTEÚDO ENCAMINHADO PARA APOIO HUMANO]');
    });
    await t.step('modelos GPT-OSS recebem orçamento de raciocínio limitado e não devolvem raciocínio', async () => {
      const previousModel = Deno.env.get('GROQ_MODEL');
      const previousReview = Deno.env.get('GROQ_REVIEW_MODEL');
      try {
        Deno.env.set('GROQ_MODEL', 'openai/gpt-oss-20b');
        Deno.env.set('GROQ_REVIEW_MODEL', 'openai/gpt-oss-20b');
        const bodies: Record<string, unknown>[] = [];
        globalThis.fetch = async (_input, init) => {
          bodies.push(JSON.parse(String(init?.body)));
          return response({ choices: [{ message: { content: JSON.stringify(bodies.length === 1 ? safeFallback(0) : { blocked: false, flags: [] }) } }] });
        };
        const result = await generateTutorResponse({ subject: 'Física', activity: 'Explique a relação entre força e massa.', profile: 'direct', hintLevel: 0, studentMessage: 'Não entendi.', history: [], precheckFlags: [] });
        await reviewTutorResponse('Força e massa', 'Não entendi', result.output, 0);
        equal(bodies.map(body => body.max_completion_tokens), [2048, 1024]);
        equal(bodies.map(body => body.reasoning_effort), ['low', 'low']);
        equal(bodies.map(body => body.include_reasoning), [false, false]);
        equal(bodies.some(body => 'tools' in body), false);
      } finally {
        if (previousModel === undefined) Deno.env.delete('GROQ_MODEL'); else Deno.env.set('GROQ_MODEL', previousModel);
        if (previousReview === undefined) Deno.env.delete('GROQ_REVIEW_MODEL'); else Deno.env.set('GROQ_REVIEW_MODEL', previousReview);
      }
    });
    await t.step('diagnóstico da geração distingue rejeição HTTP, JSON, truncamento e barreiras', async () => {
      const context = { subject: 'Matemática', activity: 'Calcule uma área.', profile: 'direct' as const, hintLevel: 0 as const, studentMessage: 'Tentei usar as medidas.', history: [], precheckFlags: [] };
      const cases = [
        { body: { error: { code: 'invalid_api_key', message: 'DO_NOT_LOG_PRIVATE_CONTENT' } }, status: 401, expected: 'ai_authentication_failed' },
        { body: { error: { code: 'model_permission_blocked', message: 'DO_NOT_LOG_PRIVATE_CONTENT' } }, status: 400, expected: 'ai_request_rejected' },
        { body: { choices: [{ finish_reason: 'length', message: { content: '{"partial":' } }] }, status: 200, expected: 'ai_output_truncated' },
        { body: { choices: [{ message: { content: 'not-json' } }] }, status: 200, expected: 'ai_invalid_json' },
        { body: { choices: [{ message: { content: JSON.stringify({ ...safeFallback(0), contains_final_answer: true }) } }] }, status: 200, expected: 'ai_output_rejected' },
      ];
      for (const item of cases) {
        globalThis.fetch = async () => response(item.body, item.status);
        let diagnostic;
        try { await generateTutorResponse(context); }
        catch (error) { diagnostic = groqDiagnostic(error); }
        equal(diagnostic?.code, item.expected);
        equal(JSON.stringify(diagnostic).includes('DO_NOT_LOG_PRIVATE_CONTENT'), false);
      }
    });
    await t.step('GPT-OSS usa esquema estrito por nível e mantém validação de pares incompatíveis', async () => {
      const previousModel = Deno.env.get('GROQ_MODEL');
      const previousStrict = Deno.env.get('GROQ_STRICT_JSON_SCHEMA');
      try {
        Deno.env.set('GROQ_MODEL', 'openai/gpt-oss-20b');
        Deno.env.delete('GROQ_STRICT_JSON_SCHEMA');
        for (const level of [0, 1, 2, 3, 4, 5] as const) {
          let sent: Record<string, unknown> = {};
          globalThis.fetch = async (_input, init) => {
            sent = JSON.parse(String(init?.body));
            return response({ choices: [{ message: { content: JSON.stringify(safeFallback(level)) } }] });
          };
          const result = await generateTutorResponse({ subject: 'Matemática', activity: 'Identifique os coeficientes.', profile: 'direct', hintLevel: level, studentMessage: 'Sei identificar os coeficientes, mas não entendi como começar.', history: [], precheckFlags: [] });
          const format = sent.response_format as { type: string; json_schema: { strict: boolean; schema: { properties: { interaction_type: { enum: string[] }; hint_level: { enum: number[] } } } } };
          equal(format.type, 'json_schema');
          equal(format.json_schema.strict, true);
          equal(format.json_schema.schema.properties.interaction_type.enum, [result.output.interaction_type, 'safe_refusal']);
          equal(format.json_schema.schema.properties.hint_level.enum, [level]);
        }
        globalThis.fetch = async () => response({ choices: [{ message: { content: JSON.stringify({ ...safeFallback(0), interaction_type: 'conceptual_hint' }) } }] });
        let diagnostic;
        try { await generateTutorResponse({ subject: 'Matemática', activity: 'Identifique os coeficientes.', profile: 'direct', hintLevel: 0, studentMessage: 'Não entendi.', history: [], precheckFlags: [] }); }
        catch (error) { diagnostic = groqDiagnostic(error); }
        equal(diagnostic?.validation_code, 'interaction_level_mismatch');
      } finally {
        if (previousModel === undefined) Deno.env.delete('GROQ_MODEL'); else Deno.env.set('GROQ_MODEL', previousModel);
        if (previousStrict === undefined) Deno.env.delete('GROQ_STRICT_JSON_SCHEMA'); else Deno.env.set('GROQ_STRICT_JSON_SCHEMA', previousStrict);
      }
    });
    await t.step('revisor recebe histórico e bloqueia progresso inventado antes de persistir', async () => {
      const invented = 'Você já calculou o discriminante. Qual operação deve fazer em seguida?';
      let groqCalls = 0;
      let stored: Record<string, unknown> = {};
      const priorStudent = 'Identifiquei a = 1, b = -5 e c = 6.';
      globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) return response({ id: userId });
        if (url.includes('consume_tutor_quota')) return response([{ allowed: true }]);
        if (url.includes('/tutoring_sessions?')) return response({ id: sessionId, subject: 'Matemática', activity: 'Resolver uma equação do segundo grau.', profile: 'supportive', hint_level: 2, revision: 3, status: 'active' });
        if (url.includes('/messages?')) return response(url.includes('client_request_id') ? null : [
          { role: 'tutor', content: 'O discriminante depende dos coeficientes.' },
          { role: 'student', content: priorStudent },
        ]);
        if (url.includes('api.groq.com')) {
          groqCalls++;
          if (groqCalls === 1) return response({ choices: [{ message: { content: JSON.stringify({ ...safeFallback(3), message: invented }) } }] });
          const sent = JSON.parse(String(init?.body));
          equal(sent.messages[0].role, 'system');
          equal(sent.messages[0].content.includes('unsupported_student_progress'), true);
          const reviewData = JSON.parse(sent.messages[1].content);
          equal(reviewData.history.some((item: { content: string }) => item.content === priorStudent), true);
          equal(reviewData.current_student_message, 'Tentei começar pelo discriminante, mas me confundo com os sinais.');
          return response({ choices: [{ message: { content: JSON.stringify({ blocked: true, flags: ['unsupported_student_progress'] }) } }] });
        }
        if (url.includes('persist_tutor_exchange_v3')) { stored = JSON.parse(String(init?.body)); return response([{ duplicate: false }]); }
        throw new Error('Unexpected endpoint');
      };
      const result = await (await handleRequest(request({ action: 'send_message', session_id: sessionId, content: 'Tentei começar pelo discriminante, mas me confundo com os sinais.', request_more_help: true }))).json();
      equal(result.safety.status, 'fallback');
      equal(result.tutor.safety_flags.includes('ai_review_unsupported_student_progress'), true);
      equal(stored.p_tutor_content === invented, false);
      equal(result.tutor.message.includes('Você já calculou'), false);
    });
  } finally { globalThis.fetch = originalFetch; }
});
