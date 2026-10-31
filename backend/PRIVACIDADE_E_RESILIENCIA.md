# Histórico, erros e proteção de dados

## Histórico

O histórico é privado por usuário e protegido por RLS. O frontend usa:

- `list_sessions` para listar sessões sem carregar o enunciado completo;
- `get_session` para abrir uma sessão e paginar mensagens;
- `delete_session` para excluir uma sessão específica;
- `delete_all_history` para apagar todas as sessões, mensagens e feedbacks.

As mensagens são ordenadas pelo identificador crescente. `get_session` devolve a página em ordem
de leitura e o cursor `next_before_message_id`. A listagem de sessões usa
o par `next_before_created_at` e `next_before_session_id`. Os dois devem ser enviados juntos. O cliente não deve montar cursores por conta própria.

## Reenvio seguro

Cada envio deve conter um UUID em `client_request_id`. Em timeout ou perda de conexão, o frontend
repete a chamada com o mesmo UUID. O banco mantém uma restrição única por usuário, sessão e pedido.
Assim, a troca não é duplicada mesmo quando duas requisições concorrentes chegam ao backend.

A RPC v3 compara o conteúdo do reenvio. Mesmo UUID com outra mensagem resulta em 409. A revisão da sessão também impede salvar contexto anterior a outra mensagem, encerramento ou troca de perfil. O cliente deve atualizar o histórico e reenviar em `session_changed`. Inferências concorrentes ainda podem consumir quota antes da transação; o controle garante persistência consistente.

## Erros

Toda falha pública contém:

- `code`: identificador estável para a lógica do frontend;
- `message`: explicação segura em português;
- `retryable`: se uma nova tentativa posterior faz sentido;
- `request_id`: correlação para suporte, também enviada em `X-Request-Id`.

O backend não devolve stack trace, texto de exceção do banco, resposta bruta da GROQ, chave, token
ou conteúdo integral do estudante. Os logs registram somente categoria e `request_id`.

Para `429`, o cabeçalho `Retry-After` informa o tempo mínimo de espera. Falhas temporárias da IA
geram uma intervenção pedagógica local segura e `availability.degraded: true`; a sessão continua
utilizável sem liberar resposta pronta.

## Dados coletados

| Dado | Finalidade | Proteção | Exclusão |
| --- | --- | --- | --- |
| ID do usuário Supabase | Isolar o histórico | JWT, RLS e acesso administrativo só no backend | Cascata ao excluir usuário |
| Disciplina e atividade | Contexto pedagógico | Máscara antes de salvar e enviar à GROQ | Sessão, exclusão total ou retenção |
| Mensagens | Continuidade do tutor | RLS, máscara e paginação | Sessão, exclusão total ou retenção |
| Perfil e nível de pista | Personalização | Dados não sensíveis e acesso por proprietário | Junto da sessão |
| Feedback | Avaliação do protótipo | Comentário mascarado e RLS | Cascata com a sessão |
| Evento de privacidade | Evidência mínima de aceite/exclusão | Sem texto da atividade, IP ou token | Após 365 dias |

Não são persistidos endereço IP, JWT, cabeçalhos de autenticação, prompt de sistema ou resposta
bruta rejeitada da IA. O mascaramento cobre e-mail, CPF, CNPJ, telefone, IPv4, links com
credencial, JWT e prefixos conhecidos de chaves GROQ/Supabase. Como detecção automática não é
infalível, o aviso de privacidade deve orientar o estudante a não inserir dados pessoais.

## Retenção

`DATA_RETENTION_DAYS` define o prazo aplicado quando uma sessão é criada. O valor aceito pelo
backend fica entre 1 e 365 dias. A coluna `expires_at` preserva o prazo daquela sessão mesmo se a
configuração mudar posteriormente.

A função SQL `delete_expired_tutor_data` deve ser executada diariamente por agendamento no banco.
Ela remove sessões vencidas, janelas antigas de rate limit e eventos de privacidade com mais de
365 dias. Backups seguem a política contratada no Supabase e precisam ser considerados no aviso de
privacidade e no procedimento institucional de exclusão.

## Testes mínimos antes do piloto

1. Usuário A não lê, altera nem apaga dados do usuário B.
2. Duas chamadas com o mesmo `client_request_id` criam somente duas mensagens: estudante e tutor.
3. A paginação não repete mensagens dentro de uma sessão.
4. A exclusão total exige exatamente `APAGAR_MEU_HISTORICO`.
5. Os exemplos de CPF, CNPJ, telefone, e-mail, IP, JWT e chaves são mascarados.
6. Erros do banco e da GROQ não aparecem integralmente na resposta nem nos logs.
7. HTTP 429 respeita `Retry-After`; timeouts da GROQ resultam em fallback pedagógico.
8. A rotina de retenção remove somente dados vencidos.

## Observação institucional

As medidas técnicas apoiam a proteção de dados, mas não substituem a definição institucional de
controlador, operador, base legal, canal do titular, política de backups e procedimento para
participantes menores de idade. Esses itens devem ser aprovados antes da coleta no piloto.

## Delimitações da RC

O cliente de Auth pode guardar e-mail e metadados de acesso conforme a configuração do Supabase. A aplicação não envia e-mail de login à Groq e não o copia para registros pedagógicos. A afirmação de que IP não é persistido refere-se às tabelas da aplicação, não a logs de infraestrutura dos provedores.

O Apps Script recebe temporariamente o JWT para encaminhamento, sem persistência em propriedades ou logs do código. Tokens ficam na memória da página; fechar ou recarregar exige entrar novamente. A origem é fixa e o proxy não permite escolher URLs externas.

Texto livre pode conter nome, endereço ou dados sensíveis fora dos padrões reconhecidos. O mascaramento não equivale a anonimização garantida. Manifestações de risco identificadas são substituídas por marcador no conteúdo da mensagem; o encaminhamento não constitui atendimento humano nem diagnóstico.

RLS temporal bloqueia leitura de sessões vencidas e respectivos conteúdos antes da limpeza agendada. O backend rejeita usuários anônimos. O piloto depende de cadastro público desativado e contas autorizadas provisionadas pela instituição.
