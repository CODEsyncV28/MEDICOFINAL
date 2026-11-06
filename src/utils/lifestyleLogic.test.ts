import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateActivityAdherence,
  calculateAssessmentCompletion,
  filterByDiscipline,
  getGreetingByTime,
  getAdherenceStatus,
  calculateAssessmentSummary,
} from './lifestyleLogic';
import { DailyActivity } from '../types';

test('calculateActivityAdherence computes correct percentage', () => {
  const activities: DailyActivity[] = [
    {
      id: '1',
      title: 'Ushapan (Morning Water)',
      category: 'Ayurveda',
      discipline: 'Ayurveda',
      timeOfDay: 'Morning',
      durationMinutes: 5,
      completed: true,
      benefit: 'Stimulates digestive fire (Agni)',
    },
    {
      id: '2',
      title: 'Pranayama',
      category: 'Yoga',
      discipline: 'Yoga & Naturopathy',
      timeOfDay: 'Morning',
      durationMinutes: 15,
      completed: false,
      benefit: 'Calms sympathetic nervous system',
    },
  ];

  assert.equal(calculateActivityAdherence(activities), 50);
  assert.equal(calculateActivityAdherence([]), 0);

  activities[1].completed = true;
  assert.equal(calculateActivityAdherence(activities), 100);
});

test('calculateAssessmentCompletion calculates correct counts and completion state', () => {
  const result1 = calculateAssessmentCompletion({ q1: 'a', q2: 'b' }, 4);
  assert.equal(result1.percentage, 50);
  assert.equal(result1.answeredCount, 2);
  assert.equal(result1.isComplete, false);

  const result2 = calculateAssessmentCompletion({ q1: 'a', q2: 'b', q3: 'c', q4: 'd' }, 4);
  assert.equal(result2.percentage, 100);
  assert.equal(result2.isComplete, true);

  const resultZero = calculateAssessmentCompletion({}, 0);
  assert.equal(resultZero.percentage, 0);
});

test('filterByDiscipline filters correctly and returns all when All is passed', () => {
  const items = [
    { id: '1', discipline: 'Ayurveda', title: 'Dosha Guide' },
    { id: '2', discipline: 'Yoga & Naturopathy', title: 'Asana Flow' },
    { id: '3', discipline: 'Unani', title: 'Mizaj Assessment' },
  ];

  const ayurvedaOnly = filterByDiscipline(items, 'Ayurveda');
  assert.equal(ayurvedaOnly.length, 1);
  assert.equal(ayurvedaOnly[0].id, '1');

  const all = filterByDiscipline(items, 'All');
  assert.equal(all.length, 3);
});

test('getGreetingByTime returns traditional greetings based on hour', () => {
  assert.equal(getGreetingByTime(8), 'Subhodaya (Good Morning)');
  assert.equal(getGreetingByTime(14), 'Shubh Madhyahan (Good Afternoon)');
  assert.equal(getGreetingByTime(20), 'Shubh Sandhya (Good Evening)');
});

test('getAdherenceStatus outputs appropriate semantic labels', () => {
  assert.equal(getAdherenceStatus(85).label, 'Optimal Rhythm');
  assert.equal(getAdherenceStatus(60).label, 'Steady Progress');
  assert.equal(getAdherenceStatus(30).label, 'Gentle Focus Needed');
});

test('calculateAssessmentSummary derives educational non-diagnostic summary', () => {
  const summary1 = calculateAssessmentSummary({
    q1: 'energized',
    q2: 'robust',
    q3: 'active',
    q4: 'breathwork',
  });

  assert.equal(summary1.circadianBalanceCategory, 'Alert Sunrise Awakening (Pitta-Vata Alignment)');
  assert.equal(summary1.digestiveAgniCategory, 'Robust Digestive Fire (Teekshna Agni)');
  assert.equal(summary1.movementCategory, 'Active Daily Movement (Consistent Prana Flow)');
  assert.equal(summary1.stressCategory, 'Resilient Breath Awareness (Sattva Equilibrium)');
  assert.equal(summary1.constitutionTendency, 'Pitta-Predominant Vitality');
  assert.ok(summary1.guidanceNote.includes('Not a clinical diagnosis'));

  const summary2 = calculateAssessmentSummary({
    q1: 'heavy',
    q2: 'slow',
    q3: 'sedentary',
    q4: 'depleted',
  });
  assert.equal(summary2.circadianBalanceCategory, 'Sluggish Morning Tendency (Kapha Dominance)');
  assert.equal(summary2.digestiveAgniCategory, 'Gentle / Slow Metabolism (Manda Agni)');
  assert.equal(summary2.constitutionTendency, 'Kapha-Nourishing Rhythm');
});
