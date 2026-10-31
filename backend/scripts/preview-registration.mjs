// Prévia de desenvolvimento: não autentica usuários nem envia e-mails.
import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const index = fs.readFileSync(fileURLToPath(new URL('../../apps-script/Index.html', import.meta.url)), 'utf8');
const logo = fs.readFileSync(fileURLToPath(new URL('../../apps-script/Logo.html', import.meta.url)), 'utf8').replace(/[\s\uFEFF]/g, '');
const config = { configured: false, googleLoginEnabled: true, registrationEnabled: false, privacyNotice: 'Prévia do acesso com Google. Autenticação real disponível somente na implantação configurada.', subjects: ['Matemática', 'Português', 'Informática'], profiles: [
  { id: 'direct', label: 'Direto', description: 'Uma ação por vez.' },
  { id: 'supportive', label: 'Acolhedor', description: 'Apoio com ritmo cuidadoso.' },
  { id: 'investigative', label: 'Investigativo', description: 'Investigue suas ideias.' }
] };
const mock = `<script>window.google={script:{get run(){let success;const chain={withSuccessHandler(fn){success=fn;return chain;},withFailureHandler(){return chain;},getBootstrap(){queueMicrotask(()=>success(${JSON.stringify(config)}));}};return chain;}}};</script>`;
const page = index.replace('<?!= logoDataUri ?>', logo).replace('</head>', mock + '</head>');
http.createServer((request, response) => {
  if (request.url === '/favicon.ico') { response.writeHead(204).end(); return; }
  if (request.url !== '/') { response.writeHead(404).end(); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(page);
}).listen(8770, '127.0.0.1', () => console.log('Prévia de cadastro: http://127.0.0.1:8770/'));
