import {
  ASSESSMENT_CATEGORIES,
  CategoryInfo,
  EXPANDED_ASSESSMENT_QUESTIONS,
} from '../data/assessmentQuestions';
import { AssessmentCategory, ExpandedAssessmentQuestion } from '../types/assessment';

export interface CategoryValidationSummary {
  categoryId: AssessmentCategory;
  categoryName: string;
  order: number;
  answeredCount: number;
  totalCount: number;
  unansweredCount: number;
  firstUnansweredIndex: number;
  firstUnansweredQuestionNumber: number;
}

export interface AssessmentValidationResult {
  isValid: boolean;
  answeredCount: number;
  totalQuestions: number;
  unansweredQuestions: ExpandedAssessmentQuestion[];
  unansweredQuestionIds: string[];
  unansweredQuestionNumbers: number[];
  firstUnansweredIndex: number;
  unansweredByCategory: CategoryValidationSummary[];
  message: string | null;
}

export interface CategoryNavigationResult {
  allowed: boolean;
  blockedByCategory?: CategoryValidationSummary;
  redirectIndex?: number;
  reason?: string;
}

export interface AssessmentModalResetState {
  answers: Record<string, string>;
  categoryNotes: Record<string, string>;
  currentQuestionIndex: number;
  isFinished: boolean;
  showSectionIntro: boolean;
  validationError: string | null;
  showValidationSummary: boolean;
}

/**
 * Counts how many canonical assessment questions currently have non-empty answers.
 */
export function countCanonicalAnsweredQuestions(
  answers: Record<string, string>,
  questions: ExpandedAssessmentQuestion[] = EXPANDED_ASSESSMENT_QUESTIONS
): number {
  return questions.filter((q) => Boolean(answers[q.id]?.trim())).length;
}

/**
 * Extracts only the canonical question answers from a record (ignoring legacy alias keys).
 */
export function extractCanonicalAnswers(
  answers: Record<string, string>,
  questions: ExpandedAssessmentQuestion[] = EXPANDED_ASSESSMENT_QUESTIONS
): Record<string, string> {
  const canonical: Record<string, string> = {};
  for (const q of questions) {
    if (answers[q.id]?.trim()) {
      canonical[q.id] = answers[q.id];
    }
  }
  return canonical;
}

/**
 * Validates that all 20 assessment questions have been answered before submission.
 */
export function validateAssessmentCompletion(
  answers: Record<string, string>,
  questions: ExpandedAssessmentQuestion[] = EXPANDED_ASSESSMENT_QUESTIONS,
  categories: CategoryInfo[] = ASSESSMENT_CATEGORIES
): AssessmentValidationResult {
  const unansweredQuestions: ExpandedAssessmentQuestion[] = [];
  const unansweredQuestionNumbers: number[] = [];
  let firstUnansweredIndex = -1;

  questions.forEach((q, idx) => {
    if (!answers[q.id]?.trim()) {
      unansweredQuestions.push(q);
      unansweredQuestionNumbers.push(idx + 1);
      if (firstUnansweredIndex === -1) {
        firstUnansweredIndex = idx;
      }
    }
  });

  const unansweredByCategory: CategoryValidationSummary[] = categories
    .map((cat) => {
      const catQuestions = questions.filter((q) => q.category === cat.id);
      const answeredCount = catQuestions.filter((q) => Boolean(answers[q.id]?.trim())).length;
      const firstUnansweredInCat = catQuestions.find((q) => !answers[q.id]?.trim());
      const firstIdx = firstUnansweredInCat
        ? questions.findIndex((q) => q.id === firstUnansweredInCat.id)
        : -1;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        order: cat.order,
        answeredCount,
        totalCount: catQuestions.length,
        unansweredCount: catQuestions.length - answeredCount,
        firstUnansweredIndex: firstIdx,
        firstUnansweredQuestionNumber: firstIdx === -1 ? -1 : firstIdx + 1,
      };
    })
    .filter((summary) => summary.unansweredCount > 0);

  const answeredCount = questions.length - unansweredQuestions.length;
  const isValid = unansweredQuestions.length === 0 && questions.length > 0;

  let message: string | null = null;
  if (!isValid) {
    const firstCat = unansweredByCategory[0];
    const previewNums = unansweredQuestionNumbers.slice(0, 6).map((n) => `#${n}`).join(', ');
    const moreSuffix =
      unansweredQuestionNumbers.length > 6
        ? ` (+${unansweredQuestionNumbers.length - 6} more)`
        : '';

    message = `Please answer all ${questions.length} questions before generating your Wellness Plan. ${unansweredQuestions.length} unanswered (${previewNums}${moreSuffix})${
      firstCat ? ` — starting in Dimension ${firstCat.order}: ${firstCat.categoryName}.` : '.'
    }`;
  }

  return {
    isValid,
    answeredCount,
    totalQuestions: questions.length,
    unansweredQuestions,
    unansweredQuestionIds: unansweredQuestions.map((q) => q.id),
    unansweredQuestionNumbers,
    firstUnansweredIndex,
    unansweredByCategory,
    message,
  };
}

/**
 * Ensures category tab navigation cannot bypass unanswered questions in earlier dimensions.
 * Users may freely revisit earlier or completed dimensions and advance sequentially once prior
 * dimensions are complete.
 */
export function canNavigateToCategory(
  targetCategoryId: AssessmentCategory,
  answers: Record<string, string>,
  questions: ExpandedAssessmentQuestion[] = EXPANDED_ASSESSMENT_QUESTIONS,
  categories: CategoryInfo[] = ASSESSMENT_CATEGORIES
): CategoryNavigationResult {
  const targetCat = categories.find((c) => c.id === targetCategoryId);
  if (!targetCat) {
    return { allowed: false, reason: 'Unknown assessment dimension.' };
  }

  const validation = validateAssessmentCompletion(answers, questions, categories);
  const earlierIncomplete = validation.unansweredByCategory.find(
    (catSummary) => catSummary.order < targetCat.order
  );

  if (earlierIncomplete) {
    return {
      allowed: false,
      blockedByCategory: earlierIncomplete,
      redirectIndex: earlierIncomplete.firstUnansweredIndex,
      reason: `Complete Dimension ${earlierIncomplete.order} (${earlierIncomplete.categoryName}) before skipping ahead to Dimension ${targetCat.order}. Question #${earlierIncomplete.firstUnansweredQuestionNumber} still needs an answer.`,
    };
  }

  const firstIdx = questions.findIndex((q) => q.category === targetCategoryId);
  return {
    allowed: true,
    redirectIndex: firstIdx >= 0 ? firstIdx : 0,
  };
}

/**
 * Produces a clean initial/reopened state for AssessmentModal, guaranteeing categoryNotes
 * and validation state are reset whenever the modal opens.
 */
export function createResetAssessmentModalState(
  initialAnswers: Record<string, string> = {}
): AssessmentModalResetState {
  return {
    answers: { ...(initialAnswers || {}) },
    categoryNotes: {},
    currentQuestionIndex: 0,
    isFinished: false,
    showSectionIntro: false,
    validationError: null,
    showValidationSummary: false,
  };
}
