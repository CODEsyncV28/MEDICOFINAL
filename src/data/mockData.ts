import {
  DailyActivity,
  WellnessProgram,
  EducationalArticle,
  Practitioner,
  ClientRecord,
  ContentApprovalItem,
  LifestyleAssessmentQuestion,
} from '../types';

export const ASSET_IMAGES = {
  hero: '/src/assets/images/ayush_hero_wellness_1793904214426.jpg',
  yoga: '/src/assets/images/ayush_yoga_meditation_1793904215454.jpg',
  ayurveda: '/src/assets/images/ayush_ayurveda_herbs_1793904215541.jpg',
  nutrition: '/src/assets/images/ayush_nutrition_aahar_1793904215127.jpg',
};

export const AYUSH_DISCIPLINES_INFO = [
  {
    name: 'Ayurveda',
    traditionalMeaning: 'Ayu (Life) + Veda (Knowledge)',
    slogan: 'Science of Longevity & Constitutional Equilibrium',
    coreFocus: 'Balancing the three biological doshas (Vata, Pitta, Kapha) through personalized daily regimen (Dinacharya), diet (Aahar), and gentle herbal nourishment.',
    keyConcept: 'Prakriti & Agni balance',
    modalities: ['Circadian Dinacharya', 'Ritucharya (Seasonal Routine)', 'Shad Rasa Nutrition', 'Herbal Decoctions (Kashayam)'],
    suitableFor: 'Individuals seeking deep circadian rhythm balance, sustainable digestion, and gentle herbal rejuvenation.',
  },
  {
    name: 'Yoga & Naturopathy',
    traditionalMeaning: 'Yuj (Union) + Nature Cure',
    slogan: 'Harmonizing Mind-Body Vitality & Self-Healing',
    coreFocus: 'Restoring neuromuscular alignment, respiratory rhythm (Pranayama), mental tranquility (Dhyana), and five-element (Panchamahabhutas) lifestyle therapies.',
    keyConcept: 'Asana, Pranayama, Hydrotherapy & Panchamahabhutas',
    modalities: ['Nadi Shodhana & Ujjayi Breath', 'Postural Asanas for Spine Mobility', 'Trataka (Visual Meditation)', 'Sun & Nature Immersion'],
    suitableFor: 'Working professionals navigating high mental stress, postural fatigue, and shallow breathing patterns.',
  },
  {
    name: 'Unani',
    traditionalMeaning: 'Greco-Arabic Holistic Medicine',
    slogan: 'Humoral Equilibrium & Innate Vital Power',
    coreFocus: 'Maintaining harmony among the four bodily humors (Dam, Balgham, Safra, Sauda) and supporting Quwwat-e-Mudabbira (the body’s innate restorative intelligence).',
    keyConcept: 'Mizaj (Temperament) & Asbab-e-Sittah Zarooriyyah',
    modalities: ['Asbab-e-Sittah (6 Essential Life Factors)', 'Mizaj Temperament Assessment', 'Regimental Therapy (Ilaj-bil-Tadbeer)', 'Herbal Infusions'],
    suitableFor: 'Those looking to understand environmental influences, air/water purity, and temperature-diet relationships.',
  },
  {
    name: 'Siddha',
    traditionalMeaning: 'Siddhi (Supreme Perfection & Health)',
    slogan: 'Ancient Dravidian Science of Vital Longevity',
    coreFocus: 'Balancing the three vital principles (Vali, Azhal, Iyyam) through herbal-mineral preparation, Varmam vital energy point regulation, and Kayakalpa rejuvenation.',
    keyConcept: 'Mukkuttram, Kayakalpa & Varmam',
    modalities: ['Kayakalpa Longevity Regimen', 'Muppini Vital Equilibrium', 'Varmam Bio-Energy Therapy', 'Purified Herbal Decoctions'],
    suitableFor: 'Individuals seeking structural vitality, joint flexibility, and specialized South Indian traditional rejuvenation.',
  },
  {
    name: 'Homeopathy',
    traditionalMeaning: 'Homoeos (Similar) + Pathos (Suffering)',
    slogan: 'Individualized Holistic Similars & Subtle Vital Force',
    coreFocus: 'Stimulating the innate vital force using individualized micro-doses guided by the principle of "Similia Similibus Curentur" (Like cures like).',
    keyConcept: 'Law of Similars, Individualization & Minimum Dose',
    modalities: ['Constitutional Inquiry', 'Psychosomatic Totality Analysis', 'Gentle Minimum Dosage', 'Emotional & Physical Synergy'],
    suitableFor: 'Individuals seeking subtle, gentle, and highly individualized support for recurring sensitivities and emotional stress.',
  },
];

