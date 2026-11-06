import { ExpandedAssessmentQuestion, AssessmentCategory } from '../types/assessment';

export interface CategoryInfo {
  id: AssessmentCategory;
  name: string;
  order: number;
  description: string;
  traditionalPillar: string;
}

export const ASSESSMENT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'circadian',
    name: 'Daily Routine & Circadian Rhythm',
    order: 1,
    description: 'Natural wake-up cycles, morning sunlight, and biological clock alignment.',
    traditionalPillar: 'Brahma Muhurta & Dinacharya',
  },
  {
    id: 'sleep',
    name: 'Sleep Quality & Schedule',
    order: 2,
    description: 'Bedtime consistency, ease of falling asleep, and uninterrupted night rest.',
    traditionalPillar: 'Nidra (Restorative Sleep)',
  },
  {
    id: 'food',
    name: 'Food Habits & Meal Timing',
    order: 3,
    description: 'Meal regularity, midday nourishment priority, and fresh food preparation.',
    traditionalPillar: 'Aahar (Mindful Nutrition)',
  },
  {
    id: 'digestive',
    name: 'Digestive Routine & Appetite',
    order: 4,
    description: 'Natural hunger predictability, metabolic fire, and morning elimination.',
    traditionalPillar: 'Jatharagni & Kostha',
  },
  {
    id: 'movement',
    name: 'Physical Activity & Movement',
    order: 5,
    description: 'Intentional daily mobility, posture resets, and circulation flow.',
    traditionalPillar: 'Vyayama & Sukshma Kriya',
  },
  {
    id: 'stress',
    name: 'Stress & Mental Wellbeing',
    order: 6,
    description: 'Mental pacing, breath awareness, emotional resilience, and calm wind-down.',
    traditionalPillar: 'Manas & Sattva Equilibrium',
  },
  {
    id: 'hydration',
    name: 'Hydration Habits',
    order: 7,
    description: 'Daily fluid intake, morning Ushapan ritual, and ambient water temperature.',
    traditionalPillar: 'Ushapan & Jala Tattva',
  },
  {
    id: 'screentime',
    name: 'Work, Study & Screen Habits',
    order: 8,
    description: 'Continuous screen exposure, eye rest, and pre-bedtime digital curfew.',
    traditionalPillar: 'Indriya Samyama & Trataka',
  },
];

