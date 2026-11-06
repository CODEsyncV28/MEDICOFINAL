import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  submitAssessment,
  fetchAssessmentHistory,
  fetchLatestAssessment,
  fetchAssessmentByVersion,
} from '../services/assessmentService';
import {
  fetchLatestWellnessPlan,
  fetchWellnessPlanHistory,
} from '../services/wellnessPlanService';

describe('Modular Architecture: Multi-Version Assessment & Plan Generation', () => {
  const testUserId = `test_seeker_${Date.now()}`;

  test('Submitting Version 1 creates Version 1 assessment and generated plan', async () => {
    const v1Answers = {
      circadian_waking_time: 'early_dawn',
      circadian_waking_energy: 'energized',
      circadian_morning_sunlight: 'daily_outdoor',
      sleep_bedtime_regularity: 'before_1030',
      sleep_onset_duration: 'peaceful_quick',
      sleep_night_awakenings: 'unbroken',
      food_meal_regularity: 'fixed_predictable',
      food_lunch_weight: 'midday_lunch',
      food_freshness: 'fresh_home_cooked',
      digestive_appetite_strength: 'robust',
      digestive_elimination: 'spontaneous_daily',
      movement_daily_type: 'active',
      movement_postural_fatigue: 'supple_comfortable',
      stress_mental_pace: 'calm_focused',
      stress_decompression_method: 'breathwork',
      stress_evening_winddown: 'deliberate_pause',
      hydration_daily_intake: 'room_temp_sufficient',
      hydration_morning_water: 'warm_water_ushapan',
      screen_daily_hours: 'under_5_hours',
      screen_night_curfew: 'digital_sunset_curfew',
    };

    const notes = {
      circadian: 'Naturally wake up at 5:30 AM with dawn light.',
    };

    const { assessment, plan } = await submitAssessment(testUserId, v1Answers, notes);

    assert.strictEqual(assessment.version, 1, 'First assessment must be version 1');
    assert.strictEqual(assessment.userId, testUserId);
    assert.strictEqual(assessment.comparisonWithPrevious, null, 'First version has no previous comparison');
    assert.strictEqual(assessment.categoryNotes?.circadian, notes.circadian);

    // Plan checks
    assert.strictEqual(plan.version, 1, 'First plan must be version 1');
    assert.strictEqual(plan.userId, testUserId);
    assert.ok(plan.dailyRoutine.length >= 6, 'Plan must contain comprehensive daily routine schedule');
    assert.ok(plan.dailyRoutine.every((r) => typeof r.why === 'string' && r.why.length > 0), 'Every routine item must explain why');
    assert.ok(plan.morningHabits.length > 0, 'Plan must include morning habits');
    assert.ok(plan.eveningHabits.length > 0, 'Plan must include evening habits');
    assert.ok(plan.weeklyGoals.length >= 3, 'Plan must provide weekly goals');
  });

  test('Submitting Version 2 increments version, compares with Version 1, and retains past version without overwrite', async () => {
    // V2 answers introduce high screen hours and late bedtime
    const v2Answers = {
      circadian_waking_time: 'mid_morning',
      circadian_waking_energy: 'heavy',
      circadian_morning_sunlight: 'window_indoor',
      sleep_bedtime_regularity: 'late_after_midnight',
      sleep_onset_duration: 'racing_over_30',
      sleep_night_awakenings: 'restless_frequent',
      food_meal_regularity: 'somewhat_variable',
      food_lunch_weight: 'midday_lunch',
      food_freshness: 'fresh_home_cooked',
      digestive_appetite_strength: 'slow',
      digestive_elimination: 'requires_beverage',
      movement_daily_type: 'irregular',
      movement_postural_fatigue: 'mild_neck_shoulder',
      stress_mental_pace: 'multitasking_intense',
      stress_decompression_method: 'restless',
      stress_evening_winddown: 'work_until_sleep',
      hydration_daily_intake: 'room_temp_sufficient',
      hydration_morning_water: 'tea_coffee_first',
      screen_daily_hours: 'over_10_hours',
      screen_night_curfew: 'screen_in_bed',
    };

    const { assessment, plan } = await submitAssessment(testUserId, v2Answers);

    assert.strictEqual(assessment.version, 2, 'Second assessment must increment to version 2');
    assert.strictEqual(plan.version, 2, 'Second plan must increment to version 2');

    // Comparison diff checks
    assert.ok(assessment.comparisonWithPrevious, 'V2 must include comparisonWithPrevious object');
    const comp = assessment.comparisonWithPrevious;
    assert.strictEqual(comp.previousVersion, 1);
    assert.ok(comp.areasToFocus.length > 0, 'Identified lifestyle areas needing attention');

    // Verify non-overwrite invariant in history
    const history = await fetchAssessmentHistory(testUserId);
    assert.strictEqual(history.length, 2, 'History must contain both Version 2 and Version 1');
    assert.strictEqual(history[0].version, 2, 'First item must be latest (V2)');
    assert.strictEqual(history[1].version, 1, 'Second item must be previous (V1)');

    // Verify past plans preserved
    const planHistory = await fetchWellnessPlanHistory(testUserId);
    assert.strictEqual(planHistory.length, 2, 'Plan history must contain both Plan v2 and Plan v1');

    // Verify fetch by specific version
    const v1Record = await fetchAssessmentByVersion(testUserId, 1);
    assert.ok(v1Record !== null);
    assert.strictEqual(v1Record.version, 1);
    assert.strictEqual(v1Record.answers.circadian_waking_energy, 'energized');
  });

  test('Plans include non-diagnostic educational disclaimers and structured categories', async () => {
    const latestPlan = await fetchLatestWellnessPlan(testUserId);
    assert.ok(latestPlan !== null);
    assert.ok(latestPlan.educationalDisclaimer.includes('educational') || latestPlan.educationalDisclaimer.includes('diagnosis'));
    assert.ok(latestPlan.morningHabits.every((h) => h.instruction && h.why));
    assert.ok(latestPlan.eveningHabits.every((h) => h.instruction && h.why));
    assert.ok(latestPlan.sleepSuggestions.every((s) => s.guideline && s.why));
    assert.ok(latestPlan.foodAndNutrition.every((f) => f.timingWindow && f.why));
    assert.ok(latestPlan.physicalActivity.every((p) => p.guideline && p.why));
    assert.ok(latestPlan.stressAndBreathing.every((st) => st.guideline && st.why));
  });
});
