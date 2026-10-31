import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('logo é inserido no HTML pelo servidor antes de executar JavaScript', async () => {
  const source = await readFile(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8');
  const html = await readFile(new URL('../../apps-script/Index.html', import.meta.url), 'utf8');
  const logo = await readFile(new URL('../../apps-script/Logo.html', import.meta.url), 'utf8');
  const template = { logoDataUri: '', evaluate() {
    assert.match(this.logoDataUri, /^data:image\/png;base64,/);
    const rendered = html.replace('<?!= logoDataUri ?>', this.logoDataUri);
    return { setTitle: () => rendered };
  } };
  const context = vm.createContext({ HtmlService: {
    createTemplateFromFile: () => template,
    createHtmlOutputFromFile: () => ({ getContent: () => logo })
  } });
  vm.runInContext(source, context);
  const rendered = context.doGet();
  assert.match(rendered, /id="brandLogo" src="data:image\/png;base64,/);
  assert.ok(!rendered.includes('embeddedLogo'));
  const bytes = Buffer.from(template.logoDataUri.split(',')[1], 'base64');
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.throws(() => vm.runInNewContext(source + '\ngetLogoDataUri_()', { HtmlService: {
    createHtmlOutputFromFile: () => ({ getContent: () => '<html>imagem incompleta</html>' })
  } }), /Confira o arquivo Logo.html/);
});

test('host Apps Script usa destino fixo, chave pública e erros sem conteúdo interno', async () => {
  const source = await readFile(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8');
  let simulateFailure = false;
  let target = '';
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => ({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public-key' }[key] || '') }) },
    Utilities: { newBlob: (value: string) => ({ getBytes: () => new TextEncoder().encode(value) }) },
    UrlFetchApp: { fetch: (url: string) => {
      target = url;
      if (simulateFailure) throw new Error('secret upstream detail');
      return { getResponseCode: () => 200, getContentText: () => '{"status":"ok"}' };
    } }
  });
  vm.runInContext(source, context);
  assert.equal(context.getBootstrap().publicKey, 'public-key');
  assert.throws(() => context.tutorApi({ action: 'health' }, ''), /Entre na sua conta/);
  assert.throws(() => context.include('Code'), /Recurso indisponível/);
  context.tutorApi({ action: 'health', url: 'https://evil.example' }, 'test-token-with-twenty-characters');
  assert.equal(target, 'https://project.supabase.co/functions/v1/tutor-api');
  simulateFailure = true;
  assert.throws(() => context.tutorApi({ action: 'health' }, 'test-token-with-twenty-characters'), error => {
    assert.ok(!String(error).includes('secret upstream detail')); return true;
  });
  assert.throws(() => context.tutorApi({ content: 'a'.repeat(20001) }, 'test-token-with-twenty-characters'), /Confira os campos/);
});
