import type { DailyActivity } from '../types';
import type { AssessmentVersionRecord, WellnessPlan } from '../types/assessment';
import type { CompanionConcernSummary } from '../types/firebase';
import { countCanonicalAnsweredQuestions } from './assessmentValidation';
import { calculateActivityAdherence, calculateAssessmentSummary } from './lifestyleLogic';

export {
  detectUrgentSymptomSignal,
  detectMinorOrGuardianContext,
  formatConsultationCharge,
  formatConsultationMode,
  matchVerifiedPractitioners,
  normalizeAYUSHDisciplines,
  type UrgentSymptomResult,
  type RankedPractitionerMatch,
  type PractitionerMatchResult,
  type MatchPractitionerInput,
} from './companionMatching';

export const COMPANION_GREETING_MESSAGE =
  "Welcome to your AYUSH Wellness Companion. Tell me what has been concerning you lately. I'll help you understand your wellness options and find an appropriate practitioner.";

export const COMPANION_DISCLOSURE_TEXT =
  'AI Wellness Navigation Notice: This assistant provides educational wellness guidance and practitioner discovery only. It does not diagnose medical conditions, prescribe medicines, or replace an in-person clinical evaluation.';

export interface SanitizedCompanionContext {
  assessmentCompleted: boolean;
  answeredCount: number;
  totalQuestions: number;
  circadianBalance: string;
  digestiveAgni: string;
  dailyMovement: string;
  stressResilience: string;
  constitutionTendency: string;
  assessmentVersion: number | null;
  activePlanTitle: string | null;
  activePlanFocus: string | null;
  dinacharyaAdherencePercent: number;
  dinacharyaCompletedCount: number;
  dinacharyaTotalCount: number;
  pendingDinacharyaTitles: string[];
}

export interface BuildCompanionContextInput {
  hasConsent: boolean;
  assessmentAnswers: Record<string, string>;
  totalQuestions: number;
  activePlan?: WellnessPlan | null;
  assessmentHistory?: AssessmentVersionRecord[];
  activities?: DailyActivity[];
}

/**
 * Builds a minimal-PII, non-identifying wellness context summary for the AI assistant
 * strictly when the seeker grants explicit consent.
 */
export function buildSanitizedCompanionContext(
  input: BuildCompanionContextInput
): SanitizedCompanionContext | null {
  if (!input.hasConsent) return null;

  const answers = input.assessmentAnswers || {};
  const answeredCount = countCanonicalAnsweredQuestions(answers);
  const totalQuestions = Math.max(0, input.totalQuestions || 20);
  const assessmentCompleted = totalQuestions > 0 && answeredCount >= totalQuestions;
  const summary = calculateAssessmentSummary(answers);
  const latestHistory =
    input.assessmentHistory && input.assessmentHistory.length > 0
      ? input.assessmentHistory[0]
      : null;

  const activities = input.activities || [];
  const adherencePercent = calculateActivityAdherence(activities);
  const completedCount = activities.filter((a) => a.completed).length;
  const pendingTitles = activities
    .filter((a) => !a.completed)
    .map((a) => a.title)
    .slice(0, 8);

  return {
    assessmentCompleted,
    answeredCount,
    totalQuestions,
    circadianBalance:
      answeredCount > 0 ? summary.circadianBalanceCategory : 'Not yet recorded',
    digestiveAgni:
      answeredCount > 0 ? summary.digestiveAgniCategory : 'Not yet recorded',
    dailyMovement:
      answeredCount > 0 ? summary.movementCategory : 'Not yet recorded',
    stressResilience:
      answeredCount > 0 ? summary.stressCategory : 'Not yet recorded',
    constitutionTendency:
      input.activePlan?.constitutionTendency ||
      (answeredCount > 0 ? summary.constitutionTendency : 'Not yet recorded'),
    assessmentVersion: latestHistory ? latestHistory.version : null,
    activePlanTitle: input.activePlan?.title || null,
    activePlanFocus: input.activePlan?.primaryFocus || null,
    dinacharyaAdherencePercent: adherencePercent,
    dinacharyaCompletedCount: completedCount,
    dinacharyaTotalCount: activities.length,
    pendingDinacharyaTitles: pendingTitles,
  };
}

/**
 * Formats a concise, non-diagnostic summary note that the seeker can optionally
 * include when opening ConsultationModal for a selected practitioner.
 */
export function buildConsultationNotesFromSummary(
  summary: CompanionConcernSummary | null | undefined
): string {
  if (!summary) return '';
  const parts: string[] = [`Concern: ${summary.primaryConcern}`];
  if (summary.durationNote) {
    parts.push(`Duration: ${summary.durationNote}`);
  }
  if (summary.routineImpact) {
    parts.push(`Daily routine impact: ${summary.routineImpact}`);
  }
  if (summary.suggestedConsultationType) {
    parts.push(`Suggested review: ${summary.suggestedConsultationType}`);
  }
  if (summary.keyObservations && summary.keyObservations.length > 0) {
    parts.push(`Observations: ${summary.keyObservations.slice(0, 3).join('; ')}`);
  }
  return parts.join('\n');
}
