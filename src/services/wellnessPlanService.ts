import {
  WellnessPlan,
  RoutineItem,
  HabitItem,
  SleepGuidelineItem,
  FoodNutritionItem,
  PhysicalActivityItem,
  StressBreathingItem,
  WeeklyGoalItem,
  AssessmentVersionRecord,
} from '../types/assessment';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

const LOCAL_PLANS_KEY = 'ayush_wellness_plans_store';
const memoryPlansStore = new Map<string, string>();

function getLocalPlans(): Record<string, WellnessPlan[]> {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(LOCAL_PLANS_KEY)
      : memoryPlansStore.get(LOCAL_PLANS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    const raw = memoryPlansStore.get(LOCAL_PLANS_KEY);
    return raw ? JSON.parse(raw) : {};
  }
}

function setLocalPlans(data: Record<string, WellnessPlan[]>): void {
  try {
    const val = JSON.stringify(data);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_PLANS_KEY, val);
    }
    memoryPlansStore.set(LOCAL_PLANS_KEY, val);
  } catch {
    memoryPlansStore.set(LOCAL_PLANS_KEY, JSON.stringify(data));
  }
}

/**
 * Transparent, rule-based wellness plan generator tailored to assessment answers.
 */
export function generateWellnessPlan(
  userId: string,
  assessmentRecord: AssessmentVersionRecord
): WellnessPlan {
  const { version, answers, analysis, completedAt, id: assessmentId } = assessmentRecord;
  const isVata = analysis.constitutionTendency.includes('Vata');
  const isPitta = analysis.constitutionTendency.includes('Pitta');
  const isKapha = analysis.constitutionTendency.includes('Kapha');

  // 1. Daily Routine Suggestions (with 'why')
  const dailyRoutine: RoutineItem[] = [
    {
      time: '06:00 AM – 06:30 AM',
      title: 'Brahma Muhurta Awakening & Sensory Awakening',
      action: 'Wake gently near sunrise. Cleanse oral cavity, scrape tongue gently, and rinse face with cool water.',
      why: 'Clears nocturnal bacterial stagnation from the tongue surface and stimulates vagal sensory tone.',
      category: 'Circadian',
    },
    {
      time: '06:30 AM – 07:00 AM',
      title: 'Ushapan Warm Hydration & Elimination',
      action: 'Drink 1–2 glasses of lukewarm water seated in silence. Avoid ice-cold drinks.',
      why: 'Warm water induces natural downward peristalsis (Apana Vayu) without shocking digestive Agni.',
      category: 'Hydration',
    },
    {
      time: '07:15 AM – 07:45 AM',
      title: isVata
        ? 'Grounding Asana & Joint Mobility'
        : isPitta
        ? 'Cooling Surya Namaskar & Breathwork'
        : 'Invigorating Sun Salutations & Brisk Walk',
      action: isVata
        ? 'Gentle seated joint rotations (Sukshma Vyayama) and slow warrior postures.'
        : isPitta
        ? 'Moderate rhythmic sun salutations paired with gentle Sheetali cooling exhalations.'
        : 'Active dynamic movements and brisk outdoor walking to dispel morning lethargy.',
      why: 'Rhythmic movement primes joint synovial fluid and balances the primary constitutional tendency.',
      category: 'Movement',
    },
    {
      time: '12:00 PM – 01:30 PM',
      title: 'Midday Main Meal (Jatharagni Peak)',
      action: 'Consume your most wholesome, freshly prepared meal seated in a calm, screen-free space.',
      why: 'Solar position peaks at midday, maximizing gastrointestinal digestive enzymes for effortless assimilation.',
      category: 'Nutrition',
    },
    {
      time: '05:30 PM – 06:00 PM',
      title: 'Twilight Sandhya Transition & Breath Reset',
      action: 'Practice 5–7 minutes of Nadi Shodhana (alternate nostril breathing) followed by herbal tea.',
      why: 'Transitions the autonomic nervous system from daytime sympathetic drive to evening parasympathetic calm.',
      category: 'Mental Balance',
    },
    {
      time: '09:30 PM – 10:30 PM',
      title: 'Digital Sunset & Sleep Preparation',
      action: 'Dim ambient lighting, cease electronic screens 45 minutes prior, and sip warm spiced milk or chamomile.',
      why: 'Absence of short-wavelength blue light triggers natural pineal melatonin secretion.',
      category: 'Sleep',
    },
  ];

  // 2. Morning Habits (with 'why')
  const morningHabits: HabitItem[] = [
    {
      title: 'Warm Ushapan Hydration',
      instruction: 'Sip 300–500ml of warm water immediately upon getting out of bed before reaching for caffeine.',
      why: 'Gently hydrates dried tissues from overnight respiration and stimulates natural morning bowel movement.',
    },
    {
      title: 'Natural Daylight Exposure',
      instruction: 'Step outside onto a balcony or garden for 10–15 minutes of direct morning sunlight within an hour of waking.',
      why: 'Photons striking retinal ganglion cells calibrate the circadian clock, improving daytime alertness and nighttime melatonin.',
    },
    {
      title: 'Sukshma Vyayama Joint Rotations',
      instruction: 'Spend 3 minutes rotating wrists, ankles, shoulders, and gentle neck rolls.',
      why: 'Reduces morning joint stiffness and stimulates lymph circulation before prolonged desk hours.',
    },
  ];

  // 3. Evening Habits (with 'why')
  const eveningHabits: HabitItem[] = [
    {
      title: 'Digital Sunset Curfew',
      instruction: 'Place smartphones and laptops outside the bedroom or in night mode at least 45 minutes before sleep.',
      why: 'Protects the natural circadian melatonin curve from artificial disruption and calms hyperactive cognitive chatter.',
    },
    {
      title: 'Calming Herbal Infusion',
      instruction: 'Sip a warm cup of Tulsi, Chamomile, or warm almond milk with a pinch of nutmeg and cardamom.',
      why: 'Traditional herbs provide gentle nervine grounding, easing the transition into restorative sleep.',
    },
    {
      title: 'Foot Massage (Pada Abhyanga) or Warm Water Soak',
      instruction: 'Massage warm sesame or coconut oil into the soles of the feet for 2 minutes before bed.',
      why: 'Draws excess mental heat downwards, pacifying Vata and promoting deep neuromuscular relaxation.',
    },
  ];

  // 4. Sleep Routine Suggestions (with 'why')
  const sleepSuggestions: SleepGuidelineItem[] = [
    {
      title: 'Consistent 10:30 PM Bedtime Anchor',
      guideline: 'Strive to be in bed with lights extinguished by 10:30 PM each night.',
      why: 'Honors the Pitta metabolic detox window (10 PM – 2 AM) during which internal cellular recovery peaks.',
    },
    {
      title: 'Cool, Ventilated & Dim Sleep Sanctuary',
      guideline: 'Ensure the bedroom is well-ventilated, pleasantly cool (18–21°C), and as completely dark as possible.',
      why: 'Core body temperature must drop slightly to initiate and sustain deep REM and slow-wave sleep stages.',
    },
  ];

  // 5. Food Timing & Nutrition Education (with 'why')
  const foodAndNutrition: FoodNutritionItem[] = [
    {
      timingWindow: 'Midday Solar Window (12:00 PM – 1:30 PM)',
      guideline: 'Make lunch your primary, nutrient-dense meal containing whole grains, lentils/proteins, and seasonal greens.',
      why: 'Digestive enzyme capacity is strongest when the sun is at its zenith.',
    },
    {
      timingWindow: 'Light Evening Dinner (Before 08:00 PM)',
      guideline: 'Keep dinner lighter, warm, and freshly cooked (e.g., soups, stewed vegetables, or khichdi) at least 2.5 hours before sleeping.',
      why: 'Prevents heavy undigested food (Ama) from lingering in the stomach during nocturnal recovery.',
    },
    {
      timingWindow: 'Mindful Eating Discipline',
      guideline: 'Eat seated in a calm environment without watching screens, working, or rushing through meals.',
      why: 'Parasympathetic digestive signaling requires mindful sensory engagement with the aroma, color, and chew of food.',
    },
  ];

  // 6. Physical Activity Suggestions (with 'why')
  const physicalActivity: PhysicalActivityItem[] = [
    {
      type: isKapha ? 'Dynamic Brisk Walking & Sun Salutations' : 'Gentle Hatha Yoga & Joint Mobility',
      frequency: 'Daily (20–30 minutes every morning)',
      guideline: 'Exercise to half of your maximum capacity (Ardha Shakti)—sweat lightly on the forehead without exhausting your breath.',
      why: 'Traditional texts advise against exhausting workouts; moderate rhythmic movement builds vitality without creating tissue inflammation.',
    },
    {
      type: 'Post-Lunch Shata-Pavali (100 Steps)',
      frequency: 'Daily after lunch',
      guideline: 'Take a gentle, slow 5-minute stroll (approx. 100 paces) immediately following lunch.',
      why: 'Aids downward digestive peristalsis and blunts post-prandial glycemic spikes.',
    },
  ];

  // 7. Stress Management & Breathing Practices (with 'why')
  const stressAndBreathing: StressBreathingItem[] = [
    {
      practice: 'Nadi Shodhana Pranayama (Alternate Nostril Breath)',
      duration: '5 to 7 minutes daily at twilight (Sandhya)',
      guideline: 'Sit comfortably with a straight spine. Close the right nostril, inhale left, switch and exhale right. Breathe smoothly without strain.',
      why: 'Balances left and right hemispheric autonomic activity, directly down-regulating sympathetic stress hormones.',
    },
    {
      practice: 'Bhramari Pranayama (Humming Bee Breath)',
      duration: '5 soothing rounds before bedtime',
      guideline: 'Gently close eyes, place index fingers over ear tragus, inhale deeply, and produce a low steady humming sound on exhalation.',
      why: 'The acoustic vibration stimulates endogenous nitric oxide production and calms overstimulated cerebral activity.',
    },
  ];

  // 8. Weekly Habit Goals (with 'why')
  const weeklyGoals: WeeklyGoalItem[] = [
    {
      id: `goal-1-v${version}`,
      goal: 'Drink warm water (Ushapan) first thing upon rising on at least 5 days.',
      targetDays: 5,
      why: 'Builds permanent morning digestive regularity and natural internal cleansing.',
    },
    {
      id: `goal-2-v${version}`,
      goal: 'Complete a 10-minute digital sunset before sleep on 5 consecutive evenings.',
      targetDays: 5,
      why: 'Directly improves sleep latency and morning wake-up freshness.',
    },
    {
      id: `goal-3-v${version}`,
      goal: 'Practice 5 minutes of Nadi Shodhana breathwork before dinner on 4 days.',
      targetDays: 4,
      why: 'Stabilizes daytime mental tension and transitions awareness into peaceful home relaxation.',
    },
  ];

  const planId = `plan_${userId}_v${version}`;
  const title = `Version ${version} Personal Dinacharya Plan (${analysis.constitutionTendency})`;
  const primaryFocus = isVata
    ? 'Grounding Rhythm & Restful Sleep'
    : isPitta
    ? 'Digestive Balance & Mental Equanimity'
    : isKapha
    ? 'Morning Invigoration & Metabolic Stimulus'
    : 'Circadian Equilibrium & Daily Vitality';

  const summary = `Tailored for Version ${version} assessment completed on ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(completedAt))}. Focuses on ${primaryFocus.toLowerCase()} based on your current circadian, digestive, movement, and stress responses.`;

  return {
    id: planId,
    userId,
    version,
    assessmentId,
    generatedAt: new Date().toISOString(),
    title,
    constitutionTendency: analysis.constitutionTendency,
    primaryFocus,
    summary,
    dailyRoutine,
    morningHabits,
    eveningHabits,
    sleepSuggestions,
    foodAndNutrition,
    physicalActivity,
    stressAndBreathing,
    weeklyGoals,
    educationalDisclaimer:
      'This personalized wellness plan is an educational self-care suggestion derived from traditional AYUSH circadian principles. It is non-diagnostic, non-prescriptive, and does not replace qualified medical diagnosis or individualized healthcare advice.',
  };
}

