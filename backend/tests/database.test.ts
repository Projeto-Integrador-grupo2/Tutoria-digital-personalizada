import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migrações e proteção de histórico em PostgreSQL embarcado', async t => {
  const db = new PGlite();
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  const request = '33333333-3333-4333-8333-333333333333';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const filename of (await readdir(directory)).sort()) {
      const sql = (await readFile(new URL(filename, directory), 'utf8'))
        .replace('create extension if not exists pgcrypto;', '-- gen_random_uuid é nativo no PostgreSQL embarcado.');
      await db.exec(sql);
    }
    await db.query('insert into auth.users(id) values ($1),($2)', [userA, userB]);
    const result = await db.query<{ id: string }>(`insert into public.tutoring_sessions
      (user_id,subject,profile,activity,consent_version,privacy_notice_accepted)
      values ($1,'Matemática','supportive','Calcule a área de um retângulo','1.2',true) returning id`, [userA]);
    const sessionId = result.rows[0].id;
    const exchange = (id: string, user = userA, level = 0, revision = 0, text = 'Tentei usar a base e a altura.') => db.query<{ duplicate: boolean }>(
      `select * from public.persist_tutor_exchange_v3($1,$2,$3,$4,'Explique o que entendeu.','diagnostic',$5::smallint,false,'accepted','{}',null,null,null,$6::bigint)`,
      [sessionId, user, id, text, level, revision]);

    await t.test('primeira troca exige diagnóstico e transação não deixa meia conversa', async () => {
      await assert.rejects(exchange(request, userA, 2), /invalid_hint_level|diagnostic_required/);
      assert.equal((await db.query('select * from messages')).rows.length, 0);
      assert.equal((await exchange(request)).rows[0].duplicate, false);
      assert.equal((await db.query('select * from messages')).rows.length, 2);
    });
    await t.test('reenvio não duplica e UUID não pode ser reutilizado com texto diferente', async () => {
      assert.equal((await exchange(request)).rows[0].duplicate, true);
      await assert.rejects(exchange(request, userA, 0, 0, 'Outra mensagem.'), /idempotency_key_reused/);
      assert.equal((await db.query('select * from messages')).rows.length, 2);
    });
    await t.test('revisão obsoleta e usuário diferente não escrevem', async () => {
      await assert.rejects(exchange(crypto.randomUUID(), userA, 1, 0), /session_changed/);
      await assert.rejects(exchange(crypto.randomUUID(), userB, 0, 1), /session_changed/);
    });
    await t.test('RLS isola dois usuários e impede escrita direta e acesso anon', async () => {
      await db.exec('set role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userB]);
      assert.equal((await db.query('select * from tutoring_sessions')).rows.length, 0);
      assert.equal((await db.query('select * from messages')).rows.length, 0);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userA]);
      assert.equal((await db.query('select * from tutoring_sessions')).rows.length, 1);
      assert.equal((await db.query('select * from messages')).rows.length, 2);
      await assert.rejects(db.query("update tutoring_sessions set subject='Outra'"), /permission denied/);
      await assert.rejects(db.query("select * from persist_tutor_exchange_v3($1,$2,$3,'texto','pista','diagnostic',0::smallint,false,'accepted','{}',null,null,null,1::bigint)", [sessionId,userA,request]), /permission denied/);
      await db.exec('reset role; set role anon');
      await assert.rejects(db.query('select * from messages'), /permission denied/);
      await db.exec('reset role');
    });
    await t.test('cota é aplicada por usuário', async () => {
      const quota = () => db.query<{ allowed: boolean }>('select * from consume_tutor_quota($1,1,60)', [userA]);
      assert.equal((await quota()).rows[0].allowed, true);
      assert.equal((await quota()).rows[0].allowed, false);
    });
    await t.test('sessão expirada fica inacessível antes da limpeza e é removida em cascata', async () => {
      await db.query("update tutoring_sessions set expires_at=now()-interval '1 second' where id=$1", [sessionId]);
      await assert.rejects(exchange(crypto.randomUUID(), userA, 1, 1), /session_changed/);
      await db.exec('set role authenticated');
      assert.equal((await db.query('select * from tutoring_sessions')).rows.length, 0);
      assert.equal((await db.query('select * from messages')).rows.length, 0);
      await db.exec('reset role');
      await db.query('select delete_expired_tutor_data(90)');
      assert.equal((await db.query('select * from messages')).rows.length, 0);
      assert.equal((await db.query('select * from tutoring_sessions')).rows.length, 0);
    });
  } finally { await db.close(); }
});