export const PLATFORM_WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Lifestyle Assessment',
    category: 'Self-Observation',
    description: 'Complete a guided, non-diagnostic questionnaire assessing your sleep rhythm, natural digestive hunger (Agni), physical movement patterns, and stress resilience.',
    actionLabel: 'Explore Assessment',
  },
  {
    step: '02',
    title: 'Personalized Wellness Education',
    category: 'Curated Wisdom',
    description: 'Access peer-reviewed articles, circadian routine guides (Dinacharya), and seasonal transition principles (Ritucharya) crafted by certified AYUSH physicians.',
    actionLabel: 'Browse Library',
  },
  {
    step: '03',
    title: 'Daily Participation',
    category: 'Gentle Habits',
    description: 'Follow actionable, non-punitive daily wellness rituals—such as morning warm water (Ushapan), mindful breathwork (Pranayama), herbal infusions, and digital sunset.',
    actionLabel: 'View Checklist',
  },
  {
    step: '04',
    title: 'Progress Monitoring',
    category: 'Rhythm Consistency',
    description: 'Visualize your weekly habit consistency, adherence percentages, and observational milestones without shame or restrictive calorie-counting.',
    actionLabel: 'Track Progress',
  },
  {
    step: '05',
    title: 'Professional Connectivity',
    category: 'Verified Care',
    description: 'Connect directly with verified AYUSH doctors (BAMS, MD, BUMS, BHMS) registered with statutory medical councils for virtual consultations and regimen refinement.',
    actionLabel: 'Meet Practitioners',
  },
];


export const INITIAL_DAILY_ACTIVITIES: DailyActivity[] = [
  {
    id: 'act-1',
    title: 'Ushapan: Warm Water Ritual',
    category: 'Ayurveda',
    discipline: 'Ayurveda',
    timeOfDay: 'Morning',
    durationMinutes: 5,
    completed: true,
    benefit: 'Gently awakes peristalsis and primes the digestive fire (Jatharagni) before dawn.',
  },
  {
    id: 'act-2',
    title: 'Nadi Shodhana Pranayama',
    category: 'Yoga',
    discipline: 'Yoga & Naturopathy',
    timeOfDay: 'Morning',
    durationMinutes: 15,
    completed: true,
    benefit: 'Alternate nostril breathing stabilizes autonomic balance and mental clarity.',
  },
  {
    id: 'act-3',
    title: 'Sattvic Midday Mindful Nourishment',
    category: 'Nutrition',
    discipline: 'Ayurveda',
    timeOfDay: 'Afternoon',
    durationMinutes: 30,
    completed: false,
    benefit: 'Consuming the heaviest wholesome meal when the sun and metabolic fire peak.',
  },
  {
    id: 'act-4',
    title: 'Herbal Infusion: Tulsi & Licorice',
    category: 'Lifestyle Education',
    discipline: 'Ayurveda',
    timeOfDay: 'Afternoon',
    durationMinutes: 10,
    completed: false,
    benefit: 'Adaptogenic herbs supporting respiratory comfort and evening cortisol settling.',
  },
  {
    id: 'act-5',
    title: 'Trataka & Digital Curfew',
    category: 'Meditation',
    discipline: 'Yoga & Naturopathy',
    timeOfDay: 'Evening',
    durationMinutes: 20,
    completed: false,
    benefit: 'Gentle candle gaze or closed-eye visual resting to regulate circadian melatonin.',
  },
];

