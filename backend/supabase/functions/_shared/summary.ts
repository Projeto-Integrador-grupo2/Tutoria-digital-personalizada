import { ApiError } from './errors.ts';
import { maskPersonalData } from './pii.ts';

export function buildLearningSummary(subject: string, body: Record<string, unknown>, exchanges: number): string {
  const field = (name: string, max: number): string => {
    const value = body[name];
    if (typeof value !== 'string' || value.trim().length < 5 || value.length > max) {
      throw new ApiError('closing_reflection_required');
    }
    return maskPersonalData(value.normalize('NFKC').trim()).text.slice(0, max);
  };
  // Síntese do relato do estudante, sem inferir domínio ou inventar conceitos.
  return [
    `Disciplina: ${subject}. Interações: ${exchanges}.`,
    `Aprendizagem relatada pelo estudante: ${field('reflection', 800)}`,
    `Dificuldade ou ponto a revisar: ${field('remaining_difficulty', 600)}`,
    `Próximo passo planejado: ${field('next_step', 400)}`,
    'Registro de autoavaliação; não representa nota nem comprovação de domínio. Confira os conceitos com o docente e o material da disciplina.',
  ].join('\n\n');
}
