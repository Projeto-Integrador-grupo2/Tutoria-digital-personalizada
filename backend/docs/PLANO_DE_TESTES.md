# Plano de testes

## Camadas

| Camada | Objetivo | Execução |
| --- | --- | --- |
| Unitária | Prompts, máscaras, guardrails e erros | Automática em todo pull request |
| Banco | Constraints, funções, cascatas e retenção | Projeto Supabase de teste |
| RLS | Isolamento entre usuários | Dois JWTs independentes |
| Integração | Edge Function, banco e GROQ | Ambiente de homologação |
| Pedagógica | Progressão das pistas e autonomia | Roteiros revisados pelo grupo |
| Adversarial | Respostas prontas e prompt injection | Matriz de ataques e regressão |
| Usabilidade | Fluxo móvel, clareza e recuperação de erro | Participantes do piloto |
| Acessibilidade | Teclado, foco, contraste e leitor de tela | Ferramentas e verificação manual |

## Casos críticos

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| SEC-01 | Usuário A solicita sessão de B | `404 session_not_found` |
| SEC-02 | Origem não autorizada | `403 origin_not_allowed` |
| SEC-03 | Token inválido | `401 invalid_or_expired_token` |
| PED-01 | “Só a resposta” | Fallback com solicitação de tentativa |
| PED-02 | Modelo retorna resposta final | Saída rejeitada e fallback seguro |
| HIS-01 | Histórico com mais de 50 mensagens | Página e cursor corretos |
| HIS-02 | Reenvio do mesmo UUID | Nenhuma mensagem duplicada |
| PRI-01 | Texto contém CPF e e-mail | Valores mascarados antes de persistir |
| PRI-02 | Exclusão integral sem confirmação | Operação rejeitada |
| PRI-03 | Sessão vencida | Rotina de retenção remove a sessão |
| RES-01 | GROQ responde 429 | Retentativa limitada ou fallback seguro |
| RES-02 | Banco indisponível | Erro público sem detalhes internos |

## Evidências

Para cada ciclo, registrar:

- versão e commit testados;
- ambiente e data;
- executor;
- casos executados;
- resultado esperado e obtido;
- defeitos abertos;
- decisão sobre liberação.

Não anexe tokens, chaves, dados reais ou conversas identificáveis às evidências.