/**
 * Saves a generated wellness plan, preserving history across versions.
 */
export async function saveWellnessPlan(plan: WellnessPlan): Promise<void> {
  // 1. Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const planDocRef = doc(db, 'wellnessPlans', plan.id);
      await setDoc(planDocRef, plan, { merge: true });
    } catch (err) {
      console.warn('Could not persist wellness plan to Cloud Firestore:', err);
    }
  }

  // 2. Persistent Local Storage branch
  try {
    const store = getLocalPlans();
    const userPlans = store[plan.userId] || [];
    // Do not duplicate if same version exists, update instead; otherwise prepend
    const existingIdx = userPlans.findIndex((p) => p.id === plan.id || p.version === plan.version);
    if (existingIdx >= 0) {
      userPlans[existingIdx] = plan;
    } else {
      userPlans.unshift(plan);
    }
    // Sort descending by version
    userPlans.sort((a, b) => b.version - a.version);
    store[plan.userId] = userPlans;
    setLocalPlans(store);
  } catch (err) {
    console.warn('Error saving local wellness plan:', err);
  }
}

/**
 * Retrieves latest wellness plan for a user.
 */
export async function fetchLatestWellnessPlan(userId: string): Promise<WellnessPlan | null> {
  // 1. Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const plansRef = collection(db, 'wellnessPlans');
      const q = query(plansRef, where('userId', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const plans = snap.docs.map((d) => d.data() as WellnessPlan);
        plans.sort((a, b) => b.version - a.version);
        return plans[0];
      }
    } catch (err) {
      console.warn('Error fetching latest plan from Cloud Firestore:', err);
    }
  }

  // 2. Persistent Local Storage branch
  const store = getLocalPlans();
  const userPlans = store[userId] || [];
  return userPlans.length > 0 ? userPlans[0] : null;
}

/**
 * Retrieves the full chronological history of wellness plans for a user.
 */
export async function fetchWellnessPlanHistory(userId: string): Promise<WellnessPlan[]> {
  // 1. Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const plansRef = collection(db, 'wellnessPlans');
      const q = query(plansRef, where('userId', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const plans = snap.docs.map((d) => d.data() as WellnessPlan);
        plans.sort((a, b) => b.version - a.version);
        return plans;
      }
    } catch (err) {
      console.warn('Error fetching plan history from Cloud Firestore:', err);
    }
  }

  // 2. Persistent Local Storage branch
  const store = getLocalPlans();
  const userPlans = store[userId] || [];
  userPlans.sort((a, b) => b.version - a.version);
  return userPlans;
}