export const EXPANDED_ASSESSMENT_QUESTIONS: ExpandedAssessmentQuestion[] = [
  // -------------------------------------------------------------------------
  // 1. Daily Routine & Circadian Rhythm
  // -------------------------------------------------------------------------
  {
    id: 'circadian_waking_time',
    category: 'circadian',
    categoryLabel: 'Daily Routine & Circadian Rhythm',
    categoryOrder: 1,
    question: 'What is your typical morning wake-up time window?',
    subtitle: 'Waking close to sunrise supports natural cortisol synchronization.',
    options: [
      {
        value: 'early_dawn',
        label: 'Early Dawn (Before 6:00 AM)',
        description: 'Wake spontaneously near sunrise (Brahma Muhurta alignment)',
        tendency: 'vata',
        qualityScore: 'optimal',
      },
      {
        value: 'morning_regular',
        label: 'Sunrise Window (6:00 AM – 7:30 AM)',
        description: 'Consistent morning waking aligned with daylight',
        tendency: 'pitta',
        qualityScore: 'optimal',
      },
      {
        value: 'mid_morning',
        label: 'Mid Morning (7:30 AM – 9:00 AM)',
        description: 'Awakening after sunrise, gradual transition',
        tendency: 'kapha',
        qualityScore: 'moderate',
      },
      {
        value: 'irregular_late',
        label: 'After 9:00 AM or Highly Irregular',
        description: 'Sleep schedule shifts frequently due to study or work',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'circadian_waking_energy', // Also serves as legacy q1
    category: 'circadian',
    categoryLabel: 'Daily Routine & Circadian Rhythm',
    categoryOrder: 1,
    question: 'How does your physical energy feel during the first 30 minutes after waking?',
    subtitle: 'Morning vitality reflects night metabolic clearance (Ama vs. Ojas).',
    options: [
      {
        value: 'energized',
        label: 'Alert & Energized',
        description: 'Clear mind, minimal grogginess, ready to start the day',
        tendency: 'pitta',
        qualityScore: 'optimal',
      },
      {
        value: 'gradual',
        label: 'Gradual / Variable',
        description: 'Requires 20–30 minutes of warm water and quiet to settle into focus',
        tendency: 'vata',
        qualityScore: 'moderate',
      },
      {
        value: 'heavy',
        label: 'Heavy & Sluggish',
        description: 'Lingering heaviness in limbs, desire to hit snooze multiple times',
        tendency: 'kapha',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'circadian_morning_sunlight',
    category: 'circadian',
    categoryLabel: 'Daily Routine & Circadian Rhythm',
    categoryOrder: 1,
    question: 'Do you receive natural outdoor daylight within an hour of waking?',
    subtitle: 'Morning photons set the master suprachiasmatic circadian clock.',
    options: [
      {
        value: 'daily_outdoor',
        label: 'Consistent Outdoor Sunlight (10–20 mins)',
        description: 'Step outdoors, balcony walk, or morning garden light',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'window_indoor',
        label: 'Indirect Daylight Through Windows',
        description: 'Bright indoor daylight but rare immediate outdoor exposure',
        tendency: 'balanced',
        qualityScore: 'moderate',
      },
      {
        value: 'rare_artificial',
        label: 'Artificial Light Only / Dim Morning Room',
        description: 'Stay in dim indoor lighting or immediately look at phone screens',
        tendency: 'kapha',
        qualityScore: 'needs_attention',
      },
    ],
    optionalNotePrompt: 'Any morning routine observations you would like to note?',
  },

  // -------------------------------------------------------------------------
  // 2. Sleep Quality & Sleep Schedule
  // -------------------------------------------------------------------------
  {
    id: 'sleep_bedtime_regularity',
    category: 'sleep',
    categoryLabel: 'Sleep Quality & Schedule',
    categoryOrder: 2,
    question: 'At what time do you usually turn off lights to sleep?',
    subtitle: 'Ayurveda identifies 10 PM to 2 AM as the key Pitta metabolic detox cycle.',
    options: [
      {
        value: 'before_1030',
        label: 'Early Rest (Before 10:30 PM)',
        description: 'Consistent early sleep honoring natural circadian twilight',
        tendency: 'kapha',
        qualityScore: 'optimal',
      },
      {
        value: '1030_to_midnight',
        label: 'Standard Midnight Window (10:30 PM – 12:00 AM)',
        description: 'Regular schedule within reasonable hours',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'late_after_midnight',
        label: 'Late Night (After 12:00 AM / Erratic)',
        description: 'Often stay awake studying, scrolling, or working past midnight',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'sleep_onset_duration',
    category: 'sleep',
    categoryLabel: 'Sleep Quality & Schedule',
    categoryOrder: 2,
    question: 'How long does it typically take you to fall asleep once in bed?',
    subtitle: 'Rapid peaceful onset indicates balanced Vata in the nervous system.',
    options: [
      {
        value: 'peaceful_quick',
        label: 'Under 15 Minutes Peacefully',
        description: 'Drift off smoothly without active rumination',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'moderate_15_30',
        label: '15 to 30 Minutes',
        description: 'Occasional thought reflection before sleep settles in',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'racing_over_30',
        label: 'Over 30 Minutes / Racing Thoughts',
        description: 'Busy mental chatter, restless turning, checking the clock',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'sleep_night_awakenings',
    category: 'sleep',
    categoryLabel: 'Sleep Quality & Schedule',
    categoryOrder: 2,
    question: 'How continuous is your sleep through the night?',
    subtitle: 'Waking between 2 AM and 4 AM often correlates with nocturnal Vata or liver heat.',
    options: [
      {
        value: 'unbroken',
        label: 'Deep & Unbroken Sleep',
        description: 'Sleep soundly until wake time with minimal stirring',
        tendency: 'kapha',
        qualityScore: 'optimal',
      },
      {
        value: 'single_brief',
        label: '1 Brief Awakening',
        description: 'Wake briefly for water or restroom, fall back asleep easily',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'restless_frequent',
        label: 'Frequent Awakenings or Alert at 3 AM',
        description: 'Light restless sleep, easily disturbed by slight noises or temperature',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
    optionalNotePrompt: 'Any sleep quality details or dreams you would like to mention?',
  },

  // -------------------------------------------------------------------------
  // 3. Food Habits & Meal Timing
  // -------------------------------------------------------------------------
  {
    id: 'food_meal_regularity',
    category: 'food',
    categoryLabel: 'Food Habits & Meal Timing',
    categoryOrder: 3,
    question: 'How consistent are the timing windows of your daily meals?',
    subtitle: 'Predictable meal rhythms stabilize digestive enzyme secretion.',
    options: [
      {
        value: 'fixed_predictable',
        label: 'Consistent Daily Times (Within 30 mins)',
        description: 'Eat meals at predictable hours every day',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'somewhat_variable',
        label: 'Somewhat Variable (Within 1–2 hours)',
        description: 'Varies moderately depending on workday demands',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'erratic_skipped',
        label: 'Erratic or Frequently Skip Meals',
        description: 'Eat at random times or skip meals when busy',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'food_lunch_weight',
    category: 'food',
    categoryLabel: 'Food Habits & Meal Timing',
    categoryOrder: 3,
    question: 'Which meal of the day is typically your most substantial and wholesome?',
    subtitle: 'Ayurveda recommends the heaviest meal at solar noon when Agni peaks.',
    options: [
      {
        value: 'midday_lunch',
        label: 'Midday Lunch (12:00 PM – 1:30 PM)',
        description: 'Main wholesome meal consumed when the sun is highest',
        tendency: 'pitta',
        qualityScore: 'optimal',
      },
      {
        value: 'heavy_dinner',
        label: 'Late Evening Dinner (After 8:30 PM)',
        description: 'Light day followed by large, rich evening dinner',
        tendency: 'kapha',
        qualityScore: 'needs_attention',
      },
      {
        value: 'even_distribution',
        label: 'Evenly Distributed Across 3 Meals',
        description: 'Balanced moderate portions throughout the day',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
    ],
  },
  {
    id: 'food_freshness',
    category: 'food',
    categoryLabel: 'Food Habits & Meal Timing',
    categoryOrder: 3,
    question: 'How are the majority of your daily meals prepared?',
    subtitle: 'Sattvic nutrition prioritizes freshly prepared, easily assimilated dishes.',
    options: [
      {
        value: 'fresh_home_cooked',
        label: 'Freshly Prepared Warm Home Meals',
        description: 'Cooked fresh daily with whole grains, vegetables, and gentle spices',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'batch_leftovers',
        label: 'Batch-Cooked Reheated Food (2–3 days old)',
        description: 'Cook once or twice a week and reheat meals from the fridge',
        tendency: 'kapha',
        qualityScore: 'moderate',
      },
      {
        value: 'takeout_packaged',
        label: 'Frequent Takeout, Packaged, or Frozen Food',
        description: 'Relies heavily on restaurant deliveries, snacks, or pre-packaged foods',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Digestive Routine & Appetite (Agni)
  // -------------------------------------------------------------------------
  {
    id: 'digestive_appetite_strength', // Legacy q2
    category: 'digestive',
    categoryLabel: 'Digestive Routine & Appetite',
    categoryOrder: 4,
    question: 'How would you describe your natural appetite and digestive hunger?',
    subtitle: 'Agni (digestive fire) determines energy assimilation and tissue vitality.',
    options: [
      {
        value: 'robust',
        label: 'Regular & Robust (Teekshna Agni)',
        description: 'Strong, clear hunger at regular meal times; digests food swiftly',
        tendency: 'pitta',
        qualityScore: 'optimal',
      },
      {
        value: 'erratic',
        label: 'Variable & Erratic (Vishama Agni)',
        description: 'Sometimes ravenously hungry, other times forget food without appetite',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
      {
        value: 'slow',
        label: 'Slow & Moderate (Manda Agni)',
        description: 'Appetite builds gradually; feel full for hours after a modest meal',
        tendency: 'kapha',
        qualityScore: 'moderate',
      },
    ],
  },
  {
    id: 'digestive_elimination',
    category: 'digestive',
    categoryLabel: 'Digestive Routine & Appetite',
    categoryOrder: 4,
    question: 'How regular is your natural bowel elimination upon waking?',
    subtitle: 'Spontaneous morning elimination clears overnight metabolic waste (Ama).',
    options: [
      {
        value: 'spontaneous_daily',
        label: 'Daily Spontaneous Morning Elimination',
        description: 'Effortless and complete within an hour of waking',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'requires_beverage',
        label: 'Requires Hot Beverage / Delayed',
        description: 'Only occurs after hot coffee, tea, or late in the afternoon',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'irregular_tendency',
        label: 'Irregular, Skips Days, or Sluggish',
        description: 'Fluctuating pattern, tendency toward hard or incomplete stools',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
    optionalNotePrompt: 'Any gentle digestive sensitivities you wish to share?',
  },

  // -------------------------------------------------------------------------
  // 5. Physical Activity & Movement
  // -------------------------------------------------------------------------
  {
    id: 'movement_daily_type', // Legacy q3
    category: 'movement',
    categoryLabel: 'Physical Activity & Movement',
    categoryOrder: 5,
    question: 'What best describes your current movement and exercise frequency?',
    subtitle: 'Daily moderate movement (Vyayama) stimulates lymphatic flow and joint lubrication.',
    options: [
      {
        value: 'active',
        label: 'Active & Consistent (5–7 days/week)',
        description: 'Daily intentional movement: Yoga asana, brisk walks, swimming, or cycling',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'irregular',
        label: 'Occasional / Weekend Activity (2–3 days/week)',
        description: 'Sedentary on busy workdays, active in bursts on weekends',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'sedentary',
        label: 'Predominantly Sedentary',
        description: 'Extended static sitting with minimal physical movement throughout the day',
        tendency: 'kapha',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'movement_postural_fatigue',
    category: 'movement',
    categoryLabel: 'Physical Activity & Movement',
    categoryOrder: 5,
    question: 'How does your spine, neck, and joints feel after working or studying?',
    subtitle: 'Postural stiffness reflects static Prana stagnation in subtle channels.',
    options: [
      {
        value: 'supple_comfortable',
        label: 'Supple & Comfortable',
        description: 'Minimal joint stiffness or muscular tension',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'mild_neck_shoulder',
        label: 'Mild Neck or Shoulder Tightness',
        description: 'Tight upper back or neck relieved with gentle stretching',
        tendency: 'vata',
        qualityScore: 'moderate',
      },
      {
        value: 'chronic_stiffness',
        label: 'Noticeable Stiffness or Lumbar Fatigue',
        description: 'Heavy aching in lower back, hips, or legs after desk hours',
        tendency: 'kapha',
        qualityScore: 'needs_attention',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Stress Management & Mental Wellbeing
  // -------------------------------------------------------------------------
  {
    id: 'stress_mental_pace',
    category: 'stress',
    categoryLabel: 'Stress & Mental Wellbeing',
    categoryOrder: 6,
    question: 'What is your predominant mental rhythm during high-workload periods?',
    subtitle: 'Mental constitution (Gunas: Sattva, Rajas, Tamas) shapes stress resilience.',
    options: [
      {
        value: 'calm_focused',
        label: 'Calm & Steady Focus (Sattva)',
        description: 'Prioritize calmly, address tasks one at a time with equanimity',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'multitasking_intense',
        label: 'Intense Drive & Multitasking (Rajas)',
        description: 'High pressure, quick execution, but prone to irritability or burnout',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'scattered_overwhelmed',
        label: 'Scattered Thoughts or Worry (Vata Rajas)',
        description: 'Racing mind, trouble deciding where to start, mental fatigue',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'stress_decompression_method', // Legacy q4
    category: 'stress',
    categoryLabel: 'Stress & Mental Wellbeing',
    categoryOrder: 6,
    question: 'How do you typically decompress when experiencing emotional or mental strain?',
    subtitle: 'Conscious relaxation resets parasympathetic vagal tone.',
    options: [
      {
        value: 'breathwork',
        label: 'Breathwork, Meditation, or Nature Walks',
        description: 'Use quiet breathing, mindful contemplation, or outdoor strolls',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'restless',
        label: 'Overthinking & Restless Distraction',
        description: 'Hard to switch off; jump between phone notifications and thoughts',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
      {
        value: 'depleted',
        label: 'Exhaustion & Passive Withdrawal',
        description: 'Feel drained; seek passive video bingeing or withdrawal into bed',
        tendency: 'kapha',
        qualityScore: 'moderate',
      },
    ],
  },
  {
    id: 'stress_evening_winddown',
    category: 'stress',
    categoryLabel: 'Stress & Mental Wellbeing',
    categoryOrder: 6,
    question: 'Do you maintain an intentional wind-down pause between work and sleep?',
    subtitle: 'Sandhya (twilight transition) prepares the mind for deep restorative rest.',
    options: [
      {
        value: 'deliberate_pause',
        label: 'Yes, 45–60 Mins of Calm Transition',
        description: 'Dim lights, herbal tea, reading, or quiet reflection before bed',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'brief_transition',
        label: 'Brief 15–20 Mins Transition',
        description: 'Short wash and quick transition to bed',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'work_until_sleep',
        label: 'Work or Study Right Up Until Sleep',
        description: 'Close laptop and immediately attempt to sleep with an active mind',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
    optionalNotePrompt: 'Any emotional stressors or workload challenges currently present?',
  },

  // -------------------------------------------------------------------------
  // 7. Hydration Habits
  // -------------------------------------------------------------------------
  {
    id: 'hydration_daily_intake',
    category: 'hydration',
    categoryLabel: 'Hydration Habits',
    categoryOrder: 7,
    question: 'What is your typical daily fluid intake pattern?',
    subtitle: 'Hydration temperature influences digestive Agni and tissue moisture.',
    options: [
      {
        value: 'room_temp_sufficient',
        label: '1.5 to 2.5 Litres (Warm / Room Temp)',
        description: 'Sip warm or room-temperature water steadily throughout the daytime',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'ice_cold_fluids',
        label: 'Mostly Chilled or Iced Water',
        description: 'Prefer iced beverages or refrigerated cold drinks with meals',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'insufficient_water',
        label: 'Under 1 Litre / Frequently Forget to Drink',
        description: 'Rarely feel thirsty; rely predominantly on coffee, chai, or sodas',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'hydration_morning_water',
    category: 'hydration',
    categoryLabel: 'Hydration Habits',
    categoryOrder: 7,
    question: 'What is the first beverage you drink after waking up in the morning?',
    subtitle: 'Classical Ushapan (warm water upon rising) stimulates natural peristalsis.',
    options: [
      {
        value: 'warm_water_ushapan',
        label: '1–2 Glasses of Warm or Copper-Vessel Water',
        description: 'Dedicated morning warm water ritual before consuming food',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'tea_coffee_first',
        label: 'Hot Chai, Coffee, or Stimulant First Thing',
        description: 'Need immediate caffeine to feel awake and kickstart bowel movement',
        tendency: 'pitta',
        qualityScore: 'needs_attention',
      },
      {
        value: 'nothing_until_breakfast',
        label: 'No Fluids Until Breakfast or Mid-Morning',
        description: 'Do not drink any water for the first 1–2 hours after waking',
        tendency: 'kapha',
        qualityScore: 'moderate',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Work, Study & Screen-Time Habits
  // -------------------------------------------------------------------------
  {
    id: 'screen_daily_hours',
    category: 'screentime',
    categoryLabel: 'Work, Study & Screen Habits',
    categoryOrder: 8,
    question: 'Approximately how many hours per day do you spend facing digital screens?',
    subtitle: 'Extended blue light exposure depletes Pitta eye moisture and agitates Vata.',
    options: [
      {
        value: 'under_5_hours',
        label: 'Under 5 Hours with Regular Breaks',
        description: 'Moderate screen use balanced with offline activities and outdoor breaks',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: '5_to_9_hours',
        label: '5 to 9 Hours with Occasional Eye Rest',
        description: 'Standard computer workday with moderate ocular fatigue by evening',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'over_10_hours',
        label: '10+ Hours with Minimal Rest Breaks',
        description: 'Continuous screen engagement across laptop, phone, and TV with eye strain',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
  },
  {
    id: 'screen_night_curfew',
    category: 'screentime',
    categoryLabel: 'Work, Study & Screen Habits',
    categoryOrder: 8,
    question: 'How do you manage handheld screen devices in the 45 minutes before sleep?',
    subtitle: 'High-frequency blue light suppresses pineal melatonin secretion.',
    options: [
      {
        value: 'digital_sunset_curfew',
        label: 'Complete Digital Sunset (No screens 45 mins prior)',
        description: 'Devices placed away; room kept dim for peaceful melatonin secretion',
        tendency: 'balanced',
        qualityScore: 'optimal',
      },
      {
        value: 'night_mode_filter',
        label: 'Night-Shift / Warm Color Filter On',
        description: 'Still check phone briefly, but with amber-tinted warm display',
        tendency: 'pitta',
        qualityScore: 'moderate',
      },
      {
        value: 'screen_in_bed',
        label: 'Active Phone / Video Streaming in Bed',
        description: 'Scroll social media, watch series, or chat until eyes fall shut',
        tendency: 'vata',
        qualityScore: 'needs_attention',
      },
    ],
    optionalNotePrompt: 'Any screen-time or desk ergonomic challenges you experience?',
  },
];
