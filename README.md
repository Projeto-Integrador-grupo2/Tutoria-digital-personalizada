# Tutoria Digital Personalizada — 1.2.0-rc.1

Versão candidata consolidada em 30/10/2026 a partir dos pacotes v1.1 enviados pelo grupo. Tutor geral para diferentes disciplinas, com perfis direto, acolhedor e investigativo, perguntas diagnósticas e pistas graduais.

[Acessar o tutor](https://script.google.com/macros/s/AKfycbygPMxPsRuyfGqUQYGlsNu8964WkWgr6m0zsHdp_dZc6Eihfv4YVPq7-ClbkKLSytf8Lw/exec) · [Manual de uso](docs/MANUAL_USUARIO.md) · [Repositório](https://github.com/Projeto-Integrador-grupo2/Tutoria-digital-personalizada)

## Estrutura e arquitetura

- `apps-script/`: interface HTML/JavaScript, logo e hospedagem no Google Apps Script.
- `backend/`: backend vigente, Supabase Auth, Edge Function, PostgreSQL, integração Groq, migrações e testes.
- `docs/`: requisitos finais, consolidação técnica, avaliação acadêmica e evidências locais.
- `supabase/schema.sql`: caminho legado desativado. Use as migrações de `backend/supabase/migrations/`.

O navegador autentica pelo Google via Supabase Auth e PKCE; o login por senha de contas anteriores permanece disponível. Os tokens ficam apenas na memória da página. As chamadas passam pelo Apps Script, que encaminha o JWT à Edge Function. A função verifica o usuário, aplica regras pedagógicas e acessa o banco. Groq e credenciais administrativas ficam no ambiente da Edge Function. O ID autenticado é pseudônimo no banco pedagógico; o e-mail de acesso permanece no serviço Auth.

## Executar as verificações

Com Node.js 24.15 ou superior na linha 24 LTS:

```powershell
cd backend
npm ci
npm run check
npm test
npm run test:api
```

As dependências de desenvolvimento incluem Deno e PostgreSQL embarcado (PGlite). Os testes não precisam de credenciais nem fazem chamadas reais à Groq. Veja [evidências e limites](docs/VALIDACAO_RC.md).

## Implantação

1. Use um projeto Supabase separado do schema antigo do Apps Script. As tabelas das duas arquiteturas têm formatos incompatíveis; não aplique os dois schemas no mesmo banco.
2. Em `backend/`, aplique as migrações na ordem dos nomes. A migração de cadastro prepara o hook; sua ativação é uma etapa separada. Veja [configuração do backend](backend/README.md).
3. Configure os segredos indicados em `backend/.env.example`, incluindo Groq, modelo e origens permitidas. A revisão pedagógica vem ativada por padrão.
4. Mantenha login anônimo desativado. Configure [Entrar com Google](docs/LOGIN_GOOGLE.md) para novos participantes, sem SMTP ou aprovação administrativa.
5. Publique `tutor-api`. O pacote mantém `verify_jwt=false` porque valida explicitamente o JWT com `auth.getUser` em todas as ações privadas. Nunca remova essa validação.
6. Crie no Apps Script os arquivos `Code.gs`, `Index.html`, `Logo.html` e `appsscript.json`. Nas propriedades, defina `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `GOOGLE_LOGIN_ENABLED=true`, `REGISTRATION_ENABLED=false` e `OAUTH_CALLBACK_URL` com a URL publicada. Siga o guia de login Google para os dois retornos OAuth.
7. Configure o público da implantação para os participantes e execute como o proprietário responsável. A opção somente domínio não atende contas Gmail externas; revise o manifesto conforme a modalidade escolhida. Remova propriedades antigas de Groq e chaves administrativas do Apps Script.
8. Agende diariamente `select public.delete_expired_tutor_data(90);` no ambiente administrativo do banco. A expiração já impede leitura antes da limpeza.
9. Execute [o roteiro de homologação](backend/DEPLOYMENT_CHECKLIST.md) com contas de teste.

O PNG ao lado do Index serve à prévia local. No Apps Script, o logo é embutido por `Logo.html`. Abrir o arquivo HTML localmente permite conferir a interface, sem autenticação ou IA reais.

## Comportamento da candidata

Diagnóstico na primeira intervenção; níveis 0–5 controlados pelo backend; avanço de no máximo um nível por pedido de ajuda ou dificuldade explícita; nível 5 exige tentativa. Perfis alteram comunicação e mantêm as mesmas barreiras. Respostas externas passam por validação, máscara e revisão adicional; falhas resultam em pistas locais identificadas como modo degradado.

Histórico privado paginado, retomada de sessões, troca de perfil, avaliação opcional e exclusão integral. O resumo de encerramento organiza a reflexão, dificuldade e próximo passo declarados pelo estudante; não infere aprendizagem a partir de uma contagem de mensagens.

## Estado e documentação

Em 31/10/2026, o responsável confirmou a implantação, login Google com duas contas, tutoria real, recuperação e isolamento do histórico, resumo e avaliação. A troca da chave Groq foi confirmada no painel de uso e testada após revogar a anterior. Os testes automatizados não substituem revisão pedagógica multidisciplinar ou avaliação com participantes, ainda pendentes. Barreiras por regras e IA reduzem a entrega de respostas prontas, sem garantia absoluta.

- [Consolidação técnica](docs/CONSOLIDACAO_RC.md)
- [Relato técnico e acadêmico](docs/RELATO_TECNICO_ACADEMICO.md)
- [Requisitos da Quinzena 2](docs/referencias-finais.md)
- [Empacotamento reproduzível](scripts/package-release.ps1): execute em PowerShell para gerar o ZIP e seu manifesto SHA-256 em `releases/`.
- [Prompts pedagógicos](backend/PROMPTS_PEDAGOGICOS.md)
- [Privacidade e resiliência](backend/PRIVACIDADE_E_RESILIENCIA.md)
- [Acesso com Google](docs/LOGIN_GOOGLE.md): configuração do provedor, retorno no Apps Script e primeiro acesso sem SMTP ou aprovação administrativa.
- [Registro de publicação no GitHub](docs/REGISTRO_GITHUB.md)

A interface atual usa HTML/JavaScript e Apps Script. O requisito acadêmico de framework web precisa ser comprovado pelo grupo com a tecnologia adotada; esta entrega não declara Apps Script como framework. Também não apresenta resultados de eficácia educacional sem pesquisa com estudantes.
