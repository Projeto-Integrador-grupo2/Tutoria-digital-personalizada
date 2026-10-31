import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID, webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const hostSource = await readFile(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8');
const html = await readFile(new URL('../../apps-script/Index.html', import.meta.url), 'utf8');

function hostPage() {
  const cache = new Map<string, string>();
  const props: Record<string, string> = { GOOGLE_LOGIN_ENABLED: 'true', REGISTRATION_ENABLED: 'true', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public', OAUTH_CALLBACK_URL: 'https://script.google.com/macros/s/test/exec' };
  const ctx = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (name: string) => props[name] || '' }) },
    Utilities: { getUuid: randomUUID },
    CacheService: { getScriptCache: () => ({ put: (k: string, v: string) => cache.set(k, v), get: (k: string) => cache.get(k) || null, remove: (k: string) => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    HtmlService: { createHtmlOutput: (value: string) => value }
  });
  vm.runInContext(hostSource, ctx);
  return { ctx, cache, props };
}

test('retorno OAuth usa ticket e segredo separados, código de uso único e não renderiza credenciais', () => {
  const { ctx, cache, props } = hostPage();
  assert.equal(ctx.getBootstrap().registrationEnabled, false);
  const flow = ctx.startGoogleLogin('a'.repeat(43));
  const url = new URL(flow.authorizeUrl);
  assert.equal(url.origin, props.SUPABASE_URL);
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.equal(url.searchParams.get('redirect_to'), props.OAUTH_CALLBACK_URL + '?oauth_ticket=' + flow.ticket);
  assert.ok(!flow.authorizeUrl.includes(flow.secret));
  assert.equal(ctx.pollGoogleLogin(flow.ticket, flow.secret).status, 'pending');
  assert.equal(ctx.pollGoogleLogin(flow.ticket, 'f'.repeat(64)).status, 'expired');
  const output = ctx.doGet({ parameter: { oauth_ticket: flow.ticket, code: 'test-code-single-use-123' } });
  assert.match(output, /Retorne à aba/);
  assert.ok(!output.includes('test-code-single-use-123'));
  assert.equal(ctx.pollGoogleLogin(flow.ticket, flow.secret).code, 'test-code-single-use-123');
  assert.equal(ctx.pollGoogleLogin(flow.ticket, flow.secret).status, 'expired');
  assert.equal(cache.size, 0);
});

test('OAuth rejeita configuração inválida, retorno com erro, expiração e tentativa de sobrescrever código', () => {
  const { ctx, cache, props } = hostPage();
  assert.throws(() => ctx.startGoogleLogin('invalid'), /não está disponível/);
  props.OAUTH_CALLBACK_URL = 'https://evil.example';
  assert.throws(() => ctx.startGoogleLogin('a'.repeat(43)), /endereço publicado/);
  props.OAUTH_CALLBACK_URL = 'https://script.google.com/macros/s/test/exec';
  const denied = ctx.startGoogleLogin('a'.repeat(43));
  assert.ok(!ctx.doGet({ parameter: { oauth_ticket: denied.ticket, error: '<script>alert(1)</script>' } }).includes('<script>'));
  assert.equal(ctx.pollGoogleLogin(denied.ticket, denied.secret).status, 'denied');
  const flow = ctx.startGoogleLogin('a'.repeat(43));
  ctx.doGet({ parameter: { oauth_ticket: flow.ticket, code: 'first-code-12345' } });
  ctx.doGet({ parameter: { oauth_ticket: flow.ticket, code: 'second-code-12345' } });
  assert.equal(ctx.pollGoogleLogin(flow.ticket, flow.secret).code, 'first-code-12345');
  const expired = ctx.startGoogleLogin('a'.repeat(43));
  const row = JSON.parse(cache.get('oauth:' + expired.ticket)!); row.expires = 0;
  cache.set('oauth:' + expired.ticket, JSON.stringify(row));
  assert.equal(ctx.pollGoogleLogin(expired.ticket, expired.secret).status, 'expired');
  props.GOOGLE_LOGIN_ENABLED = 'false';
  assert.throws(() => ctx.startGoogleLogin('a'.repeat(43)), /não está disponível/);
});

