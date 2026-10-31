import {
  INTERACTION_TYPES,
  INTERACTION_FOR_LEVEL,
  type HintLevel,
  type PrecheckResult,
  type TutorOutput,
} from './types.ts';
import { maskPersonalData } from './pii.ts';

const DIRECT_ANSWER_PATTERNS = [
  /\b(?:me\s+)?d[êe]\s+(?:a|o)\s+(?:resposta|resultado|gabarito)\b/i,
  /\bs[oó]\s+(?:a|o)\s+(?:resposta|resultado|gabarito)\b/i,
  /\bqual\s+(?:é|e)\s+a\s+alternativa\s+correta\b/i,
  /\bmarque\s+(?:a|uma)\s+alternativa\b/i,
  /\bfa[çc]a\s+(?:tudo\s+)?por\s+mim\b/i,
  /\bresolva\s+(?:tudo|completamente|inteiro)\b/i,
  /\bentregue\s+(?:a|o)\s+(?:solu[çc][aã]o|trabalho)\s+pront[oa]\b/i,
  /\bsem\s+explica[çc][aã]o\b/i,
  /\banswer\s+(?:only|key)\b/i,
  /\b(?:resolva|faça|faca)\s+(?:a\s+)?(?:atividade|quest[aã]o|prova|reda[çc][aã]o)\s+(?:inteira|completa|por mim)/i,
];

const INJECTION_PATTERNS = [
  /\bignore\s+(?:todas?\s+)?(?:as\s+)?instru[çc][oõ]es\b/i,
  /\bignore\s+(?:the\s+)?previous\s+instructions\b/i,
  /\b(?:revele|mostre|copie|repita)\s+(?:o\s+)?prompt\b/i,
  /\bsystem\s+prompt\b/i,
  /\bmodo\s+(?:desenvolvedor|developer)\b/i,
  /\bfinja\s+que\s+n[aã]o\s+existem\s+regras\b/i,
  /\bjailbreak\b/i,
];

const FINAL_ANSWER_PATTERNS = [
  /\b(?:a\s+)?resposta\s+(?:final\s+)?(?:é|e|seria)(?=\s|[:=-]|$)/i,
  /\b(?:o\s+)?resultado\s+(?:final\s+)?(?:é|e|seria)(?=\s|[:=-]|$)/i,
  /\bgabarito\s*[:=-]/i,
  /\balternativa\s+(?:correta\s+)?(?:é|e)(?=\s)\s*[a-e]\b/i,
  /\bmarque\s+(?:a\s+)?(?:letra|op[çc][aã]o)\s*[a-e]\b/i,
  /\bportanto\s*,?\s*(?:x|y|z)?\s*=\s*-?\d+(?:[.,]\d+)?\b/i,
  /\btexto\s+pronto\b/i,
  /\bc[oó]digo\s+completo\b/i,
  /\bhere\s+is\s+the\s+(?:final\s+answer|complete\s+code)\b/i,
];

const ISOLATED_FINAL = /^\s*(?:[a-e]|verdadeiro|falso|-?\d+(?:[.,]\d+)?(?:\s*%|\s*[a-z²³]+)?)\s*[.!]?\s*$/i;


export function precheckStudentMessage(input: string): PrecheckResult {
  const normalized = input.normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').trim().replace(/\s{3,}/g, '  ');
  const masked = maskPersonalData(normalized);
  const directAnswerRequest = DIRECT_ANSWER_PATTERNS.some((pattern) => pattern.test(masked.text));
  const promptInjection = INJECTION_PATTERNS.some((pattern) => pattern.test(masked.text));
  const flags = [
    ...(directAnswerRequest ? ['direct_answer_request'] : []),
    ...(promptInjection ? ['prompt_injection'] : []),
    ...masked.categories.map((category) => `pii_${category}`),
  ];

  return {
    sanitized: masked.text,
    flags,
    directAnswerRequest,
    promptInjection,
    piiMasked: masked.masked,
  };
}

export function calculateHintLevel(
  current: number,
  requestMoreHelp: boolean,
  difficultyReported: boolean,
  hasTutorTurn = true,
): HintLevel {
  const safeCurrent = (Number.isFinite(current) ? Math.max(0, Math.min(5, Math.trunc(current))) : 0) as HintLevel;
  if (!hasTutorTurn) return 0;
  if (!requestMoreHelp && !difficultyReported) return safeCurrent;
  return Math.min(5, safeCurrent + 1) as HintLevel;
}

export function hasMeaningfulAttempt(text: string): boolean {
  const cleaned = text.replace(/\[[^\]]+REMOVIDO\]/g, '').trim();
  if (cleaned.length < 8) return false;
  if (DIRECT_ANSWER_PATTERNS.some((pattern) => pattern.test(cleaned))) return false;
  return /(?:tentei|multipliquei|somei|dividi|subtra[ií]|usei|apliquei|comparei|conclu[ií]|pensei|escrevi|porque|pois|portanto|minha (?:ideia|tentativa))\b|[a-z0-9)]\s*[=+*/−-]\s*[a-z0-9(]/i.test(cleaned);
}

