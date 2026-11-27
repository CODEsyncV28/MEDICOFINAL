import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildConsultationNotesFromSummary,
  buildSanitizedCompanionContext,
  COMPANION_GREETING_MESSAGE,
  detectMinorOrGuardianContext,
  detectUrgentSymptomSignal,
  formatConsultationCharge,
  formatConsultationMode,
  matchVerifiedPractitioners,
  normalizeAYUSHDisciplines,
} from '../utils/companionLogic';
import { DailyActivity, Practitioner } from '../types';

const SAMPLE_PRACTITIONERS: Practitioner[] = [
  {
    id: 'prac-ayur-1',
    name: 'Dr. Kavitha Iyer',
    qualification: 'BAMS, MD (Ayurveda)',
    discipline: 'Ayurveda',
    specialization: 'Digestive Agni, Circadian Sleep & Lifestyle Alignment',
    experienceYears: 11,
    councilRegistration: 'CCIM-44120',
    activeClientsCount: 24,
    rating: 4.9,
    bio: 'Focuses on gut rhythm, restorative sleep routines, and seasonal Dinacharya.',
    nextAvailableSlot: 'Tomorrow at 11:00 AM',
    consultationFee: 600,
    consultationCurrency: 'INR',
    consultationFormat: 'both',
    location: 'Bengaluru',
    languages: ['English', 'Hindi', 'Kannada'],
  },
  {
    id: 'prac-yoga-1',
    name: 'Acharya Rohan Deshmukh',
    qualification: 'BNYS, M.Sc Yoga Therapy',
    discipline: 'Yoga & Naturopathy',
    specialization: 'Stress Resilience, Pranayama & Spine Mobility',
    experienceYears: 9,
    councilRegistration: 'INYG-9012',
    activeClientsCount: 19,
    rating: 4.8,
    bio: 'Guides breathwork, desk posture resets, and sleep wind-down routines.',
    nextAvailableSlot: 'Thu at 05:30 PM',
    consultationFee: 900,
    consultationCurrency: 'INR',
    consultationFormat: 'online',
    location: 'Pune',
    languages: ['English', 'Marathi', 'Hindi'],
  },
];

