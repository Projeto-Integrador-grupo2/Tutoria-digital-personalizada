const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CPF = /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g;
const CNPJ = /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}\b/g;
const PHONE = /(?<!\d)(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}(?!\d)/g;
const URL_WITH_TOKEN = /https?:\/\/[^\s?]+\?[^\s]*(?:token|key|secret|code)=[^\s&]+/gi;
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const SECRET = /\b(?:gsk_|sb_secret_)[A-Za-z0-9_-]{16,}\b/g;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

export interface MaskResult {
  text: string;
  masked: boolean;
  categories: string[];
}

export function maskPersonalData(input: string): MaskResult {
  let text = input;
  const categories: string[] = [];

  const apply = (pattern: RegExp, replacement: string, category: string) => {
    const replaced = text.replace(pattern, replacement);
    if (replaced !== text) {
      categories.push(category);
      text = replaced;
    }
  };

  apply(URL_WITH_TOKEN, '[LINK COM CREDENCIAL REMOVIDO]', 'credencial_em_url');
  apply(SECRET, '[CREDENCIAL REMOVIDA]', 'credencial');
  apply(JWT, '[TOKEN REMOVIDO]', 'token');
  apply(EMAIL, '[E-MAIL REMOVIDO]', 'email');
  apply(CNPJ, '[CNPJ REMOVIDO]', 'cnpj');
  apply(CPF, '[CPF REMOVIDO]', 'cpf');
  apply(IPV4, '[ENDEREÇO IP REMOVIDO]', 'endereco_ip');
  apply(PHONE, '[TELEFONE REMOVIDO]', 'telefone');

  return { text, masked: categories.length > 0, categories };
}
