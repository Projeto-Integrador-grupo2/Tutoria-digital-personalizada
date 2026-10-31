import assert from 'node:assert/strict';
import test from 'node:test';
import { GroqError, groqDiagnostic } from '../supabase/functions/_shared/groq.ts';

test('diagnóstico diferencia configuração, acesso, limite e validação sem mensagens brutas', () => {
  for (const [status, code] of [[401, 'ai_authentication_failed'], [403, 'ai_access_denied'], [404, 'ai_model_unavailable'], [429, 'ai_rate_limited'], [503, 'ai_provider_unavailable']] as const) {
    assert.equal(groqDiagnostic(new GroqError('private upstream body', status, false)).code, code);
  }
  assert.equal(groqDiagnostic(new GroqError('groq_missing_api_key', null, false)).code, 'ai_configuration_missing');
  assert.equal(groqDiagnostic(new GroqError('groq_output_truncated', 200, true)).code, 'ai_output_truncated');
  assert.equal(groqDiagnostic(new GroqError('groq_timeout', null, true)).code, 'ai_timeout');
  assert.equal(groqDiagnostic(new GroqError('groq_output_rejected', 200, false, null, 'hint_level_mismatch')).validation_code, 'hint_level_mismatch');
});

test('campos do provedor e exceções desconhecidas não se tornam canais de vazamento', () => {
  const marker = 'DO_NOT_LOG_PRIVATE_CONTENT';
  const diagnostic = groqDiagnostic(new GroqError(marker, 400, false, marker, marker));
  assert.equal(diagnostic.provider_code, null);
  assert.equal(diagnostic.validation_code, null);
  assert.equal(groqDiagnostic(new Error(marker)).code, 'ai_unexpected_failure');
  assert.ok(!JSON.stringify(diagnostic).includes(marker));
  assert.equal(groqDiagnostic(new GroqError('x', 999, false)).http_status, null);
});
