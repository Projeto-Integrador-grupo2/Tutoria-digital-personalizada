// Apps Script hospeda a interface. Auth, banco e IA ficam na Edge Function.
function doGet(event) {
  if (event && event.parameter && event.parameter.oauth_ticket) {
    return googleCallback_(event.parameter);
  }
  const template = HtmlService.createTemplateFromFile('Index');
  template.logoDataUri = getLogoDataUri_();
  return template.evaluate().setTitle('Tutoria Digital Personalizada');
}

function getLogoDataUri_() {
  const logo = HtmlService.createHtmlOutputFromFile('Logo').getContent()
    .replace(/[\s\uFEFF]/g, '');
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)) {
    throw new Error('Confira o arquivo Logo.html: ele deve conter apenas o endereço data:image/png;base64 da imagem.');
  }
  return logo;
}

function include(filename) {
  if (filename !== 'Logo') throw new Error('Recurso indisponível.');
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getBootstrap() {
  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty('SUPABASE_URL') || '';
  const key = properties.getProperty('SUPABASE_PUBLISHABLE_KEY') || properties.getProperty('SUPABASE_ANON_KEY') || '';
  return {
    configured: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && Boolean(key),
    supabaseUrl: url,
    publicKey: key,
    registrationEnabled: properties.getProperty('REGISTRATION_ENABLED') === 'true' && properties.getProperty('GOOGLE_LOGIN_ENABLED') !== 'true',
    googleLoginEnabled: properties.getProperty('GOOGLE_LOGIN_ENABLED') === 'true',
    privacyNotice: 'Não informe dados pessoais na atividade. Consulte o prazo de retenção ao entrar. A IA pode errar; confira o material da disciplina. Você pode consultar e apagar seu histórico.',
    subjects: ['Matemática', 'Português', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês', 'Informática', 'Projeto Integrador', 'Outra disciplina'],
    profiles: [
      { id: 'direct', label: 'Direto', description: 'Uma ação concreta por vez, com frases curtas.' },
      { id: 'supportive', label: 'Acolhedor', description: 'Ritmo cuidadoso e apoio para revisar a tentativa.' },
      { id: 'investigative', label: 'Investigativo', description: 'Perguntas sobre hipóteses, estratégias e justificativas.' }
    ]
  };
}

// O verificador PKCE permanece no navegador; o cache guarda apenas o código transitório.
function startGoogleLogin(challenge) {
  const config = getBootstrap();
  if (!config.configured || !config.googleLoginEnabled || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
    throw new Error('O acesso com Google ainda não está disponível.');
  }
  const callback = PropertiesService.getScriptProperties().getProperty('OAUTH_CALLBACK_URL') || '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(callback)) {
    throw new Error('Configure o endereço publicado de retorno do login.');
  }
  const ticket = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  CacheService.getScriptCache().put('oauth:' + ticket, JSON.stringify({ secret, expires: Date.now() + 300000 }), 300);
  const redirect = callback + '?oauth_ticket=' + ticket;
  return { ticket, secret, authorizeUrl: config.supabaseUrl + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(redirect)
    + '&code_challenge=' + encodeURIComponent(challenge) + '&code_challenge_method=s256' };
}

function googleCallback_(parameters) {
  const ticket = parameters.oauth_ticket;
  let accepted = false;
  if (/^[a-f0-9]{64}$/.test(ticket)) {
    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      const cache = CacheService.getScriptCache();
      const raw = cache.get('oauth:' + ticket);
      if (raw) {
        const record = JSON.parse(raw);
        if (record.expires > Date.now() && !record.ready) {
          const code = parameters.code;
          record.code = typeof code === 'string' && /^[A-Za-z0-9_-]{10,2048}$/.test(code) ? code : null;
          record.ready = true;
          cache.put('oauth:' + ticket, JSON.stringify(record), Math.max(1, Math.ceil((record.expires - Date.now()) / 1000)));
          accepted = Boolean(record.code);
        }
      }
    } finally { lock.releaseLock(); }
  }
  return HtmlService.createHtmlOutput('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Retorno do Google</title><body style="font-family:Arial;padding:24px"><h1>'
    + (accepted ? 'Retorne à aba do tutor' : 'Não foi possível concluir o login')
    + '</h1><p>' + (accepted ? 'O tutor concluirá sua entrada automaticamente. Você pode fechar esta aba.' : 'Volte ao tutor e tente entrar com Google novamente.') + '</p></body></html>');
}

function pollGoogleLogin(ticket, secret) {
  if (!/^[a-f0-9]{64}$/.test(ticket) || !/^[a-f0-9]{64}$/.test(secret)) return { status: 'expired' };
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const cache = CacheService.getScriptCache();
    const raw = cache.get('oauth:' + ticket);
    if (!raw) return { status: 'expired' };
    const record = JSON.parse(raw);
    if (record.secret !== secret) return { status: 'expired' };
    if (record.expires <= Date.now()) { cache.remove('oauth:' + ticket); return { status: 'expired' }; }
    if (!record.ready) return { status: 'pending' };
    cache.remove('oauth:' + ticket);
    return record.code ? { status: 'ready', code: record.code } : { status: 'denied' };
  } finally { lock.releaseLock(); }
}

// Proxy de destino fixo. Nunca recebe URL arbitrária nem chave administrativa.
function tutorApi(body, accessToken) {
  const config = getBootstrap();
  if (!config.configured) throw new Error('O serviço ainda não foi configurado.');
  if (typeof accessToken !== 'string' || accessToken.length < 20 || accessToken.length > 8192 || /[\r\n]/.test(accessToken)) {
    throw new Error('Entre na sua conta para continuar.');
  }
  const serialized = JSON.stringify(body);
  if (!body || typeof body !== 'object' || Utilities.newBlob(serialized).getBytes().length > 20000) {
    throw new Error('Confira os campos e os limites informados.');
  }
  try {
    const response = UrlFetchApp.fetch(config.supabaseUrl + '/functions/v1/tutor-api', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + accessToken, apikey: config.publicKey },
      payload: serialized, muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText());
    if (response.getResponseCode() >= 400 && !result.error) throw new Error();
    return result;
  } catch (_) {
    throw new Error('Não foi possível conectar ao tutor. Aguarde e tente novamente.');
  }
}