export const INITIAL_PROGRAMS: WellnessProgram[] = [
  {
    id: 'prog-1',
    title: 'Dinacharya: 21-Day Circadian Alignment',
    discipline: 'Ayurveda',
    category: 'Lifestyle Education',
    durationWeeks: 3,
    completedSessions: 14,
    totalSessions: 21,
    practitionerName: 'Dr. Ananya Sharma',
    practitionerTitle: 'BAMS, MD (Ayurveda), 12 yrs exp',
    description: 'A guided daily routine aligning waking times, tongue scraping, oil swishing, mindful eating windows, and twilight restoration.',
    nextSession: 'Module 15: Seasonally Harmonizing Sleep Hygiene',
    level: 'Beginner',
  },
  {
    id: 'prog-2',
    title: 'Pranayama & Nervous System Resilience',
    discipline: 'Yoga & Naturopathy',
    category: 'Yoga',
    durationWeeks: 4,
    completedSessions: 6,
    totalSessions: 16,
    practitionerName: 'Acharya Rajesh Verma',
    practitionerTitle: 'M.Sc Yoga Therapy, Naturopath',
    description: 'Progressive diaphragmatic, ujjayi, and brahmari breathwork series designed to reduce sympathetic overdrive and restore HRV.',
    nextSession: 'Session 7: Deep Kumbhaka & Breath Retention Foundations',
    level: 'Intermediate',
  },
  {
    id: 'prog-3',
    title: 'Aahar: Mindful Digestion & Seasonal Eating',
    discipline: 'Ayurveda',
    category: 'Nutrition',
    durationWeeks: 2,
    completedSessions: 8,
    totalSessions: 14,
    practitionerName: 'Dr. Meera Nambiar',
    practitionerTitle: 'BAMS, Ayurvedic Diet Specialist',
    description: 'Learn the six tastes (Shad Rasa), digestive fire cultivation, and seasonal pantry transitions without restrictive starvation.',
    nextSession: 'Module 9: Spicing for Individual Prakriti',
    level: 'Beginner',
  },
  {
    id: 'prog-4',
    title: 'Mizaj Balance: Unani Temperament Harmony',
    discipline: 'Unani',
    category: 'Lifestyle Education',
    durationWeeks: 3,
    completedSessions: 0,
    totalSessions: 12,
    practitionerName: 'Dr. Tariq Mansoor',
    practitionerTitle: 'BUMS, Unani Physician',
    description: 'Understanding bodily humors, ambient air quality, restful sleep, and wholesome hydration tailored to your natural temperament.',
    nextSession: 'Orientation: Exploring the 6 Essential Health Factors',
    level: 'Beginner',
  },
];