describe('AYUSH AI Wellness Companion Pure Logic Suite', () => {
  it('1. Builds minimal-PII consented context only when explicit consent is granted', () => {
    const activities: DailyActivity[] = [
      {
        id: 'act-1',
        title: 'Ushapan: Warm Water Ritual',
        category: 'Ayurveda',
        discipline: 'Ayurveda',
        timeOfDay: 'Morning',
        durationMinutes: 5,
        completed: true,
        benefit: 'Digestive priming',
      },
      {
        id: 'act-2',
        title: 'Evening Digital Curfew',
        category: 'Meditation',
        discipline: 'Yoga & Naturopathy',
        timeOfDay: 'Evening',
        durationMinutes: 20,
        completed: false,
        benefit: 'Sleep settling',
      },
    ];

    const denied = buildSanitizedCompanionContext({
      hasConsent: false,
      assessmentAnswers: {
        circadian_waking_energy: 'gradual',
        digestive_appetite_strength: 'erratic',
      },
      totalQuestions: 20,
      activities,
    });
    assert.strictEqual(denied, null, 'Must return null when consent is false');

    const granted = buildSanitizedCompanionContext({
      hasConsent: true,
      assessmentAnswers: {
        circadian_waking_energy: 'gradual',
        digestive_appetite_strength: 'erratic',
        movement_daily_type: 'sedentary',
        stress_decompression_method: 'restless',
      },
      totalQuestions: 20,
      activities,
    });

    assert.ok(granted);
    assert.strictEqual(granted.answeredCount, 4);
    assert.strictEqual(granted.assessmentCompleted, false);
    assert.strictEqual(granted.dinacharyaAdherencePercent, 50);
    assert.deepStrictEqual(granted.pendingDinacharyaTitles, ['Evening Digital Curfew']);
    assert.ok(granted.digestiveAgni.includes('Vishama'));
  });

  it('2. Detects urgent red-flag symptoms immediately without conversational delay', () => {
    const chestRes = detectUrgentSymptomSignal('I have crushing chest pain and shortness of breath');
    assert.strictEqual(chestRes.isUrgent, true);
    assert.strictEqual(chestRes.severity, 'emergency');
    assert.ok(chestRes.matchedSignals.length >= 2);
    assert.ok(chestRes.urgentGuidance.includes('immediate medical attention'));

    const crisisRes = detectUrgentSymptomSignal('I feel suicidal and want to hurt myself');
    assert.strictEqual(crisisRes.isUrgent, true);
    assert.ok(crisisRes.urgentGuidance.includes('14416'));

    const routineRes = detectUrgentSymptomSignal('I feel bloated after dinner and wake up tired');
    assert.strictEqual(routineRes.isUrgent, false);
    assert.strictEqual(routineRes.matchedSignals.length, 0);
  });

  it('3. Detects minor/guardian context cleanly', () => {
    assert.strictEqual(detectMinorOrGuardianContext('I am 15 years old and struggling with sleep'), true);
    assert.strictEqual(detectMinorOrGuardianContext('Asking for my child who has irregular appetite'), true);
    assert.strictEqual(detectMinorOrGuardianContext('I am 32 and work late on screens'), false);
  });

  it('4. Formats consultation charges honestly and never invents missing prices', () => {
    assert.strictEqual(formatConsultationCharge(600, 'INR'), '₹600');
    assert.strictEqual(formatConsultationCharge(null, 'INR'), 'Charges not listed');
    assert.strictEqual(formatConsultationCharge(undefined, undefined), 'Charges not listed');
    assert.strictEqual(formatConsultationMode('both'), 'Online & In-Person');
    assert.strictEqual(formatConsultationMode(null), 'Consultation format not listed');
  });

  it('5. Deterministically ranks verified practitioners and enforces live-mode prac-1 exclusion and honest empty states', () => {
    const matchRes = matchVerifiedPractitioners({
      practitioners: SAMPLE_PRACTITIONERS,
      criteria: {
        preferredDisciplines: ['Ayurveda'],
        focusKeywords: ['digestive', 'sleep'],
        consultationFormat: 'online',
        maxBudget: 700,
        preferredLanguage: 'Hindi',
      },
      isLiveFirebaseMode: true,
    });

    assert.strictEqual(matchRes.emptyReason, null);
    assert.strictEqual(matchRes.matches.length, 1);
    assert.strictEqual(matchRes.matches[0].practitioner.id, 'prac-ayur-1');
    assert.ok(matchRes.matches[0].matchReasons.some((r) => r.includes('Ayurveda')));

    const liveWithOnlyDemo = matchVerifiedPractitioners({
      practitioners: [{ ...SAMPLE_PRACTITIONERS[0], id: 'prac-1' }],
      isLiveFirebaseMode: true,
    });
    assert.strictEqual(liveWithOnlyDemo.matches.length, 0);
    assert.ok(liveWithOnlyDemo.emptyReason);
  });

  it('6. Normalizes AYUSH discipline spellings and builds clean consultation notes from summary', () => {
    assert.deepStrictEqual(
      normalizeAYUSHDisciplines(['Ayurveda', 'Homoeopathy', 'Yoga', 'Unknown']),
      ['Ayurveda', 'Homeopathy', 'Yoga & Naturopathy']
    );

    const notes = buildConsultationNotesFromSummary({
      primaryConcern: 'Irregular sleep and post-meal heaviness',
      durationNote: '3 weeks',
      routineImpact: 'Afternoon fatigue at work',
      suggestedConsultationType: 'Ayurveda lifestyle consultation',
      keyObservations: ['Late dinner after 9 PM', 'Variable appetite'],
    });
    assert.ok(notes.includes('Irregular sleep'));
    assert.ok(notes.includes('3 weeks'));
    assert.ok(COMPANION_GREETING_MESSAGE.includes('AYUSH Wellness Companion'));
  });
});
