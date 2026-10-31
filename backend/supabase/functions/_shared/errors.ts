export interface ErrorDefinition {
  status: number;
  message: string;
  retryable: boolean;
}

const ERROR_DEFINITIONS: Record<string, ErrorDefinition> = {
  invalid_field: { status: 400, message: 'Confira os campos e os limites informados.', retryable: false },
  session_changed: { status: 409, message: 'A sessão mudou durante o envio. Atualize o histórico e tente novamente.', retryable: true },
  idempotency_key_reused: { status: 409, message: 'Este identificador já foi usado para outra mensagem.', retryable: false },
  closing_reflection_required: { status: 400, message: 'Explique o que aprendeu, a dificuldade que permanece e seu próximo passo.', retryable: false },
  invalid_json: { status: 400, message: 'O corpo da requisição não contém um JSON válido.', retryable: false },
  invalid_action: { status: 400, message: 'A ação informada é inválida.', retryable: false },
  unknown_action: { status: 400, message: 'A ação solicitada não existe.', retryable: false },
  privacy_notice_must_be_accepted: { status: 400, message: 'É necessário aceitar o aviso de privacidade.', retryable: false },
  invalid_delete_confirmation: { status: 400, message: 'A confirmação para apagar o histórico é inválida.', retryable: false },
  missing_bearer_token: { status: 401, message: 'A autenticação é obrigatória.', retryable: false },
  invalid_or_expired_token: { status: 401, message: 'A sessão expirou ou não é válida.', retryable: false },
  origin_not_allowed: { status: 403, message: 'Esta origem não está autorizada.', retryable: false },
  session_not_found: { status: 404, message: 'Sessão não encontrada.', retryable: false },
  session_is_finished: { status: 409, message: 'Esta sessão já foi encerrada.', retryable: false },
  request_in_progress: { status: 409, message: 'Esta mensagem já está sendo processada.', retryable: true },
  content_type_must_be_json: { status: 415, message: 'Envie o conteúdo como application/json.', retryable: false },
  request_too_large: { status: 413, message: 'A requisição excede o tamanho permitido.', retryable: false },
  rate_limit_exceeded: { status: 429, message: 'Muitas solicitações. Aguarde antes de tentar novamente.', retryable: true },
  method_not_allowed: { status: 405, message: 'Método HTTP não permitido.', retryable: false },
  ai_temporarily_unavailable: { status: 503, message: 'O tutor está temporariamente indisponível.', retryable: true },
  internal_error: { status: 500, message: 'Não foi possível concluir a operação.', retryable: true },
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(code: string, options: { status?: number; retryable?: boolean; retryAfterSeconds?: number } = {}) {
    const definition = ERROR_DEFINITIONS[code] ?? (code.startsWith('invalid_') ? ERROR_DEFINITIONS.invalid_field : ERROR_DEFINITIONS.internal_error);
    super(definition.message);
    this.name = 'ApiError';
    this.code = code;
    this.status = options.status ?? definition.status;
    this.retryable = options.retryable ?? definition.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function publicError(code: string): ErrorDefinition {
  return ERROR_DEFINITIONS[code] ?? ERROR_DEFINITIONS.internal_error;
}

export function errorPayload(error: ApiError, requestId: string) {
  return {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      request_id: requestId,
    },
  };
}
