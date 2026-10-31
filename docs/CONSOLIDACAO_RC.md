# Consolidação técnica — 1.2.0-rc.1

Data: 30/10/2026. Escopo autorizado: backend, integração IA, prompts pedagógicos, barreiras contra respostas prontas, histórico, erros, proteção de dados e documentação técnica/acadêmica.

## Origem e organização

Pacotes: Tutor_Digital_Git_Ready_v1_1.zip e Tutor_Digital_Web_Backend_Supabase_GROQ_v1_1.zip. O Git Ready foi extraído para backend, sem sobrescrever silenciosamente o projeto anterior. A comparação por arquivo está em ORIGEM_PACOTES.json. Conteúdo documental foi tratado como referência, sem autorização adicional para deploy, serviços externos ou mudança de contas.

O backend vigente é a Edge Function. O Apps Script foi convertido em hospedagem e proxy autenticado; o schema anterior foi desativado para evitar publicação acidental de políticas anon permissivas.

## Mudanças

| Área | Mudança | Consequência |
| --- | --- | --- |
| Tutoria | Diagnóstico na primeira troca, avanço por pedido/dificuldade e tentativa para nível 5 | Evita avançar apenas pelo número de mensagens |
| IA | Validação de mensagem, ação e metadados; revisão ativada e falha fechada | Reduz aceitação de saídas incompletas ou respostas prontas |
| Resiliência | Timeout e retentativas limitadas; fallback identificado | Mantém uma orientação geral sem fingir resposta da IA |
| Histórico | Cursor composto e persistência v3 com revisão | Evita perdas em empates de data e escritas com contexto obsoleto |
| Dados | JWT, RLS temporal, rejeição de conta anônima, máscara na entrada/saída | Isola o histórico e evita coleta de e-mail no contexto pedagógico |
| Encerramento | Reflexão, dificuldade e próximo passo obrigatórios | Resumo baseado no relato, sem inferir domínio |
| Interface | Login, retomada, exclusão, feedback, mensagens acessíveis e logo | Integra o Index ao contrato atual |

## Liberação

Candidata para homologação. As verificações locais e limitações estão em VALIDACAO_RC.md. Não foram aplicadas migrações em banco remoto, configuradas credenciais, publicados serviços ou criados commits/pushes.