export const INITIAL_ARTICLES: EducationalArticle[] = [
  {
    id: 'art-1',
    title: 'Understanding Prakriti: Your Unique Constitutional Blueprint',
    discipline: 'Ayurveda',
    category: 'Ayurveda',
    readTime: '6 min read',
    author: 'Dr. Ananya Sharma',
    authorQualification: 'BAMS, MD Ayurveda',
    summary: 'Why Ayurvedic wellness rejects one-size-fits-all routines. Discover how Vata, Pitta, and Kapha tendencies shape your energy, digestion, and stress response.',
    fullContent: `Ayurveda perceives health not as a static state or universal checklist, but as an ever-evolving dynamic equilibrium known as Swastha. At birth, each individual is gifted with a distinct constitutional baseline known as Prakriti—a specific proportional combination of the three primary bio-energetic forces: Vata (Ether & Air), Pitta (Fire & Water), and Kapha (Water & Earth).

When lifestyle demands, ambient climate shifts, irregular sleep, or unsuitable foods perturb this baseline, the resulting state of imbalance is known as Vikriti. The core goal of lifestyle wellness in Ayurveda is simply to notice the earliest signs of Vikriti and gently apply the principle of opposites (Samanya Vishesha Siddhanta) to guide the physiology back toward equilibrium.

Key foundations of constitutional self-awareness:
1. Vata dominance brings creative agility, rapid comprehension, and light frames, but under stress manifests as dry skin, erratic appetite, and scattered sleep.
2. Pitta dominance provides decisive intellect, robust digestion, and natural warmth, but excess heat manifests as irritability, acid reflux, or inflammatory skin tendencies.
3. Kapha dominance bestows enduring stamina, grounded calm, and strong immunity, yet excessive stagnation can produce lethargy, slow metabolism, and heaviness.

Rather than adhering to rigid dogmas, mindful observation of your daily rhythm allows you to calibrate diet, movement, and sleep with ease.`,
    keyTakeaways: [
      'Prakriti is your constitutional baseline, while Vikriti represents temporary lifestyle imbalances.',
      'Opposites restore balance: warm foods pacify cold Vata; cooling hydration pacifies hot Pitta.',
      'Holistic living emphasizes intuitive daily calibration rather than punitive restriction.',
    ],
    reviewedDate: 'Updated Nov 2026',
  },
  {
    id: 'art-2',
    title: 'The Circadian Science of Brahma Muhurta and Morning Flow',
    discipline: 'Yoga & Naturopathy',
    category: 'Yoga',
    readTime: '5 min read',
    author: 'Acharya Rajesh Verma',
    authorQualification: 'M.Sc Yoga Therapy',
    summary: 'Exploring the traditional 96-minute window before sunrise and how ambient stillness supports neuro-respiratory calmness and habit permanence.',
    fullContent: `In classic yogic literature, the period approximately an hour and a half before dawn is revered as Brahma Muhurta—the "ambrosial hour". Long before modern chronobiology mapped circadian hormonal rhythms, traditional practitioners observed that the atmosphere during this time carries unique physical and mental qualities: lower ambient noise, higher atmospheric ozone, and a naturally peaceful state of consciousness.

Modern neuroscience now validates that upon waking in calm pre-dawn stillness, the brain transitions gently from delta and theta brainwave states into alpha frequencies. This allows contemplative practices like Pranayama and silent reflection to imprint without the cognitive friction and sensory overload of mid-day notifications.

How to gently introduce morning flow:
- Start with 15 minutes: Shift your wake time by just 15 minutes rather than an abrupt two-hour shock.
- Clear the senses: Gentle warm water face wash, eye rinse, and tongue scraping stimulate the vagus nerve.
- Breath before screen: Complete at least five minutes of conscious diaphragmatic breathing prior to viewing any handheld device.`,
    keyTakeaways: [
      'Pre-dawn hours possess minimal environmental sensory distraction, optimizing parasympathetic activation.',
      'Gentle sensory cleansing rituals prime vagal tone and clear nocturnal stagnation.',
      'Even a 10-minute digital-free morning breath ritual produces measurable improvements in daily cognitive focus.',
    ],
    reviewedDate: 'Reviewed Oct 2026',
  },
  {
    id: 'art-3',
    title: 'Sattvic Aahar: Cultivating Digestion without Dogma',
    discipline: 'Ayurveda',
    category: 'Nutrition',
    readTime: '7 min read',
    author: 'Dr. Meera Nambiar',
    authorQualification: 'BAMS, Ayurvedic Nutritionist',
    summary: 'A grounded guide to the qualities of Sattvic nourishment: freshly prepared, easily assimilated, naturally vibrant meals that nourish both body and mood.',
    fullContent: `In classical nutritional philosophy (Aahar Vijnana), food is categorized not merely by macronutrient tallies (calories, grams of protein or fats), but by its energetic imprint on the mind (Gunas: Sattva, Rajas, Tamas) and how completely it is converted into vital tissue fluid (Ojas).

Sattvic foods are defined as those that are freshly cooked, light, unctuous, agreeable to the senses, and easy for your digestive fire (Agni) to process without producing heavy metabolic sludge (Ama). Examples include seasonal fruits, soaked almonds, mung beans, ancient whole grains, fresh herbs, and warm herbal decoctions.

Practical guidelines for modern daily nourishment:
- Eat in a settled posture: Avoid eating while standing, driving, or scrolling through tense news feeds.
- The three-quarter stomach rule: Consume food until two-thirds full, leaving space for the natural churning mechanics of digestive enzymes.
- Spicing as a metabolic key: Culinary spices like cumin, ginger, coriander, and fennel are not just flavor enhancers; they kindle digestive enzymes without inflaming the gut lining.`,
    keyTakeaways: [
      'Food possesses psychological and metabolic qualities that influence mental tranquility and physical vitality.',
      'Warm, freshly cooked meals with gentle digestive spices reduce digestive strain.',
      'Mindful eating environments are as crucial to nutrient assimilation as the ingredients themselves.',
    ],
    reviewedDate: 'Reviewed Nov 2026',
  },
];

