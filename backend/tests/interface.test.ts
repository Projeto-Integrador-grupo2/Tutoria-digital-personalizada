import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('Index integra login, reenvio, histórico, encerramento e avaliação sem HTML executável', async () => {
  const html = await readFile(new URL('../../apps-script/Index.html', import.meta.url), 'utf8');
  const calls: Array<Record<string, unknown>> = [];
  let sendAttempts = 0;
  const session = { id: crypto.randomUUID(), subject: 'Matemática', activity: 'Calcule a área de um retângulo.', profile: 'supportive', hint_level: 0, status: 'active' };
  const config = { configured: true, supabaseUrl: 'https://example.supabase.co', publicKey: 'public-test-key', privacyNotice: 'Aviso de teste.', subjects: ['Matemática'], profiles: [
    { id: 'direct', label: 'Direto', description: 'Uma ação.' },
    { id: 'supportive', label: 'Acolhedor', description: 'Com calma.' },
    { id: 'investigative', label: 'Investigativo', description: 'Investigue.' }
  ] };
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://test.example', beforeParse(window) {
    // Bibliotecas do host podem declarar nomes globais iguais aos usados pela interface.
    window.eval('const $ = "host"; const state = "host";');
    window.fetch = async () => new Response(JSON.stringify({ access_token: 'test-user-token', refresh_token: 'refresh-test', expires_in: 3600 }));
    window.AbortSignal = AbortSignal;
    window.confirm = () => true;
    Object.defineProperty(window.crypto, 'randomUUID', { value: () => crypto.randomUUID() });
    window.google = { script: { get run() {
      let success: (value: unknown) => void;
      let failure: (value: unknown) => void;
      const chain = {
        withSuccessHandler(fn: typeof success) { success = fn; return chain; },
        withFailureHandler(fn: typeof failure) { failure = fn; return chain; },
        getBootstrap() { queueMicrotask(() => success(config)); },
        tutorApi(body: Record<string, unknown>, token: string) {
          assert.equal(token, 'test-user-token');
          calls.push(structuredClone(body));
          queueMicrotask(() => {
            try {
              switch (body.action) {
                case 'get_privacy_status': success({ privacy: { retention_days: 90 } }); break;
                case 'create_session': success({ session }); break;
                case 'send_message':
                  sendAttempts++;
                  if (sendAttempts === 1) success({ error: { code: 'internal_error', message: 'Falha temporária.', request_id: 'test' } });
                  else success({ tutor: { message: 'Explique <img src=x onerror=alert(1)> com suas palavras.' }, session: { hint_level: 0 } });
                  break;
                case 'list_sessions': success({ sessions: [session], pagination: { has_more: false } }); break;
                case 'finish_session': success({ session: { ...session, status: 'finished', summary: 'Resumo do relato.' } }); break;
                case 'submit_feedback': success({ feedback: {} }); break;
                case 'delete_all_history': success({ deleted: true }); break;
                default: failure(new Error('Unexpected action'));
              }
            } catch (error) { failure(error); }
          });
        }
      };
      return chain;
    } } };
  } });
  const document = dom.window.document;
  const get = (id: string) => document.getElementById(id) as HTMLInputElement;
  const submit = (id: string) => get(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const click = (id: string) => get(id).click();
  const settled = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
  try {
    await settled();
    assert.equal(get('profile').value, 'supportive');
    assert.equal(get('subject').value, 'Matemática');
    get('email').value = 'aluno@example.test'; get('password').value = 'test-only-password';
    submit('authForm'); await settled();
    assert.equal(get('authForm').hidden, true);
    assert.equal(get('password').value, '');
    assert.equal(dom.window.localStorage.length, 0);
    get('activity').value = session.activity; get('privacyAccepted').checked = true;
    get('message').value = 'Tentei relacionar a base com a altura.';
    submit('messageForm'); await settled();
    assert.match(get('message').value, /Tentei/);
    submit('messageForm'); await settled();
    assert.equal(get('message').value, '');
    const sends = calls.filter(call => call.action === 'send_message');
    assert.equal(sends.length, 2);
    assert.equal(sends[0].client_request_id, sends[1].client_request_id);
    assert.equal(document.querySelectorAll('#messages img').length, 0);
    assert.match(get('messages').textContent!, /<img src=x/);
    click('historyButton'); await settled();
    assert.match(get('historyList').textContent!, /Matemática/);
    get('reflection').value = 'Entendi a relação entre as medidas.';
    get('remainingDifficulty').value = 'Preciso revisar as unidades.';
    get('nextStep').value = 'Vou testar outro retângulo.';
    click('summaryButton'); await settled();
    assert.match(get('messages').textContent!, /Resumo do relato/);
    for (const id of ['usefulness','clarity','profileFit','autonomy']) get(id).value = '4';
    click('evaluationButton'); await settled();
    assert.equal(calls.find(call => call.action === 'submit_feedback')?.autonomy, 4);
    click('deleteHistoryButton'); await settled();
    assert.equal(calls.find(call => call.action === 'delete_all_history')?.confirmation, 'APAGAR_MEU_HISTORICO');
    click('logoutButton'); await settled();
    assert.equal(get('authForm').hidden, false);
    assert.equal(get('messages').children.length, 0);
  } finally { dom.window.close(); }
});
