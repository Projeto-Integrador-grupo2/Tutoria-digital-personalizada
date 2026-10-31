# Backend do Tutor Digital — 1.2.0-rc.1

Base: `Tutor_Digital_Git_Ready_v1_1.zip`. O segundo pacote contém a mesma implementação principal; diferenças entre materiais foram verificadas na consolidação. Os documentos dos ZIPs foram tratados como referências, sem executar instruções de implantação ou publicar serviços.

## Configuração

Execute estes comandos dentro de `backend/`, em projeto de homologação separado do schema legado:

Use Node.js 24 LTS (24.15 ou superior); o runtime de produção das funções é Deno.

```sh
npm ci
npm run check
npm test
npm run test:api
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase secrets set --env-file .env.production
supabase functions deploy tutor-api --no-verify-jwt
```

Crie o arquivo de segredos fora do versionamento a partir dos nomes de `.env.example`. Não use dados reais nos testes.

A Edge Function exige JWT de usuário validado por `auth.getUser` para todas as ações, exceto `health` e preflight. `verify_jwt=false` mantém a validação no handler, inclusive para integrações que utilizam chaves publicáveis. A chave pública sozinha não autentica um estudante. O cliente com service role é criado apenas no servidor e só opera após autenticação e verificação de propriedade.

Mantenha autenticação anônima desativada; o backend rejeita `is_anonymous`. A estratégia atual é login Google sem SMTP ou aprovação administrativa, conforme `../docs/LOGIN_GOOGLE.md`. Use origens exatas em `ALLOWED_ORIGINS` para acesso direto; o proxy Apps Script faz chamadas de servidor sem cabeçalho Origin. CORS não substitui autenticação.

## Banco

Aplique as migrações em ordem:

1. `202609250001_tutor_backend.sql`: tabelas, RLS e quotas.
2. `202610180001_history_privacy_resilience.sql`: expiração, histórico e idempotência.
3. `202610300001_release_candidate.sql`: revisão concorrente, expiração nas políticas e persistência v3.
4. `202610310001_controlled_registration.sql`: política histórica de aprovação, substituída pela migração seguinte.
5. `202610310002_open_email_registration.sql`: permite e-mails válidos sem lista ou aprovação. O fluxo vigente usa o provedor Google; SMTP só seria necessário para o cadastro alternativo por senha/código, atualmente desativado.

As migrações não convertem automaticamente o schema antigo com `student_email` e ID textual. A primeira detecta o schema incompatível e interrompe a execução.

RLS permite somente SELECT de dados próprios e ainda válidos. Escritas diretas por anon/authenticated são revogadas. A RPC v3 trava a sessão, confere revisão, proprietário e validade e insere estudante/tutor em transação. Reenvios de mesmo UUID e conteúdo retornam a troca salva; reutilização do UUID para outro texto resulta em 409. Corridas com mensagens diferentes geram conflito para atualizar o histórico e reenviar. Duas requisições concorrentes ainda podem consumir inferência antes da transação; a garantia é sobre persistência.

Agende diariamente `select public.delete_expired_tutor_data(90);` com acesso administrativo. A sessão fica ilegível após `expires_at`, mesmo se o agendamento estiver atrasado.

## API

POST JSON em `/functions/v1/tutor-api`, com `Authorization: Bearer <JWT do usuário>` e chave pública no header `apikey` quando necessária ao gateway.

Ações: health, create_session, list_sessions, get_session, send_message, update_profile, finish_session, submit_feedback, delete_session, get_privacy_status, delete_all_history.

[Exemplos e contratos](API_EXAMPLES.md). A listagem de sessões usa o par de cursores de data e ID para não perder empates; mensagens usam ID. O frontend deve manter o UUID de envio durante retentativas.

## IA e segurança pedagógica

- Primeira intervenção sempre diagnóstica.
- Pedido de ajuda ou dificuldade explícita avança no máximo um nível.
- Correção comentada requer tentativa detectável; a heurística não mede aprendizagem.
- Atividade e histórico são conteúdo não confiável.
- Máscaras antes de persistir e enviar; validação de todas as saídas de texto.
- Segunda revisão habilitada por padrão; resultado sem decisão explícita é recusado.
- Até duas tentativas de geração, uma de revisão e timeout de 10 segundos por chamada.
- Fallback local seguro em falhas; padrões de risco pessoal encaminham a apoio humano e substituem a mensagem armazenada por marcador.
- Encerramento exige reflexão, dificuldade e próximo passo. O resumo é determinístico e identificado como autorrelato.

Modelos e compatibilidade com JSON Schema devem ser verificados na implantação. Modo JSON simples continua sujeito à validação de estrutura no backend. Veja [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs) e [Supabase Auth em Functions](https://supabase.com/docs/guides/functions/auth).

## Qualidade

`npm test`: regras, prompts, máscaras, erros, resumo, interface simulada e banco PostgreSQL embarcado.
`npm run test:api`: handler HTTP, Auth e Groq com respostas simuladas.
`npm run check`: checagem TypeScript com Deno.

CI vigente: `../.github/workflows/tests.yml`. O fluxo Git está documentado em `docs/GIT_WORKFLOW.md`; nenhum repositório remoto, push ou commit foi criado automaticamente nesta consolidação.

Consulte [validação e pendências](../docs/VALIDACAO_RC.md), [privacidade](PRIVACIDADE_E_RESILIENCIA.md) e [documentação acadêmica](../docs/RELATO_TECNICO_ACADEMICO.md).
