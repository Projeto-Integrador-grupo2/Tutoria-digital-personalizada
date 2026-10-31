import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, errorPayload } from '../supabase/functions/_shared/errors.ts';

test('erro público não expõe detalhes internos', () => {
  const error = new ApiError('database_connection_failed', { status: 500 });
  const payload = errorPayload(error, 'req-123');
  assert.equal(payload.error.code, 'database_connection_failed');
  assert.equal(payload.error.message, 'Não foi possível concluir a operação.');
  assert.equal(payload.error.request_id, 'req-123');
  assert.equal(payload.error.retryable, true);
});

test('rate limit informa repetição segura', () => {
  const error = new ApiError('rate_limit_exceeded', { retryAfterSeconds: 30 });
  assert.equal(error.status, 429);
  assert.equal(error.retryable, true);
  assert.equal(error.retryAfterSeconds, 30);
});
