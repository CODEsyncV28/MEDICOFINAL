export type AssessmentCategory =
  | 'circadian'
  | 'sleep'
  | 'food'
  | 'digestive'
  | 'movement'
  | 'stress'
  | 'hydration'
  | 'screentime';

export interface QuestionOption {
  value: string;
  label: string;
  description: string;
  // Qualitative indicators for rule-based analysis
  tendency?: 'vata' | 'pitta' | 'kapha' | 'balanced';
  qualityScore?: 'optimal' | 'moderate' | 'needs_attention';
}

export interface ExpandedAssessmentQuestion {
  id: string;
  category: AssessmentCategory;
  categoryLabel: string;
  categoryOrder: number;
  question: string;
  subtitle?: string;
  options: QuestionOption[];
  optionalNotePrompt?: string;
}

export interface AssessmentComparison {
  previousVersion: number;
  previousDate: string;
  improvements: string[];
  unchangedHabits: string[];
  areasToFocus: string[];
  summaryNote: string;
}

export interface AssessmentAnalysis {
  constitutionTendency: string;
  circadianRhythmCategory: string;
  digestiveAgniCategory: string;
  sleepArchitectureCategory: string;
  movementPranaCategory: string;
  stressMindCategory: string;
  hydrationBalanceCategory: string;
  digitalEnvironmentCategory: string;
  primaryImbalanceRisk: string;
  strengths: string[];
  guidanceNote: string;
}

export interface AssessmentVersionRecord {
  id: string; // e.g. assess_uid_v1
  userId: string;
  version: number; // 1, 2, 3...
  completedAt: string; // ISO date string
  answers: Record<string, string>;
  categoryNotes?: Record<string, string>;
  totalAnswered: number;
  totalQuestions: number;
  isComplete: boolean;
  analysis: AssessmentAnalysis;
  comparisonWithPrevious?: AssessmentComparison | null;
}

export interface RoutineItem {
  time: string;
  title: string;
  action: string;
  why: string;
  category: string;
}

export interface HabitItem {
  title: string;
  instruction: string;
  why: string;
}

export interface SleepGuidelineItem {
  title: string;
  guideline: string;
  why: string;
}

export interface FoodNutritionItem {
  timingWindow: string;
  guideline: string;
  why: string;
}

export interface PhysicalActivityItem {
  type: string;
  frequency: string;
  guideline: string;
  why: string;
}

export interface StressBreathingItem {
  practice: string;
  duration: string;
  guideline: string;
  why: string;
}

export interface WeeklyGoalItem {
  id: string;
  goal: string;
  targetDays: number;
  why: string;
}

export interface WellnessPlan {
  id: string; // e.g. plan_uid_v1
  userId: string;
  version: number;
  assessmentId: string;
  generatedAt: string;
  title: string;
  constitutionTendency: string;
  primaryFocus: string;
  summary: string;

  // Structured requirements from prompt
  dailyRoutine: RoutineItem[];
  morningHabits: HabitItem[];
  eveningHabits: HabitItem[];
  sleepSuggestions: SleepGuidelineItem[];
  foodAndNutrition: FoodNutritionItem[];
  physicalActivity: PhysicalActivityItem[];
  stressAndBreathing: StressBreathingItem[];
  weeklyGoals: WeeklyGoalItem[];

  educationalDisclaimer: string;
}
