import {
  AssessmentAnalysis,
  AssessmentComparison,
  AssessmentVersionRecord,
} from '../types/assessment';
import { EXPANDED_ASSESSMENT_QUESTIONS } from '../data/assessmentQuestions';

/**
 * Normalizes question answers so both expanded IDs and legacy q1..q4 keys are supported.
 */
function normalizeAnswers(rawAnswers: Record<string, string>): Record<string, string> {
  const norm: Record<string, string> = { ...rawAnswers };

  // Map legacy keys if present and new keys missing
  if (rawAnswers.q1 && !norm.circadian_waking_energy) {
    norm.circadian_waking_energy = rawAnswers.q1;
  }
  if (rawAnswers.q2 && !norm.digestive_appetite_strength) {
    norm.digestive_appetite_strength = rawAnswers.q2;
  }
  if (rawAnswers.q3 && !norm.movement_daily_type) {
    norm.movement_daily_type = rawAnswers.q3;
  }
  if (rawAnswers.q4 && !norm.stress_decompression_method) {
    norm.stress_decompression_method = rawAnswers.q4;
  }

  return norm;
}

/**
 * Transparent, rule-based lifestyle analysis across the 8 lifestyle categories.
 */
export function analyzeAssessmentAnswers(rawAnswers: Record<string, string>): AssessmentAnalysis {
  const answers = normalizeAnswers(rawAnswers);

  let vataPoints = 0;
  let pittaPoints = 0;
  let kaphaPoints = 0;
  const strengths: string[] = [];

  // 1. Circadian Analysis
  let circadianRhythm = 'Consistent Morning Awakening';
  if (answers.circadian_waking_energy === 'energized' || answers.circadian_waking_time === 'early_dawn') {
    circadianRhythm = 'Alert Sunrise Awakening (Brahma Muhurta Alignment)';
    pittaPoints += 2;
    strengths.push('Natural early-waking circadian alignment with sunrise.');
  } else if (answers.circadian_waking_energy === 'heavy' || answers.circadian_waking_time === 'mid_morning') {
    circadianRhythm = 'Sluggish Morning Tendency (Kapha Morning Heaviness)';
    kaphaPoints += 2;
  } else if (answers.circadian_waking_time === 'irregular_late') {
    circadianRhythm = 'Fluctuating Circadian Cycle (Vata Irregularity)';
    vataPoints += 2;
  }

  if (answers.circadian_morning_sunlight === 'daily_outdoor') {
    strengths.push('Early daylight exposure anchors healthy melatonin suppression.');
  }

  // 2. Sleep Analysis
  let sleepArch = 'Restorative Night Sleep';
  if (answers.sleep_bedtime_regularity === 'late_after_midnight' || answers.sleep_onset_duration === 'racing_over_30') {
    sleepArch = 'Delayed Sleep Phase & Active Mind (Vata Night Agitation)';
    vataPoints += 2;
  } else if (answers.sleep_night_awakenings === 'restless_frequent') {
    sleepArch = 'Fragmented Nocturnal Sleep (Light Restlessness)';
    vataPoints += 1;
  } else if (answers.sleep_bedtime_regularity === 'before_1030' && answers.sleep_onset_duration === 'peaceful_quick') {
    sleepArch = 'Synchronized Deep Sleep Architecture';
    kaphaPoints += 1;
    strengths.push('Consistent early sleep before 10:30 PM optimizes nightly cellular repair.');
  }

  // 3. Food Timing & Habits
  if (answers.food_lunch_weight === 'midday_lunch') {
    pittaPoints += 1;
    strengths.push('Main midday meal aligns with the peak of solar digestive power.');
  } else if (answers.food_lunch_weight === 'heavy_dinner') {
    kaphaPoints += 2;
  }

  if (answers.food_meal_regularity === 'erratic_skipped') {
    vataPoints += 2;
  } else if (answers.food_meal_regularity === 'fixed_predictable') {
    strengths.push('Fixed daily eating schedule maintains stable gastric enzyme readiness.');
  }

  // 4. Digestive Agni
  let digestiveAgni = 'Moderate / Balanced Agni (Sama Agni)';
  if (answers.digestive_appetite_strength === 'robust') {
    digestiveAgni = 'Robust Digestive Fire (Teekshna Agni)';
    pittaPoints += 2;
    strengths.push('Robust metabolic fire capable of efficient nutrient assimilation.');
  } else if (answers.digestive_appetite_strength === 'erratic') {
    digestiveAgni = 'Variable Digestive Fire (Vishama Agni)';
    vataPoints += 2;
  } else if (answers.digestive_appetite_strength === 'slow') {
    digestiveAgni = 'Gentle / Slow Metabolism (Manda Agni)';
    kaphaPoints += 2;
  }

  if (answers.digestive_elimination === 'spontaneous_daily') {
    strengths.push('Spontaneous morning elimination indicates healthy overnight metabolic waste clearance.');
  }

  // 5. Movement & Prana Flow
  let movementPrana = 'Balanced Daily Movement';
  if (answers.movement_daily_type === 'active') {
    movementPrana = 'Active Daily Movement (Consistent Prana Flow)';
    strengths.push('Daily intentional movement maintains joint synovial lubrication and lymph circulation.');
  } else if (answers.movement_daily_type === 'sedentary') {
    movementPrana = 'Sedentary Rhythm (Gentle Desk Mobility Recommended)';
    kaphaPoints += 2;
  } else if (answers.movement_daily_type === 'irregular') {
    movementPrana = 'Fluctuating Movement Rhythm';
    vataPoints += 1;
  }

  // 6. Stress Resilience
  let stressMind = 'Mindful Breath Balance';
  if (answers.stress_decompression_method === 'breathwork' || answers.stress_mental_pace === 'calm_focused') {
    stressMind = 'Resilient Breath Awareness (Sattva Equilibrium)';
    strengths.push('Mindful breathwork practices provide strong autonomic nervous system buffering.');
  } else if (answers.stress_decompression_method === 'restless' || answers.stress_mental_pace === 'scattered_overwhelmed') {
    stressMind = 'Active Mind (Raja Dominance - Grounding Recommended)';
    vataPoints += 2;
  } else if (answers.stress_decompression_method === 'depleted') {
    stressMind = 'Fatigue Vulnerability (Tamas Tendency - Restorative Routine Recommended)';
    kaphaPoints += 1;
  }

  // 7. Hydration
  let hydrationBalance = 'Balanced Daytime Hydration';
  if (answers.hydration_morning_water === 'warm_water_ushapan') {
    strengths.push('Morning Ushapan warm water gently activates gastrocolic peristalsis.');
  } else if (answers.hydration_morning_water === 'tea_coffee_first') {
    pittaPoints += 1;
  } else if (answers.hydration_daily_intake === 'insufficient_water') {
    vataPoints += 1;
    hydrationBalance = 'Sub-optimal Fluid Intake (Dryness Risk)';
  }

  // 8. Digital Screen Environment
  let digitalEnvironment = 'Mindful Screen Hygiene';
  if (answers.screen_night_curfew === 'digital_sunset_curfew') {
    strengths.push('Evening digital sunset protects retinal receptors and nighttime melatonin synthesis.');
  } else if (answers.screen_night_curfew === 'screen_in_bed') {
    digitalEnvironment = 'Pre-Sleep Screen Exposure (Melatonin Delay Risk)';
    vataPoints += 1;
  }

  // Overall constitutional tendency calculation
  let constitution = 'Harmonized Baseline Rhythm';
  let primaryImbalanceRisk = 'General lifestyle regularity recommended';

  if (pittaPoints > vataPoints && pittaPoints > kaphaPoints) {
    constitution = 'Pitta-Predominant Vitality';
    primaryImbalanceRisk = 'Excess internal heat, digestive intensity, or perfectionist stress pacing.';
  } else if (vataPoints >= pittaPoints && vataPoints > kaphaPoints) {
    constitution = 'Vata-Predominant Rhythm';
    primaryImbalanceRisk = 'Dryness, irregular appetite/sleep timings, and restless cognitive fatigue.';
  } else if (kaphaPoints > vataPoints && kaphaPoints >= pittaPoints) {
    constitution = 'Kapha-Nourishing Rhythm';
    primaryImbalanceRisk = 'Morning heaviness, sluggish digestion, and sedentary fluid retention.';
  }

  return {
    constitutionTendency: constitution,
    circadianRhythmCategory: circadianRhythm,
    digestiveAgniCategory: digestiveAgni,
    sleepArchitectureCategory: sleepArch,
    movementPranaCategory: movementPrana,
    stressMindCategory: stressMind,
    hydrationBalanceCategory: hydrationBalance,
    digitalEnvironmentCategory: digitalEnvironment,
    primaryImbalanceRisk,
    strengths: strengths.length > 0 ? strengths : ['Openness to systematic lifestyle self-observation.'],
    guidanceNote:
      'Educational lifestyle analysis derived from classical AYUSH circadian and constitutional principles. Not a clinical diagnosis or pharmaceutical prescription.',
  };
}

