export const PROFILES = ['direct', 'supportive', 'investigative'] as const;
export type TutorProfile = (typeof PROFILES)[number];

export const INTERACTION_TYPES = [
  'diagnostic',
  'guiding_question',
  'conceptual_hint',
  'micro_step',
  'parallel_example',
  'commented_feedback',
  'safe_refusal',
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const INTERACTION_FOR_LEVEL: Record<HintLevel, InteractionType> = {
  0: 'diagnostic',
  1: 'guiding_question',
  2: 'conceptual_hint',
  3: 'micro_step',
  4: 'parallel_example',
  5: 'commented_feedback',
};

export interface TutorSession {
  id: string;
  user_id: string;
  subject: string;
  profile: TutorProfile;
  activity: string;
  hint_level: HintLevel;
  status: 'active' | 'finished';
  consent_version: string;
  privacy_notice_accepted: boolean;
  summary: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface StoredMessage {
  id: number;
  exchange_id?: string | null;
  client_request_id?: string | null;
  role: 'student' | 'tutor';
  content: string;
  interaction_type: InteractionType | null;
  hint_level: HintLevel | null;
  created_at: string;
}

export interface TutorOutput {
  message: string;
  interaction_type: InteractionType;
  hint_level: HintLevel;
  requires_student_action: true;
  student_action: string;
  contains_final_answer: false;
  safety_flags: string[];
}

export interface PrecheckResult {
  sanitized: string;
  flags: string[];
  directAnswerRequest: boolean;
  promptInjection: boolean;
  piiMasked: boolean;
}

export interface GroqUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface GroqResult {
  output: TutorOutput;
  model: string;
  usage: GroqUsage;
}

export interface HistoryItem {
  role: 'student' | 'tutor';
  content: string;
}

export interface PromptContext {
  subject: string;
  activity: string;
  profile: TutorProfile;
  hintLevel: HintLevel;
  studentMessage: string;
  history: HistoryItem[];
  precheckFlags: string[];
}
