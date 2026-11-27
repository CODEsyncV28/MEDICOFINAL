import type { AYUSHDiscipline, Practitioner } from '../types/index.ts';
import type { CompanionMatchingCriteria } from '../types/firebase.ts';

export interface UrgentSymptomResult {
  isUrgent: boolean;
  severity: 'emergency' | 'urgent' | null;
  matchedSignals: string[];
  urgentGuidance: string;
}

const URGENT_SYMPTOM_PATTERNS: Array<{
  label: string;
  regex: RegExp;
  severity: 'emergency' | 'urgent';
}> = [
  {
    label: 'Chest pain or pressure',
    regex:
      /\b(chest pain|chest tightness|chest pressure|pain radiating to (my )?(arm|jaw|left shoulder)|crushing chest)\b/i,
    severity: 'emergency',
  },
  {
    label: 'Breathing difficulty',
    regex:
      /\b(difficulty breathing|trouble breathing|can'?t breathe|cannot breathe|shortness of breath|gasping for air|severe wheezing)\b/i,
    severity: 'emergency',
  },
  {
    label: 'Fainting or neurological warning signs',
    regex:
      /\b(fainted|fainting|loss of consciousness|passed out|seizure|convulsion|slurred speech|face drooping|sudden numbness|sudden weakness on one side)\b/i,
    severity: 'emergency',
  },
  {
    label: 'Severe bleeding or throat swelling',
    regex:
      /\b(severe bleeding|coughing up blood|vomiting blood|throat swelling|tongue swelling|anaphylaxis)\b/i,
    severity: 'emergency',
  },
  {
    label: 'Emotional crisis or self-harm risk',
    regex: /\b(suicidal|suicide|kill myself|end my life|self[- ]harm|hurt myself)\b/i,
    severity: 'emergency',
  },
  {
    label: 'High fever or acute severe pain',
    regex:
      /\b(high fever|fever over 10[345]|unbearable pain|severe abdominal pain|worst headache of my life|sudden severe headache)\b/i,
    severity: 'urgent',
  },
];

/**
 * Deterministic red-flag symptom pre-screening so urgent symptoms trigger immediate
 * medical escalation without delaying for multi-turn chatbot triage.
 */
export function detectUrgentSymptomSignal(text: string): UrgentSymptomResult {
  const normalized = (text || '').trim();
  if (!normalized) {
    return {
      isUrgent: false,
      severity: null,
      matchedSignals: [],
      urgentGuidance: '',
    };
  }

  const matchedSignals: string[] = [];
  let highestSeverity: 'emergency' | 'urgent' | null = null;

  for (const rule of URGENT_SYMPTOM_PATTERNS) {
    if (rule.regex.test(normalized)) {
      matchedSignals.push(rule.label);
      if (rule.severity === 'emergency' || highestSeverity === null) {
        highestSeverity = rule.severity;
      }
    }
  }

  if (matchedSignals.length === 0) {
    return {
      isUrgent: false,
      severity: null,
      matchedSignals: [],
      urgentGuidance: '',
    };
  }

  const hasCrisis = matchedSignals.some((s) => s.includes('crisis'));
  const urgentGuidance = hasCrisis
    ? 'What you shared sounds urgent and deserves immediate support. Please contact your local emergency services, go to the nearest emergency hospital, or reach a crisis helpline right away (in India: Tele-MANAS 14416 / 112; US: 988) rather than waiting for wellness navigation.'
    : 'Some of the symptoms you mentioned can require prompt in-person medical evaluation. Please seek immediate medical attention from your nearest emergency department, urgent care clinic, or call emergency services (112 / 108 / 911) rather than relying on lifestyle wellness navigation.';

  return {
    isUrgent: true,
    severity: highestSeverity,
    matchedSignals,
    urgentGuidance,
  };
}

/**
 * Detects whether the seeker indicates they are a minor or asking on behalf of a child/teen.
 */
export function detectMinorOrGuardianContext(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;

  if (
    /\b(under 18|i am a minor|i'm a minor|teenager|my child|my kid|for my son|for my daughter|pediatric)\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  const ageMatch = normalized.match(
    /\b(?:i am|i'm|age(?:d)?|son is|daughter is|child is)\s+(\d{1,2})\b/i
  );
  if (ageMatch) {
    const parsedAge = Number(ageMatch[1]);
    if (Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 18) {
      return true;
    }
  }

  return false;
}

export function formatConsultationCharge(
  fee?: number | null,
  currency?: string | null
): string {
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) {
    return 'Charges not listed';
  }
  const code = (currency || 'INR').trim().toUpperCase();
  if (code === 'INR') {
    return `₹${fee.toLocaleString('en-IN')}`;
  }
  if (code === 'USD') {
    return `$${fee.toLocaleString('en-US')}`;
  }
  return `${code} ${fee.toLocaleString('en-US')}`;
}

export function formatConsultationMode(
  format?: 'online' | 'in_person' | 'both' | null
): string {
  switch (format) {
    case 'online':
      return 'Online Consultation';
    case 'in_person':
      return 'In-Person Clinic';
    case 'both':
      return 'Online & In-Person';
    default:
      return 'Consultation format not listed';
  }
}

export interface RankedPractitionerMatch {
  practitioner: Practitioner;
  score: number;
  matchReasons: string[];
}

export interface PractitionerMatchResult {
  matches: RankedPractitionerMatch[];
  emptyReason: string | null;
}

export interface MatchPractitionerInput {
  practitioners: Practitioner[];
  criteria?: Partial<CompanionMatchingCriteria> | null;
  concernText?: string;
  isLiveFirebaseMode?: boolean;
  limit?: number;
}

/**
 * Deterministically filters and ranks verified AYUSH practitioners using strictly
 * real attributes present on each practitioner record. Never fabricates candidates.
 */
export function matchVerifiedPractitioners(
  input: MatchPractitionerInput
): PractitionerMatchResult {
  const pool = (input.practitioners || []).filter((p) => {
    if (!p || !p.id || !p.name) return false;
    if (input.isLiveFirebaseMode && p.id.trim() === 'prac-1') {
      return false;
    }
    return true;
  });

  if (pool.length === 0) {
    return {
      matches: [],
      emptyReason:
        'No verified AYUSH practitioners are currently available in the directory to match right now.',
    };
  }

  const criteria = input.criteria || {};
  const preferredDisciplines = (criteria.preferredDisciplines || []).map((d) =>
    d.toLowerCase()
  );
  const keywords = (criteria.focusKeywords || [])
    .concat((input.concernText || '').split(/[\s,.;!?]+/))
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 3);
  const uniqueKeywords = Array.from(new Set(keywords));
  const requestedFormat = criteria.consultationFormat || null;
  const maxBudget =
    typeof criteria.maxBudget === 'number' && criteria.maxBudget > 0
      ? criteria.maxBudget
      : null;
  const preferredLanguage = criteria.preferredLanguage?.trim().toLowerCase() || '';
  const preferredLocation = criteria.preferredLocation?.trim().toLowerCase() || '';

  const filtered = pool.filter((p) => {
    if (requestedFormat && requestedFormat !== 'both' && p.consultationFormat) {
      if (p.consultationFormat !== 'both' && p.consultationFormat !== requestedFormat) {
        return false;
      }
    }
    if (
      maxBudget !== null &&
      typeof p.consultationFee === 'number' &&
      p.consultationFee > maxBudget
    ) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return {
      matches: [],
      emptyReason:
        'No verified practitioners matched your current format or budget filters. You can relax your filters to view all verified practitioners.',
    };
  }

  const ranked: RankedPractitionerMatch[] = filtered.map((p) => {
    let score = 10;
    const matchReasons: string[] = [];

    const disciplineLower = p.discipline.toLowerCase();
    if (
      preferredDisciplines.length > 0 &&
      preferredDisciplines.some(
        (d) => disciplineLower.includes(d) || d.includes(disciplineLower)
      )
    ) {
      score += 35;
      matchReasons.push(`Specializes in ${p.discipline}`);
    }

    const haystack = `${p.specialization} ${p.bio} ${p.qualification}`.toLowerCase();
    const matchedTerms = uniqueKeywords.filter((kw) => haystack.includes(kw));
    if (matchedTerms.length > 0) {
      score += Math.min(30, matchedTerms.length * 8);
      matchReasons.push(`Focus area aligns with ${p.specialization}`);
    } else if (p.specialization) {
      matchReasons.push(`Focus: ${p.specialization}`);
    }

    if (requestedFormat && p.consultationFormat) {
      if (p.consultationFormat === requestedFormat || p.consultationFormat === 'both') {
        score += 12;
        matchReasons.push(formatConsultationMode(p.consultationFormat));
      }
    }

    if (preferredLanguage && Array.isArray(p.languages)) {
      const hasLang = p.languages.some((l) =>
        l.toLowerCase().includes(preferredLanguage)
      );
      if (hasLang) {
        score += 10;
        matchReasons.push(`Speaks ${preferredLanguage}`);
      }
    }

    if (preferredLocation && p.location) {
      if (p.location.toLowerCase().includes(preferredLocation)) {
        score += 10;
        matchReasons.push(`Located in ${p.location}`);
      }
    }

    if (p.nextAvailableSlot) {
      score += 5;
      matchReasons.push(`Next available: ${p.nextAvailableSlot}`);
    }

    if (typeof p.experienceYears === 'number' && p.experienceYears > 0) {
      score += Math.min(8, Math.floor(p.experienceYears / 3));
    }

    return {
      practitioner: p,
      score,
      matchReasons: Array.from(new Set(matchReasons)).slice(0, 3),
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  const limit = input.limit && input.limit > 0 ? input.limit : 4;

  return {
    matches: ranked.slice(0, limit),
    emptyReason: null,
  };
}

export function normalizeAYUSHDisciplines(raw: string[]): AYUSHDiscipline[] {
  const valid: AYUSHDiscipline[] = [
    'Ayurveda',
    'Yoga & Naturopathy',
    'Unani',
    'Siddha',
    'Homeopathy',
  ];
  const matched: AYUSHDiscipline[] = [];
  for (const item of raw || []) {
    const lower = (item || '').trim().toLowerCase();
    const found = valid.find(
      (v) =>
        v.toLowerCase() === lower ||
        (lower.includes('yoga') && v === 'Yoga & Naturopathy') ||
        (lower.includes('naturopathy') && v === 'Yoga & Naturopathy') ||
        (lower.includes('homoeo') && v === 'Homeopathy')
    );
    if (found && !matched.includes(found)) {
      matched.push(found);
    }
  }
  return matched;
}
