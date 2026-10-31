# Checklist de implantação

## Supabase

- [ ] Projeto criado na região escolhida pelo grupo.
- [ ] Migração SQL executada sem erro.
- [ ] Projeto separado do schema antigo; migrações `202609250001`, `202610180001` e `202610300001` aplicadas em ordem.
- [ ] Cadastro público e autenticação anônima desativados; contas do piloto provisionadas.
- [ ] Revisão Groq ativada e respostas malformadas rejeitadas; modelos testados no ambiente real.
- [ ] `npm run check`, `npm test` e `npm run test:api` executados com sucesso.
- [ ] Apps Script usa apenas URL e chave pública, sem segredos da Groq ou administrativos.
- [ ] Conflito entre mensagens simultâneas tratado com atualização do histórico e reenvio.
- [ ] RLS oculta sessão expirada antes da limpeza; retenção diária agendada.
- [ ] Encerramento inclui reflexão, dificuldade e próximo passo; resumo identificado como autorrelato.
- [ ] Login com contas autorizadas testado; sessão anônima rejeitada pelo backend.
- [ ] RLS habilitada nas cinco tabelas.
- [ ] Usuário A não consegue ler a sessão do usuário B.
- [ ] `tutor-api` publicada com `verify_jwt = false`; autenticação validada em código.
- [ ] Project URL e publishable key utilizadas no frontend.
- [ ] Secret key ou service role ausente do frontend e do repositório.

## GROQ

- [ ] Projeto e chave exclusivos para o Tutor Digital.
- [ ] `GROQ_API_KEY` cadastrada em Edge Function Secrets.
- [ ] `GROQ_MODEL` corresponde a um modelo de produção ativo.
- [ ] Limites de gastos e alertas configurados.
- [ ] Rate limits conhecidos e teste de HTTP 429 realizado.
- [ ] Decisão sobre Zero Data Retention registrada.
- [ ] Revisão adicional mantida ativa; custo e latência avaliados no projeto de homologação.

## Aplicação

- [ ] `ALLOWED_ORIGINS` contém somente os domínios utilizados.
- [ ] Nenhuma chave secreta usa prefixo `VITE_`.
- [ ] Aviso de privacidade exibido antes da criação da sessão.
- [ ] Exclusão da sessão testada.
- [ ] Exclusão integral do histórico testada com confirmação explícita.
- [ ] Paginação de sessões e de mensagens testada com mais de uma página.
- [ ] Reenvio do mesmo `client_request_id` não cria mensagens duplicadas.
- [ ] Máscara de e-mail, CPF, CNPJ, telefone, IP, JWT e credenciais testada.
- [ ] Perfis direto, acolhedor e investigativo testados.
- [ ] Escada de pistas validada do nível 0 ao 5.
- [ ] Pedidos diretos e indiretos de gabarito bloqueados.
- [ ] Tentativas de prompt injection bloqueadas.
- [ ] Testes unitários executados.
- [ ] Testes adversariais registrados como regressão.

## Operação e LGPD

- [ ] Prazo de retenção definido e comunicado.
- [ ] `DATA_RETENTION_DAYS` configurado com o prazo aprovado para o piloto.
- [ ] Execução periódica de `delete_expired_tutor_data` configurada.
- [ ] Backup e restauração testados.
- [ ] Acesso aos logs restrito.
- [ ] Logs não contêm chaves, JWT ou conteúdo integral desnecessário.
- [ ] Responsáveis por suporte e incidentes definidos.
- [ ] Procedimento para participantes menores de idade aprovado pela instituição.
