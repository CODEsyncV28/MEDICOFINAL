import { DailyActivity } from '../types';

/**
 * Calculates percentage of completed activities rounded to whole number.
 */
export function calculateActivityAdherence(activities: DailyActivity[]): number {
  if (!activities || activities.length === 0) return 0;
  const completed = activities.filter((a) => a.completed).length;
  return Math.round((completed / activities.length) * 100);
}

/**
 * Calculates assessment completion percentage and status.
 */
export function calculateAssessmentCompletion(
  answers: Record<string, string>,
  totalQuestions: number
): { percentage: number; answeredCount: number; isComplete: boolean } {
  if (totalQuestions <= 0) return { percentage: 0, answeredCount: 0, isComplete: false };
  const answeredCount = Object.keys(answers).filter((k) => !!answers[k]).length;
  const percentage = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));
  return {
    percentage,
    answeredCount,
    isComplete: answeredCount >= totalQuestions,
  };
}

/**
 * Filters items by AYUSH discipline or returns all if 'All' is selected.
 */
export function filterByDiscipline<T extends { discipline: string }>(
  items: T[],
  discipline: string | 'All'
): T[] {
  if (!discipline || discipline === 'All') return items;
  return items.filter((item) => item.discipline.toLowerCase() === discipline.toLowerCase());
}

/**
 * Returns contextual wellness greeting based on time of day.
 */
export function getGreetingByTime(hour: number = new Date().getHours()): string {
  if (hour >= 4 && hour < 12) {
    return 'Subhodaya (Good Morning)';
  } else if (hour >= 12 && hour < 17) {
    return 'Shubh Madhyahan (Good Afternoon)';
  } else {
    return 'Shubh Sandhya (Good Evening)';
  }
}

/**
 * Returns clean human status styling for adherence indicators.
 */
export function getAdherenceStatus(rate: number): {
  label: string;
  tone: 'high' | 'moderate' | 'needs-focus';
} {
  if (rate >= 80) {
    return { label: 'Optimal Rhythm', tone: 'high' };
  } else if (rate >= 50) {
    return { label: 'Steady Progress', tone: 'moderate' };
  }
  return { label: 'Gentle Focus Needed', tone: 'needs-focus' };
}

export interface AssessmentSummary {
  circadianBalanceCategory: string;
  digestiveAgniCategory: string;
  movementCategory: string;
  stressCategory: string;
  constitutionTendency: string;
  guidanceNote: string;
}

/**
 * Calculates educational, non-diagnostic lifestyle rhythm summary from assessment answers.
 */
export function calculateAssessmentSummary(rawAnswers: Record<string, string>): AssessmentSummary {
  const answers: Record<string, string> = {
    q1: rawAnswers.q1 || rawAnswers.circadian_waking_energy || 'gradual',
    q2: rawAnswers.q2 || rawAnswers.digestive_appetite_strength || 'slow',
    q3: rawAnswers.q3 || rawAnswers.movement_daily_type || 'active',
    q4: rawAnswers.q4 || rawAnswers.stress_decompression_method || 'breathwork',
    ...rawAnswers,
  };

  // q1: Circadian Rhythm
  let circadian = 'Gradual Awakening Rhythm (Kapha Morning Transition)';
  if (answers.q1 === 'energized') {
    circadian = 'Alert Sunrise Awakening (Pitta-Vata Alignment)';
  } else if (answers.q1 === 'heavy') {
    circadian = 'Sluggish Morning Tendency (Kapha Dominance)';
  }

  // q2: Digestive Fire (Agni)
  let agni = 'Moderate / Balanced Agni (Sama Agni)';
  if (answers.q2 === 'robust') {
    agni = 'Robust Digestive Fire (Teekshna Agni)';
  } else if (answers.q2 === 'erratic') {
    agni = 'Variable Digestive Fire (Vishama Agni)';
  } else if (answers.q2 === 'slow') {
    agni = 'Gentle / Slow Metabolism (Manda Agni)';
  }

  // q3: Movement
  let movement = 'Balanced Daily Movement';
  if (answers.q3 === 'active') {
    movement = 'Active Daily Movement (Consistent Prana Flow)';
  } else if (answers.q3 === 'irregular') {
    movement = 'Fluctuating Movement Rhythm';
  } else if (answers.q3 === 'sedentary') {
    movement = 'Sedentary Rhythm (Gentle Desk Stretches Recommended)';
  }

  // q4: Stress
  let stress = 'Mindful Breath Balance';
  if (answers.q4 === 'breathwork') {
    stress = 'Resilient Breath Awareness (Sattva Equilibrium)';
  } else if (answers.q4 === 'restless') {
    stress = 'Active Mind (Raja Dominance - Grounding Recommended)';
  } else if (answers.q4 === 'depleted') {
    stress = 'Low Energy (Tamas Tendency - Restorative Routine Recommended)';
  }

  // Overall constitutional tendency
  let constitution = 'Harmonized Baseline Rhythm';
  if (answers.q2 === 'robust' || answers.q1 === 'energized') {
    constitution = 'Pitta-Predominant Vitality';
  } else if (answers.q2 === 'erratic' || answers.q4 === 'restless') {
    constitution = 'Vata-Predominant Rhythm';
  } else if (answers.q1 === 'heavy' || answers.q2 === 'slow') {
    constitution = 'Kapha-Nourishing Rhythm';
  }

  const guidanceNote =
    'Educational lifestyle observation based on traditional AYUSH circadian principles. Not a clinical diagnosis or treatment prescription.';

  return {
    circadianBalanceCategory: circadian,
    digestiveAgniCategory: agni,
    movementCategory: movement,
    stressCategory: stress,
    constitutionTendency: constitution,
    guidanceNote,
  };
}