async function browserPage(mode = 'ready') {
  const requests: Array<{ url: string; body: Record<string, string> }> = [];
  const tutor: unknown[] = [];
  let challenge = '';
  let navigated = '';
  let polls = 0;
  const dom = new JSDOM(html, { url: 'https://test.example', runScripts: 'dangerously', beforeParse(window) {
    Object.defineProperty(window.crypto, 'subtle', { value: webcrypto.subtle });
    window.TextEncoder = TextEncoder;
    window.AbortSignal = AbortSignal;
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = (fn: TimerHandler, delay?: number) => timeout(fn, delay === 2500 ? 0 : delay);
    window.open = () => mode === 'blocked' ? null : { opener: {}, location: { replace: (url: string) => { navigated = url; } } };
    window.fetch = async (url: string, init: { body: string }) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify(mode === 'exchange-error' ? { message: 'SECRET_PROVIDER_BODY' } : { access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 }), { status: mode === 'exchange-error' ? 400 : 200 });
    };
    window.google = { script: { get run() {
      let success: (value: unknown) => void;
      const chain = {
        withSuccessHandler(fn: typeof success) { success = fn; return chain; }, withFailureHandler() { return chain; },
        getBootstrap() { queueMicrotask(() => success({ configured: true, googleLoginEnabled: true, registrationEnabled: false, supabaseUrl: 'https://example.supabase.co', publicKey: 'public', subjects: ['Matemática'], profiles: [{ id: 'supportive', label: 'Acolhedor', description: 'Apoio' }], privacyNotice: 'Teste' })); },
        startGoogleLogin(value: string) { challenge = value; queueMicrotask(() => success({ ticket: 'a'.repeat(64), secret: 'b'.repeat(64), authorizeUrl: 'https://example.supabase.co/auth/v1/authorize?provider=google' })); },
        pollGoogleLogin() { polls++; queueMicrotask(() => success(mode === 'pending' ? { status: 'pending' } : mode === 'expired' ? { status: 'expired' } : { status: 'ready', code: 'test-code-12345' })); },
        tutorApi(body: unknown) { tutor.push(body); queueMicrotask(() => success({ privacy: { retention_days: 90 } })); }
      };
      return chain;
    } } };
  } });
  const get = (id: string) => dom.window.document.getElementById(id) as HTMLInputElement;
  const until = async (predicate: () => boolean) => {
    for (let i = 0; i < 150 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(predicate(), 'A interface não concluiu a transição esperada');
  };
  await until(() => get('authForm').hidden);
  return { dom, get, until, requests, tutor, challenge: () => challenge, navigated: () => navigated, polls: () => polls };
}

test('Google gera PKCE, troca código diretamente no Auth e mantém tokens fora do armazenamento e do host', async () => {
  const p = await browserPage();
  try {
    assert.equal(p.get('googleAuth').hidden, false);
    p.get('googleLoginButton').click();
    await p.until(() => !p.get('accountActions').hidden);
    assert.match(p.navigated(), /^https:\/\/example.supabase.co\/auth\/v1\/authorize/);
    assert.equal(p.requests[0].url, 'https://example.supabase.co/auth/v1/token?grant_type=pkce');
    const verifier = p.requests[0].body.code_verifier;
    assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(createHash('sha256').update(verifier).digest('base64url'), p.challenge());
    assert.equal(p.requests[0].body.auth_code, 'test-code-12345');
    assert.equal(p.dom.window.localStorage.length, 0);
    assert.equal(p.dom.window.sessionStorage.length, 0);
    assert.ok(!JSON.stringify(p.tutor).includes(verifier));
    assert.equal(p.get('googleAuth').hidden, true);
  } finally { p.dom.window.close(); }
});

test('Google trata pop-up bloqueado, expiração, erro do Auth e cancelamento sem conceder acesso', async () => {
  for (const mode of ['blocked', 'expired', 'exchange-error', 'pending']) {
    const p = await browserPage(mode);
    try {
      p.get('googleLoginButton').click();
      if (mode === 'pending') {
        await p.until(() => p.polls() > 0);
        p.get('cancelGoogleButton').click();
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(p.requests.length, 0);
        p.get('legacyLoginButton').click(); assert.equal(p.get('authForm').hidden, false);
        p.get('backGoogleButton').click(); assert.equal(p.get('googleAuth').hidden, false);
      } else {
        await p.until(() => /Permita|expirado|Não foi possível/.test(p.get('googleLoginStatus').textContent!));
      }
      assert.equal(p.get('accountActions').hidden, true);
      assert.ok(!p.get('googleLoginStatus').textContent!.includes('SECRET_PROVIDER_BODY'));
    } finally { p.dom.window.close(); }
  }
});
