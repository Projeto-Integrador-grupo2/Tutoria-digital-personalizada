import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

async function page(registrationEnabled: boolean) {
  const authRequests: Array<{ path: string; body: Record<string, unknown> }> = [];
  const tutorRequests: Array<Record<string, unknown>> = [];
  let signupStatus = 200;
  let verifyStatus = 200;
  const dom = new JSDOM(await readFile(new URL('../../apps-script/Index.html', import.meta.url), 'utf8'), {
    runScripts: 'dangerously', url: 'https://test.example', beforeParse(window) {
      window.AbortSignal = AbortSignal;
      window.fetch = async (input: string, init: { body: string }) => {
        authRequests.push({ path: input, body: JSON.parse(init.body) });
        const status = input.endsWith('/signup') ? signupStatus : verifyStatus;
        return new Response(JSON.stringify(status !== 200 ? { message: 'DO_NOT_SHOW_PROVIDER_BODY' }
          : input.endsWith('/signup') ? { user: { id: 'test-id' }, session: null }
          : { access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600 }), { status });
      };
      window.google = { script: { get run() {
        let success: (value: unknown) => void;
        const chain = {
          withSuccessHandler(fn: typeof success) { success = fn; return chain; },
          withFailureHandler() { return chain; },
          getBootstrap() { queueMicrotask(() => success({ configured: true, registrationEnabled, supabaseUrl: 'https://example.supabase.co', publicKey: 'public-key', subjects: ['Matemática'], privacyNotice: 'Teste.', profiles: [{ id: 'supportive', label: 'Acolhedor', description: 'Apoio.' }] })); },
          tutorApi(body: Record<string, unknown>) { tutorRequests.push(body); queueMicrotask(() => success({ privacy: { retention_days: 90 } })); }
        };
        return chain;
      } } };
    }
  });
  const element = (id: string) => dom.window.document.getElementById(id) as HTMLInputElement;
  const settled = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
  const submit = (id: string) => element(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await settled();
  return { dom, element, settled, submit, authRequests, tutorRequests,
    setSignupStatus: (status: number) => { signupStatus = status; }, setVerifyStatus: (status: number) => { verifyStatus = status; } };
}

test('cadastro permanece desativado até habilitação e não envia dados nesse estado', async () => {
  const p = await page(false);
  try {
    assert.equal(p.element('showSignupButton').hidden, true);
    p.element('signupEmail').value = 'aluno@example.test';
    p.element('signupPassword').value = p.element('signupPasswordConfirm').value = 'test-only-password';
    p.submit('signupForm'); await p.settled();
    assert.equal(p.authRequests.length, 0);
    assert.equal(p.element('signupPassword').value, '');
  } finally { p.dom.window.close(); }
});

test('cadastro confirma por código e não envia senha ou OTP ao Apps Script/tutor', async () => {
  const p = await page(true);
  try {
    p.element('showSignupButton').click();
    assert.equal(p.element('signupForm').hidden, false);
    assert.ok(!/autorizad|aprova[çc]/i.test(p.element('signupForm').textContent!));
    p.element('signupEmail').value = 'aluno@example.test';
    p.element('signupPassword').value = p.element('signupPasswordConfirm').value = 'test-only-password';
    p.submit('signupForm'); await p.settled();
    assert.equal(p.authRequests[0].path, 'https://example.supabase.co/auth/v1/signup');
    assert.equal(p.element('signupPassword').value, '');
    assert.equal(p.element('signupPasswordConfirm').value, '');
    assert.equal(p.element('verifyForm').hidden, false);
    assert.equal(p.element('accountActions').hidden, true);
    p.element('verifyCode').value = '123456';
    p.submit('verifyForm'); await p.settled();
    assert.equal(p.authRequests[1].body.type, 'email');
    assert.equal(p.element('verifyCode').value, '');
    assert.equal(p.element('accountActions').hidden, false);
    assert.equal(p.element('userChip').textContent, 'Conta conectada');
    assert.equal(p.dom.window.localStorage.length, 0);
    assert.ok(!JSON.stringify(p.tutorRequests).includes('test-only-password'));
    assert.ok(!JSON.stringify(p.tutorRequests).includes('123456'));
  } finally { p.dom.window.close(); }
});

test('senhas divergentes, recusa do cadastro e OTP inválido têm tratamento seguro', async () => {
  const p = await page(true);
  try {
    p.element('showSignupButton').click();
    p.element('signupEmail').value = 'aluno@example.test';
    p.element('signupPassword').value = 'test-only-password'; p.element('signupPasswordConfirm').value = 'different-password';
    p.submit('signupForm'); await p.settled();
    assert.equal(p.authRequests.length, 0);
    assert.match(p.element('signupStatus').textContent!, /precisam ser iguais/);
    p.setSignupStatus(403);
    p.element('signupPassword').value = p.element('signupPasswordConfirm').value = 'test-only-password';
    p.submit('signupForm'); await p.settled();
    assert.equal(p.element('accountActions').hidden, true);
    assert.ok(!p.element('signupStatus').textContent!.includes('DO_NOT_SHOW_PROVIDER_BODY'));
    p.element('signupBackButton').click(); p.element('showVerifyButton').click();
    p.element('verifyEmail').value = 'aluno@example.test'; p.element('verifyCode').value = '123456';
    p.setVerifyStatus(401); p.submit('verifyForm'); await p.settled();
    assert.equal(p.element('verifyCode').value, '');
    assert.match(p.element('signupStatus').textContent!, /inválido ou expirado/);
    assert.equal(p.element('accountActions').hidden, true);
  } finally { p.dom.window.close(); }
});