export const PRIMARY_PRACTITIONER: Practitioner = {
  id: 'prac-1',
  name: 'Dr. Ananya Sharma',
  qualification: 'BAMS, MD (Ayurveda), CCY (Yoga Certification)',
  discipline: 'Ayurveda',
  specialization: 'Lifestyle Disorders, Circadian Health & Digestive Wellness',
  experienceYears: 12,
  councilRegistration: 'Central Council of Indian Medicine (CCIM) / State Board Reg #AY-84920',
  activeClientsCount: 48,
  rating: 4.95,
  bio: 'Specializing in personalized preventative health through classical Dinacharya, pulse reflection, and lifestyle modifications for working professionals and families.',
  nextAvailableSlot: 'Tomorrow at 10:30 AM (Virtual Lifestyle Review)',
};

export const INITIAL_CLIENTS: ClientRecord[] = [
  {
    id: 'client-1',
    name: 'Priya Sundaram',
    age: 34,
    gender: 'Female',
    primaryGoal: 'Circadian Sleep Restoration & Evening Wind-down',
    enrolledProgram: 'Dinacharya: 21-Day Circadian Alignment',
    discipline: 'Ayurveda',
    adherenceRate: 92,
    assessmentCompleted: true,
    lastCheckIn: 'Today at 08:30 AM',
    practitionerNotes: 'Consistent with morning Ushapan and Nadi Shodhana. Reported deeper REM sleep in week 2.',
    status: 'On Track',
  },
  {
    id: 'client-2',
    name: 'Vikram Malhotra',
    age: 42,
    gender: 'Male',
    primaryGoal: 'Postural Spine Mobility & Stress Regulation',
    enrolledProgram: 'Pranayama & Nervous System Resilience',
    discipline: 'Yoga & Naturopathy',
    adherenceRate: 78,
    assessmentCompleted: true,
    lastCheckIn: 'Yesterday',
    practitionerNotes: 'Needs gentle reminder for midday posture reset. Recommended 10-minute chair yoga sequence.',
    status: 'Active',
  },
  {
    id: 'client-3',
    name: 'Farhan Qureshi',
    age: 29,
    gender: 'Male',
    primaryGoal: 'Metabolic Energy & Seasonal Meal Timing',
    enrolledProgram: 'Mizaj Balance: Unani Temperament Harmony',
    discipline: 'Unani',
    adherenceRate: 54,
    assessmentCompleted: false,
    lastCheckIn: '3 days ago',
    practitionerNotes: 'Assessment pending section 3. Sent follow-up guidance on gentle meal intervals.',
    status: 'Needs Review',
  },
  {
    id: 'client-4',
    name: 'Sunita Rao',
    age: 51,
    gender: 'Female',
    primaryGoal: 'Joint Comfort & Natural Herbal Teas',
    enrolledProgram: 'Dinacharya: 21-Day Circadian Alignment',
    discipline: 'Ayurveda',
    adherenceRate: 88,
    assessmentCompleted: true,
    lastCheckIn: 'Today at 07:15 AM',
    practitionerNotes: 'Responded well to warm ginger-turmeric morning brew. Ready for intermediate Pranayama module.',
    status: 'On Track',
  },
];