/**
 * Compares latest assessment responses against the previous version to identify:
 * 1. Improvements
 * 2. Unchanged habits
 * 3. Areas to work on
 */
export function compareAssessments(
  latestRecord: AssessmentVersionRecord,
  previousRecord: AssessmentVersionRecord | null
): AssessmentComparison | null {
  if (!previousRecord) return null;

  const prevAnswers = normalizeAnswers(previousRecord.answers);
  const currAnswers = normalizeAnswers(latestRecord.answers);

  const improvements: string[] = [];
  const unchangedHabits: string[] = [];
  const areasToFocus: string[] = [];

  // Question lookup for friendly labels
  const questionMap = new Map(EXPANDED_ASSESSMENT_QUESTIONS.map((q) => [q.id, q]));

  for (const q of EXPANDED_ASSESSMENT_QUESTIONS) {
    const prevVal = prevAnswers[q.id];
    const currVal = currAnswers[q.id];

    if (!prevVal || !currVal) continue;

    const prevOpt = q.options.find((o) => o.value === prevVal);
    const currOpt = q.options.find((o) => o.value === currVal);

    if (!prevOpt || !currOpt) continue;

    const prevQuality = prevOpt.qualityScore || 'moderate';
    const currQuality = currOpt.qualityScore || 'moderate';

    if (prevQuality === 'needs_attention' && (currQuality === 'optimal' || currQuality === 'moderate')) {
      improvements.push(
        `${q.categoryLabel}: Shifted from "${prevOpt.label}" to healthier rhythm "${currOpt.label}".`
      );
    } else if (prevQuality === 'moderate' && currQuality === 'optimal') {
      improvements.push(
        `${q.categoryLabel}: Upgraded to optimal habit "${currOpt.label}".`
      );
    } else if (currQuality === 'needs_attention' && prevQuality === 'needs_attention') {
      areasToFocus.push(
        `${q.categoryLabel}: Habit "${currOpt.label}" remains unchanged; gentle refinement recommended.`
      );
    } else if (currQuality === 'needs_attention' && (prevQuality === 'optimal' || prevQuality === 'moderate')) {
      areasToFocus.push(
        `${q.categoryLabel}: Recently slipped into "${currOpt.label}"; consider re-anchoring routines.`
      );
    } else if (prevVal === currVal) {
      if (currQuality === 'optimal') {
        unchangedHabits.push(`${q.categoryLabel}: Maintained optimal consistency in "${currOpt.label}".`);
      } else {
        unchangedHabits.push(`${q.categoryLabel}: Consistent pattern in "${currOpt.label}".`);
      }
    }
  }

  // Fallbacks if lists are sparse
  if (improvements.length === 0 && areasToFocus.length === 0) {
    unchangedHabits.push('Overall daily rhythm maintained consistency across assessment periods.');
  }

  const summaryNote =
    improvements.length > 0
      ? `Positive progress noted across ${improvements.length} habit area(s) compared to Version ${previousRecord.version}.`
      : `Routines are largely steady since Version ${previousRecord.version}. Focus on subtle daily micro-adjustments.`;

  return {
    previousVersion: previousRecord.version,
    previousDate: previousRecord.completedAt,
    improvements,
    unchangedHabits,
    areasToFocus,
    summaryNote,
  };
}
