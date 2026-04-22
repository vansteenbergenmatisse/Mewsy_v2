/**
 * session-context.ts — Single source of truth for the SessionContext interface.
 * Imported by session.ts, agent.ts, and claude.ts.
 * Previously duplicated in all three files — now consolidated here.
 */

export interface ClarificationBundle {
  categoryIds: string[];
  qaPairs: { q: string; a: string }[];
}

export interface QAEntry {
  question: string;
  answer: string;
  source: 'BASIC' | 'CLARIFY';
}

export interface AnswerContractShape {
  topics_covered: string[];
  docs_used: string[];
  open_threads: string[];
}

export interface SessionContext {
  language: string | null;
  tools: string[];
  setupType: string | null;
  tier: 'bronze' | 'silver' | 'gold' | null;
  companyName: string | null;
  lastLoadedDocIds: string[];
  frustrationCounter: number;
  clarifyRoundCounter: number;
  previousQuestion: string | null;
  clarificationBundles: ClarificationBundle[];
  originalQuestion?: string | null;
  qaLog: QAEntry[];
  postAnswerMode: boolean;
  postAnswerSignal: 'COMPLETE' | 'PARTIAL' | null;
  answerContract: AnswerContractShape | null;
  qaLogSnapshot: QAEntry[];
  postAnswerClarifyUsed: boolean;
}
