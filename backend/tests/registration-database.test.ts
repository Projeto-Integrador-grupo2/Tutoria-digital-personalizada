import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('migração do cadastro autorizado para confirmação de e-mail sem aprovação', async t => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin;');
    await db.exec(await readFile(new URL('../supabase/migrations/202610310001_controlled_registration.sql', import.meta.url), 'utf8'));
    const hash = createHash('sha256').update('autorizado@example.test').digest('hex');
    await db.query('insert into tutor_private.signup_approvals(email_hash) values ($1)', [hash]);
    const event = (email: unknown) => ({ user: { email, is_anonymous: false } });
    const check = async (payload: unknown) => {
      const result = await db.query<{ outcome: { error?: { http_code: number }; } }>(
        'select public.hook_tutor_before_user_created($1::jsonb) as outcome', [JSON.stringify(payload)]);
      return result.rows[0].outcome;
    };
    await t.test('hash normalizado corresponde à autorização e Auth pode consultar com RLS', async () => {
      await db.exec('set role supabase_auth_admin');
      try {
        assert.deepEqual(await check(event('  AUTORIZADO@example.test ')), {});
        assert.equal((await check(event('outro@example.test'))).error?.http_code, 403);
      } finally { await db.exec('reset role'); }
    });
    await t.test('nega conta anônima, email inválido e metadados de admin forjados', async () => {
      assert.equal((await check({ user: { email: 'autorizado@example.test', is_anonymous: true } })).error?.http_code, 403);
      for (const value of [null, 123, '', 'sem-arroba', 'duas palavras@example.test']) {
        assert.equal((await check(event(value))).error?.http_code, 403);
      }
      assert.equal((await check({ user: { email: 'outro@example.test', user_metadata: { admin: true } } })).error?.http_code, 403);
    });
    await t.test('público não consulta, escreve ou executa hook e Auth não concede autorizações', async () => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec('set role ' + role);
        try {
          await assert.rejects(db.query('select * from tutor_private.signup_approvals'), /permission denied/);
          await assert.rejects(check(event('autorizado@example.test')), /permission denied/);
        } finally { await db.exec('reset role'); }
      }
      await db.exec('set role supabase_auth_admin');
      try { await assert.rejects(db.query('delete from tutor_private.signup_approvals'), /permission denied/); }
      finally { await db.exec('reset role'); }
      const values = await db.query('select * from tutor_private.signup_approvals');
      assert.ok(!JSON.stringify(values.rows).includes('autorizado@example.test'));
    });
    await t.test('autorização vencida impede novo cadastro', async () => {
      await db.query("update tutor_private.signup_approvals set created_at=now()-interval '40 days',expires_at=now()-interval '1 day' where email_hash=$1", [hash]);
      await db.exec('set role supabase_auth_admin');
      try { assert.equal((await check(event('autorizado@example.test'))).error?.http_code, 403); }
      finally { await db.exec('reset role'); }
    });
    await t.test('política atual aceita e-mails válidos sem lista e não permite acesso anônimo', async () => {
      await db.exec(await readFile(new URL('../supabase/migrations/202610310002_open_email_registration.sql', import.meta.url), 'utf8'));
      await db.exec('set role supabase_auth_admin');
      try {
        assert.deepEqual(await check(event('qualquer-pessoa@example.test')), {});
        assert.deepEqual(await check(event('autorizado@example.test')), {}); // autorização anterior já venceu
        assert.equal((await check({ user: { email: 'qualquer-pessoa@example.test', is_anonymous: true } })).error?.http_code, 400);
        assert.equal((await check(event('email inválido'))).error?.http_code, 400);
        await assert.rejects(db.query('select * from tutor_private.signup_approvals'), /permission denied/);
      } finally { await db.exec('reset role'); }
      await db.exec('set role authenticated');
      try { await assert.rejects(check(event('qualquer-pessoa@example.test')), /permission denied/); }
      finally { await db.exec('reset role'); }
    });
  } finally { await db.close(); }
});