export function reportsDifficulty(text: string): boolean {
  return /\b(?:n[aã]o (?:entendi|sei|consigo|compreendi)|ainda (?:tenho d[uú]vida|estou com dificuldade)|estou (?:travado|perdido)|preciso de (?:mais )?ajuda|outra pista|mais uma pista)\b/i.test(text);
}

// Encaminhamento local: este texto não é enviado ao provedor de IA.
export function needsHumanSupport(text: string): boolean {
  return /\b(?:quero (?:me matar|morrer|me machucar)|vou (?:me matar|me machucar|matar algu[eé]m)|penso em (?:suic[ií]dio|me matar)|quero matar algu[eé]m)\b/i.test(text);
}

export function safeFallback(level: HintLevel, reason = 'policy_fallback', profile = 'direct'): TutorOutput {
  const messages: Record<HintLevel, string> = {
    0: 'Antes de avançarmos, explique com suas palavras o que a atividade está pedindo e em qual parte surgiu a dúvida.',
    1: 'Qual informação do enunciado parece mais importante para dar o primeiro passo? Explique sua escolha.',
    2: 'Pense no conceito principal relacionado ao enunciado. Qual regra, definição ou relação poderia ajudar sem resolver tudo?',
    3: 'Vamos trabalhar somente o próximo passo: identifique os dados disponíveis e diga qual operação ou ideia você testaria primeiro.',
    4: 'Considere um exemplo semelhante com outros dados. Que estratégia funcionaria nesse exemplo e como ela poderia orientar sua atividade?',
    5: 'Revise sua tentativa e indique onde você acredita que o raciocínio mudou de direção. Eu comentarei esse trecho sem concluir por você.',
  };

  return {
    message: `${profile === 'supportive' ? 'Podemos avançar com calma. ' : profile === 'investigative' ? 'Vamos investigar seu raciocínio. ' : ''}${messages[level]}`,
    interaction_type: INTERACTION_FOR_LEVEL[level],
    hint_level: level,
    requires_student_action: true,
    student_action: 'Apresente uma tentativa ou explique o próximo passo com suas palavras.',
    contains_final_answer: false,
    safety_flags: [reason],
  };
}

function isHintLevel(value: unknown): value is HintLevel {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5;
}

export function validateTutorOutput(value: unknown, allowedLevel: HintLevel): TutorOutput {
  if (!value || typeof value !== 'object') throw new Error('output_not_object');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.message !== 'string' || candidate.message.trim().length < 10) {
    throw new Error('invalid_message');
  }
  if (candidate.message.length > 1800) throw new Error('message_too_long');
  if (!INTERACTION_TYPES.includes(candidate.interaction_type as never)) {
    throw new Error('invalid_interaction_type');
  }
  if (!isHintLevel(candidate.hint_level) || candidate.hint_level > allowedLevel) {
    throw new Error('hint_level_escalation');
  }
  if (candidate.hint_level !== allowedLevel) throw new Error('hint_level_mismatch');
  if (candidate.requires_student_action !== true) throw new Error('student_action_required');
  if (typeof candidate.student_action !== 'string' || candidate.student_action.trim().length < 5) {
    throw new Error('invalid_student_action');
  }
  if (candidate.student_action.length > 400) throw new Error('student_action_too_long');
  if (candidate.contains_final_answer !== false) throw new Error('self_reported_final_answer');
  if (!Array.isArray(candidate.safety_flags) || candidate.safety_flags.length > 12 || !candidate.safety_flags.every((x) => typeof x === 'string' && /^[a-z0-9_]{1,64}$/.test(x))) {
    throw new Error('invalid_safety_flags');
  }

  const message = maskPersonalData(candidate.message.trim()).text;
  const studentAction = maskPersonalData(candidate.student_action.trim()).text;
  if (message.length > 1800 || studentAction.length > 400) throw new Error('masked_output_too_long');
  if (candidate.interaction_type !== 'safe_refusal' && INTERACTION_FOR_LEVEL[candidate.hint_level] !== candidate.interaction_type) {
    throw new Error('interaction_level_mismatch');
  }
  if (ISOLATED_FINAL.test(message)) throw new Error('isolated_final_answer');
  if (FINAL_ANSWER_PATTERNS.some((pattern) => pattern.test(`${message}\n${studentAction}`)) || ISOLATED_FINAL.test(studentAction)) {
    throw new Error('final_answer_pattern');
  }
  const codeFenceLines = message.includes('```') ? message.split('\n').length : 0;
  if (codeFenceLines > 8) throw new Error('excessive_ready_code');
  if (!/[?]|(?:explique|compare|tente|identifique|revise|descreva|mostre|diga|indique)/i.test(
    `${message} ${candidate.student_action}`,
  )) {
    throw new Error('no_student_action_language');
  }

  return {
    message,
    interaction_type: candidate.interaction_type as TutorOutput['interaction_type'],
    hint_level: candidate.hint_level,
    requires_student_action: true,
    student_action: studentAction,
    contains_final_answer: false,
    safety_flags: [...new Set(candidate.safety_flags as string[])].slice(0, 12),
  };
}

export function outputLooksLikeFinalAnswer(text: string): boolean {
  return ISOLATED_FINAL.test(text) || FINAL_ANSWER_PATTERNS.some((pattern) => pattern.test(text));
}