export const INITIAL_APPROVAL_ITEMS: ContentApprovalItem[] = [
  {
    id: 'appr-1',
    title: 'Guidance on Seasonal Herbal Teas for Autumn Transition (Sharad Ritucharya)',
    author: 'Dr. Ananya Sharma (BAMS)',
    discipline: 'Ayurveda',
    submittedDate: 'Nov 04, 2026',
    status: 'Pending Review',
    category: 'Lifestyle Education',
    reviewNotes: 'Clear educational tone with appropriate safety disclaimers regarding culinary vs medicinal dosages.',
  },
  {
    id: 'appr-2',
    title: 'Safe Spinal Mobilization Principles for Desk Workers',
    author: 'Acharya Rajesh Verma (M.Sc Yoga)',
    discipline: 'Yoga & Naturopathy',
    submittedDate: 'Nov 02, 2026',
    status: 'Approved',
    category: 'Yoga',
    reviewNotes: 'Verified alignment with Naturopathic posture safety standards.',
  },
  {
    id: 'appr-3',
    title: 'Foundations of Unani Mizaj (Temperament) Self-Observation',
    author: 'Dr. Tariq Mansoor (BUMS)',
    discipline: 'Unani',
    submittedDate: 'Oct 30, 2026',
    status: 'Approved',
    category: 'Lifestyle Education',
    reviewNotes: 'Non-diagnostic, focusing strictly on seasonal environment and hydration awareness.',
  },
];

export const ASSESSMENT_QUESTIONS: LifestyleAssessmentQuestion[] = [
  {
    id: 'q1',
    category: 'Circadian Rhythm & Sleep',
    question: 'How does your natural energy feel during the first 30 minutes after waking?',
    options: [
      { label: 'Alert & Energized', description: 'Wake spontaneously near sunrise with clear mental focus', value: 'energized' },
      { label: 'Gradual / Variable', description: 'Requires warm water and gentle movement before settling into focus', value: 'gradual' },
      { label: 'Heavy & Sluggish', description: 'Feel desire to snooze, lingering heaviness in limbs', value: 'heavy' },
    ],
  },
  {
    id: 'q2',
    category: 'Digestive Fire (Agni)',
    question: 'How predictable and comfortable is your appetite throughout the day?',
    options: [
      { label: 'Regular & Robust', description: 'Strong digestive hunger consistently around mid-day', value: 'robust' },
      { label: 'Variable & Erratic', description: 'Sometimes ravenous, sometimes forget meals entirely', value: 'erratic' },
      { label: 'Slow & Steady', description: 'Moderate appetite, digests slowly and comfortably', value: 'slow' },
    ],
  },
  {
    id: 'q3',
    category: 'Daily Movement & Posture',
    question: 'What describes your current physical activity and desk posture rhythm?',
    options: [
      { label: 'Active & Consistent', description: 'Daily intentional movement, yoga asana or brisk walks', value: 'active' },
      { label: 'Occasional / Irregular', description: 'Active on weekends, prolonged sedentary hours on weekdays', value: 'irregular' },
      { label: 'Predominantly Sedentary', description: 'High screen time with postural fatigue in neck or lower back', value: 'sedentary' },
    ],
  },
  {
    id: 'q4',
    category: 'Stress Resilience & Rest',
    question: 'How do you usually decompress when navigating busy work or emotional stress?',
    options: [
      { label: 'Breathwork & Nature', description: 'Conscious breathing, nature walks, or mindful pauses', value: 'breathwork' },
      { label: 'Overthinking & Restlessness', description: 'Mind stays busy, multiple browser tabs, trouble switching off', value: 'restless' },
      { label: 'Withdrawal & Fatigue', description: 'Feeling depleted, seeking passive screen time or comfort rest', value: 'depleted' },
    ],
  },
];
