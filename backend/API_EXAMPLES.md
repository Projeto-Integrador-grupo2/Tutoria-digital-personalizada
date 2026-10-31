# Exemplos de integração

## 1 Autenticação da conta autorizada

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
```

As contas do piloto são provisionadas pela instituição; desative cadastro público e acesso anônimo. O backend rejeita usuários anônimos. A interface Apps Script já implementa login por Auth REST e envia o JWT por `google.script.run.tutorApi(body, token)`.

## 2 Chamada genérica

```ts
async function tutorApi(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('tutor-api', { body });
  if (error) throw error;
  return data;
}
```

## 3 Criar sessão

```ts
const created = await tutorApi({
  action: 'create_session',
  subject: 'Matemática',
  profile: 'supportive',
  activity: 'Calcule a área de um retângulo com base 8 e altura 5.',
  consent_version: '1.0',
  privacy_notice_accepted: true,
});
```

## 4 Enviar tentativa

```ts
const reply = await tutorApi({
  action: 'send_message',
  session_id: created.session.id,
  client_request_id: crypto.randomUUID(),
  content: 'Acho que devo multiplicar os valores, mas não sei justificar.',
  request_more_help: false,
});
```

## 5 Pedir mais ajuda

```ts
await tutorApi({
  action: 'send_message',
  session_id: created.session.id,
  content: 'Tentei relacionar base e altura, mas ainda não entendi o significado da operação.',
  request_more_help: true,
});
```

## 6 Consultar e encerrar

```ts
const page = await tutorApi({
  action: 'get_session',
  session_id: created.session.id,
  limit: 50,
});

if (page.pagination.has_more) {
  await tutorApi({
    action: 'get_session',
    session_id: created.session.id,
    limit: 50,
    before_message_id: page.pagination.next_before_message_id,
  });
}
await tutorApi({ action: 'finish_session', session_id: created.session.id,
  reflection: 'Entendi como relacionar as medidas.',
  remaining_difficulty: 'Preciso revisar as unidades.',
  next_step: 'Vou testar um exemplo com outros dados.' });
```

## 7 Listar histórico de sessões

```ts
const history = await tutorApi({
  action: 'list_sessions',
  status: 'finished', // opcional
  limit: 20,
});

if (history.pagination.has_more) {
  await tutorApi({
    action: 'list_sessions',
    limit: 20,
    before_created_at: history.pagination.next_before_created_at,
    before_session_id: history.pagination.next_before_session_id,
  });
}
```

## 8 Feedback

```ts
await tutorApi({
  action: 'submit_feedback',
  session_id: created.session.id,
  useful: 5,
  clear: 4,
  profile_fit: 5,
  autonomy: 4,
  comment: 'As perguntas ajudaram a organizar meu raciocínio.',
});
```

## 9 Consultar privacidade e excluir dados

```ts
await tutorApi({ action: 'get_privacy_status' });
await tutorApi({ action: 'delete_session', session_id: created.session.id });

// Operação irreversível: apaga todas as sessões, mensagens e feedbacks do usuário.
await tutorApi({
  action: 'delete_all_history',
  confirmation: 'APAGAR_MEU_HISTORICO',
});
```

## Idempotência

O frontend deve gerar um UUID para cada tentativa do estudante e reutilizar esse mesmo
`client_request_id` quando repetir a requisição após timeout ou perda de conexão. Se o backend já
tiver salvo a troca, ele retorna a resposta anterior com `idempotency.replayed: true`.

## Respostas de erro principais

| Código HTTP | Erro | Significado |
| --- | --- | --- |
| 400 | `invalid_*` | Campo ausente ou fora do formato. |
| 401 | `invalid_or_expired_token` | Sessão do Supabase inválida. |
| 403 | `origin_not_allowed` | Origem não cadastrada. |
| 404 | `session_not_found` | Sessão inexistente ou de outro usuário. |
| 409 | `session_is_finished` | Sessão já encerrada. |
| 429 | `rate_limit_exceeded` | Limite temporário excedido. |
| 500 | `*_failed` | Falha interna persistente. |

Formato padronizado:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Muitas solicitações. Aguarde antes de tentar novamente.",
    "retryable": true,
    "request_id": "85f6b3af-9d37-4ea4-9e6d-38cc3b93d816"
  }
}
```

Guarde apenas o `request_id` para suporte. Não registre o token JWT nem o texto completo da atividade.
