# Validação da candidata 1.2.0-rc.1

## Atualização de 31/10/2026 — login Google e registro Git

Nova execução local aprovada: `npm test` (46 verificações), `npm run check` (tipos) e `npm run test:api` (12 etapas simuladas). A varredura dos arquivos preparados para Git não encontrou padrões de credenciais; essa varredura não é uma auditoria completa.

O responsável confirmou no atendimento a implantação na nova conta, login Google com duas contas, resposta real da tutoria, histórico recuperado e isolado, resumo e avaliação. Confirmou uso da nova chave Groq e resposta após revogar a anterior. Esses testes funcionais relatados atualizam as pendências históricas abaixo; teste móvel, acessibilidade completa, retenção agendada, concorrência distribuída e avaliação educacional permanecem pendentes.

Veja `REGISTRO_GITHUB.md` para o estado atual. As seções seguintes preservam o relatório original da consolidação; os testes remotos não foram refeitos automaticamente nesta publicação.

## Relatório original de consolidação

Data: 30/10/2026. Ambiente local Windows; Node.js 24.17.0. Dependências e versões resolvidas no package-lock.json. Sem credenciais ou dados reais de estudantes.

## Verificações executadas

| Verificação | Resultado observado |
| --- | --- |
| Comparação dos pacotes v1.1 | Código principal idêntico; quatro arquivos comuns diferentes (README, CHANGELOG, gitignore e teste de guardrails); extras de colaboração no Git Ready |
| `npm run check` | TypeScript da Edge Function aprovado pelo Deno |
| `npm test` | 28 testes/verificações contabilizados pelo executor Node, sem falhas |
| `npm run test:api` | 1 suíte com 8 cenários sequenciais, sem falhas |
| Prévia desktop e celular (390 × 844) | Logo carregado e sem rolagem horizontal; perfil alterado na prévia desktop |
| Contratos de interface simulados | Login, preservação do texto em falha, mesmo UUID no reenvio, histórico, resumo, feedback, exclusão integral e saída |

Os testes de banco executam as três migrações no PostgreSQL embarcado PGlite. A criação da extensão pgcrypto é omitida somente nesse ambiente, que já dispõe de gen_random_uuid. São exercitados constraints, transação, RPC v3, reutilização de UUID, revisão obsoleta, RLS com duas identidades, negação de escrita pública, quota e expiração com cascata.

Os testes de API substituem respostas HTTP de Auth, REST e Groq. Exercitam origem, autenticação, limite de corpo, campos, falha da IA, revisão inválida, quota, erros seguros e encaminhamento local. Não medem latência nem disponibilidade dos serviços reais. A simulação da interface não substitui testes de navegador com autenticação real.

## Evidências visuais

- [Desktop](evidencias/preview-desktop.png).
- [Celular](evidencias/preview-mobile.png).

As imagens representam a prévia local, sem conversa real ou conta conectada. O logo fornecido foi preservado, inclusive o fundo quadriculado presente no próprio PNG.

## Homologação ainda necessária

- Aplicar migrações no Supabase de teste e conferir isolamento com dois JWTs reais.
- Provisionar contas autorizadas, validar expiração/renovação de login e publicação Apps Script.
- Exercitar modelo e revisão Groq reais, limites, timeout e latência.
- Exercitar chamadas concorrentes no ambiente distribuído; o teste local comprova conflito por revisão e transação, não desempenho sob carga.
- Agendar e observar retenção, exclusão, backup e restauração.
- Revisar pistas em diferentes disciplinas com docentes; avaliar possíveis vazamentos indiretos de conclusão e falsos positivos dos filtros.
- Testar teclado, foco, contraste, leitores de tela e fluxo móvel completo no endereço publicado.
- Comprovar framework web conforme requisito acadêmico e executar avaliação com participantes autorizados.

Não foram realizadas implantação remota, coleta com estudantes, validação de eficácia educacional ou publicação de repositório. A candidata está pronta para essas etapas de homologação, sem declaração de aprovação para produção.
