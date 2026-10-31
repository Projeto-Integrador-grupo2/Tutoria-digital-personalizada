# Como contribuir

Este repositório é desenvolvido pelo grupo do Projeto Integrador. Toda alteração deve ser pequena,
rastreável e revisada antes de chegar à branch principal.

## Fluxo de trabalho

1. Atualize a branch `main`.
2. Crie uma branch a partir dela.
3. Implemente uma única mudança coerente.
4. Execute `npm test` e `npm run check:syntax`.
5. Revise se nenhum segredo ou dado pessoal foi incluído.
6. Abra um pull request e aguarde pelo menos uma revisão.

## Nomes de branches

| Prefixo | Uso | Exemplo |
| --- | --- | --- |
| `feature/` | Nova funcionalidade | `feature/historico-sessoes` |
| `fix/` | Correção | `fix/paginacao-mensagens` |
| `docs/` | Documentação | `docs/manual-implantacao` |
| `test/` | Testes | `test/rls-dois-usuarios` |
| `security/` | Proteção e privacidade | `security/mascara-cnpj` |

Use nomes curtos, minúsculos, sem espaços e sem acentos.

## Commits

Use mensagens no imperativo e informe o tipo da alteração:

```text
feat: adiciona histórico paginado
fix: impede duplicação no reenvio de mensagem
docs: explica configuração dos segredos
test: cobre bloqueio de resposta final
security: mascara tokens antes do armazenamento
refactor: separa tratamento público de erros
```

Evite commits genéricos como `ajustes`, `teste` ou `versão final`.

## Pull requests

O pull request deve informar:

- problema resolvido;
- solução adotada;
- arquivos ou migrações afetados;
- testes executados;
- impacto pedagógico, de privacidade e de compatibilidade;
- procedimento de retorno, quando houver mudança de banco.

Não misture correções sem relação no mesmo pull request.

## Banco de dados

- Nunca altere uma migração já aplicada em ambiente compartilhado.
- Crie uma nova migração com prefixo de data e descrição objetiva.
- Inclua RLS, índices, permissões e política de reversão na revisão.
- Teste sempre com dois usuários: proprietário e usuário sem acesso.
- Não use a chave `service_role` no frontend.

## IA e regras pedagógicas

Uma alteração em prompt ou guardrail deve incluir teste de regressão. Verifique no mínimo:

- pedido direto de resposta;
- pedido indireto de gabarito;
- tentativa de prompt injection;
- resposta isolada ou alternativa correta;
- código ou texto pronto;
- avanço de pista sem tentativa significativa;
- manutenção dos três perfis do tutor.

## Privacidade

Não inclua em código, teste, issue, commit ou pull request:

- chaves reais, JWT, cookies ou URLs assinadas;
- nomes e contatos reais de estudantes;
- atividades ou conversas identificáveis coletadas no piloto;
- capturas de tela contendo dados pessoais;
- respostas brutas da GROQ com conteúdo do usuário.

Use somente dados sintéticos nos testes e exemplos.
