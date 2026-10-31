# Histórico de versões

## Em desenvolvimento

- Estrutura do repositório Git, documentação técnica e fluxo de colaboração.
- Workflow automático de testes para pushes e pull requests.
- Templates de issues, pull request, segurança e código de conduta.

## 1.1.0 — 18/10/2026

- Histórico de sessões e mensagens com paginação.
- Exclusão integral do histórico mediante confirmação explícita.
- Retenção configurável por sessão com `expires_at`.
- Idempotência de mensagens por `client_request_id` e `exchange_id`.
- Erros públicos padronizados com `request_id`, `retryable` e `Retry-After`.
- Classificação de falhas transitórias da GROQ e modo degradado seguro.
- Mascaramento adicional de CNPJ, IPv4, JWT e credenciais GROQ/Supabase.
- Respostas com cabeçalhos `no-store`, `nosniff` e `no-referrer`.
- Testes unitários ampliados de 9 para 12 casos.

## 1.0.0 — 25/09/2026

- Primeira versão do backend Supabase + GROQ.
- Sessões, mensagens, feedback, RLS, rate limit e barreiras pedagógicas.
# 1.2.0-rc.1 — 2026-10-30

- Consolidada a base Git Ready v1.1 em `backend/` e adaptado o Index existente.
- Diagnóstico inicial obrigatório, progressão por pedido/dificuldade e tentativa para nível 5.
- Revisão ativada e falha fechada; validação de todos os campos de texto da IA.
- Persistência v3 com revisão, detecção de UUID reutilizado e RLS temporal.
- Resumo de autorreflexão, login institucional provisionado e tokens em memória.
- Testes de banco PostgreSQL embarcado, API simulada e interface.
- Documentação técnica/acadêmica e pacote candidato. Implantação e piloto ainda pendentes.
