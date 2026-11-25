import { AYUSHDiscipline, WellnessCategory, RoleType, WellnessProgram } from '../types';
import {
  ProgramApprovalStatus,
  WellnessProgramDocument,
} from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

export const LOCAL_PROGRAMS_KEY = 'ayush_programs_store';
export const SEEDED_PROGRAMS_FLAG_KEY = 'ayush_programs_demo_seeded';
export const LOCAL_ENROLLMENTS_KEY = 'ayush_program_enrollments_store';
export const SEEDED_ENROLLMENTS_FLAG_KEY = 'ayush_enrollments_demo_seeded';

const memoryStore = new Map<string, string>();

function hasBrowserStorage(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function getLocalMap<T>(key: string): Record<string, T> {
  try {
    const raw = hasBrowserStorage()
      ? window.localStorage.getItem(key)
      : memoryStore.get(key) ?? null;
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    const raw = memoryStore.get(key) ?? null;
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  }
}

function setLocalMap<T>(key: string, data: Record<string, T>): void {
  const val = JSON.stringify(data);
  try {
    if (hasBrowserStorage()) {
      window.localStorage.setItem(key, val);
      return;
    }
  } catch {
    // Fallback
  }
  memoryStore.set(key, val);
}

function getFlag(key: string): boolean {
  try {
    if (hasBrowserStorage()) {
      return window.localStorage.getItem(key) === 'true';
    }
  } catch {
    // Ignore
  }
  return memoryStore.get(key) === 'true';
}

function setFlag(key: string): void {
  try {
    if (hasBrowserStorage()) {
      window.localStorage.setItem(key, 'true');
      return;
    }
  } catch {
    // Fallback
  }
  memoryStore.set(key, 'true');
}

function generateUniqueProgramId(): string {
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  return `prog_${Date.now()}_${randomSuffix}`;
}

export interface PublishedUserProgram {
  id: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  durationWeeks: number;
  totalSessions: number;
  creatorPractitionerId: string;
  practitionerName: string;
  practitionerTitle: string;
  description: string;
  nextSession: string;
  level: 'Beginner' | 'Intermediate' | 'Deepening';
  status: 'published';
  isPublished: true;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isSimulated: boolean;
}

export interface ProgramEnrollmentRecord {
  programId: string;
  userId: string;
  completedSessions: number;
  enrolledAt: string;
  isSimulated?: boolean;
}

export interface SaveOrSubmitProgramInput {
  id?: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  durationWeeks: number;
  level: 'Beginner' | 'Intermediate' | 'Deepening';
  description: string;
  nextSessionTemplate?: string;
  creatorPractitionerId: string;
  practitionerName: string;
  practitionerTitle: string;
  submitForReview: boolean;
}

export interface ReviewProgramDecisionInput {
  programId: string;
  decision: 'published' | 'revision_requested';
  reviewerId: string;
  reviewerRole: RoleType | null | undefined;
  reviewNotes?: string;
}

export function validateProgramInput(input: SaveOrSubmitProgramInput): {
  isValid: boolean;
  message?: string;
} {
  if (!input.creatorPractitionerId?.trim()) {
    return { isValid: false, message: 'Practitioner creator identity is required.' };
  }
  if (!input.title?.trim() || input.title.trim().length < 4) {
    return {
      isValid: false,
      message: 'Please provide a wellness programme title (at least 4 characters).',
    };
  }
  if (!input.description?.trim() || input.description.trim().length < 10) {
    return {
      isValid: false,
      message: 'Please provide a programme description and objectives (at least 10 characters).',
    };
  }
  const weeks = Number(input.durationWeeks);
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
    return {
      isValid: false,
      message: 'Programme duration must be between 1 and 52 weeks.',
    };
  }
  return { isValid: true };
}

/**
 * Seeds synthetic demo wellness programmes once into Local Persistent Demo Storage.
 * Preserves existing demo records across Practitioner and Admin dashboards, labeled isSimulated: true.
 */
export function seedDemoPrograms(): WellnessProgramDocument[] {
  if (getFlag(SEEDED_PROGRAMS_FLAG_KEY)) {
    return Object.values(getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY));
  }

  const store = getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY);
  const demoPrograms: WellnessProgramDocument[] = [
    {
      id: 'prog-app-1',
      title: 'Post-Pandemic Respiratory Pranayama & Herbal Steam',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      durationWeeks: 4,
      totalSessions: 16,
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      description:
        'Progressive diaphragmatic and herbal inhalation protocol focusing on respiratory comfort, natural mucus expulsion, and bronchial calming.',
      nextSessionTemplate: 'Module 1: Gentle Nadishodhana & Steam Rituals',
      level: 'Beginner',
      status: 'pending_approval',
      isPublished: false,
      submittedAt: '2026-11-04T09:15:00.000Z',
      reviewedByAdminId: null,
      reviewedAt: null,
      reviewNotes: null,
      isSimulated: true,
      createdAt: '2026-11-04T09:00:00.000Z',
      updatedAt: '2026-11-04T09:15:00.000Z',
    },
    {
      id: 'prog-1',
      title: 'Dinacharya: 21-Day Circadian Alignment',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      durationWeeks: 3,
      totalSessions: 21,
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda), 12 yrs exp',
      description:
        'Comprehensive guided daily routine covering wake-up hydration, tongue scraping, mindful meals, and evening digital curfew.',
      nextSessionTemplate: 'Module 15: Seasonally Harmonizing Sleep Hygiene',
      level: 'Beginner',
      status: 'published',
      isPublished: true,
      submittedAt: '2026-10-18T10:00:00.000Z',
      reviewedByAdminId: 'admin_demo_seed',
      reviewedAt: '2026-10-20T12:00:00.000Z',
      publishedAt: '2026-10-20T12:00:00.000Z',
      reviewNotes: 'Meets non-diagnostic educational wellness guidelines.',
      isSimulated: true,
      createdAt: '2026-10-18T09:30:00.000Z',
      updatedAt: '2026-10-20T12:00:00.000Z',
    },
    {
      id: 'prog-app-2',
      title: 'Dravidian Varmam & Joint Rejuvenation Protocol',
      discipline: 'Siddha',
      category: 'Lifestyle Education',
      durationWeeks: 3,
      totalSessions: 12,
      creatorPractitionerId: 'prac-3',
      practitionerName: 'Dr. K. Senthil Kumar',
      practitionerTitle: 'BSMS, MD (Siddha)',
      description:
        'Classical Siddha joint lubrication exercises, herbal poultice recommendations, and pressure point awareness for stiffness.',
      nextSessionTemplate: 'Orientation: Vital Energy Point Mapping',
      level: 'Intermediate',
      status: 'pending_approval',
      isPublished: false,
      submittedAt: '2026-11-03T11:00:00.000Z',
      reviewedByAdminId: null,
      reviewedAt: null,
      publishedAt: null,
      reviewNotes: null,
      isSimulated: true,
      createdAt: '2026-11-03T10:30:00.000Z',
      updatedAt: '2026-11-03T11:00:00.000Z',
    },
    {
      id: 'prog-2',
      title: 'Pranayama & Nervous System Resilience',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      durationWeeks: 4,
      totalSessions: 16,
      creatorPractitionerId: 'prac-2',
      practitionerName: 'Acharya Rajesh Verma',
      practitionerTitle: 'M.Sc Yoga Therapy, Naturopath',
      description:
        'Progressive diaphragmatic, ujjayi, and brahmari breathwork series designed to reduce sympathetic overdrive and restore HRV.',
      nextSessionTemplate: 'Session 7: Deep Kumbhaka & Breath Retention Foundations',
      level: 'Intermediate',
      status: 'published',
      isPublished: true,
      submittedAt: '2026-10-15T10:00:00.000Z',
      reviewedByAdminId: 'admin_demo_seed',
      reviewedAt: '2026-10-17T11:00:00.000Z',
      publishedAt: '2026-10-17T11:00:00.000Z',
      reviewNotes: 'Approved for public seeker library.',
      isSimulated: true,
      createdAt: '2026-10-15T09:00:00.000Z',
      updatedAt: '2026-10-17T11:00:00.000Z',
    },
  ];

  for (const program of demoPrograms) {
    if (!store[program.id]) {
      store[program.id] = program;
    }
  }
  setLocalMap(LOCAL_PROGRAMS_KEY, store);
  setFlag(SEEDED_PROGRAMS_FLAG_KEY);
  return Object.values(store);
}

/**
 * Creates or edits a practitioner wellness programme in Draft or Pending Approval status.
 * Practitioners cannot directly publish programmes (isPublished always stays false until Admin approves).
 */
export async function saveOrSubmitProgram(
  input: SaveOrSubmitProgramInput
): Promise<WellnessProgramDocument> {
  const validation = validateProgramInput(input);
  if (!validation.isValid) {
    throw new Error(validation.message || 'Please complete all required programme fields.');
  }

  const now = new Date().toISOString();
  const trimmedTitle = input.title.trim();
  const normalizedTitle = trimmedTitle.toLowerCase();
  const trimmedDescription = input.description.trim();
  const weeks = Math.round(Number(input.durationWeeks));
  const nextStatus: ProgramApprovalStatus = input.submitForReview
    ? 'pending_approval'
    : 'draft';

  const store = getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY);

  if (input.id) {
    const existing = store[input.id];
    if (!existing) {
      throw new Error('The wellness programme record could not be found.');
    }
    if (existing.creatorPractitionerId !== input.creatorPractitionerId) {
      throw new Error('Unauthorized: You may only edit programmes created by your account.');
    }

    const duplicateTitle = Object.values(store).find(
      (item) =>
        item.id !== input.id &&
        item.creatorPractitionerId === input.creatorPractitionerId &&
        item.title.trim().toLowerCase() === normalizedTitle
    );
    if (duplicateTitle) {
      throw new Error('Another wellness programme with this title already exists in your library.');
    }

    const updated: WellnessProgramDocument = {
      ...existing,
      title: trimmedTitle,
      discipline: input.discipline,
      category: input.category,
      durationWeeks: weeks,
      totalSessions: weeks * 4,
      level: input.level,
      description: trimmedDescription,
      nextSessionTemplate:
        input.nextSessionTemplate?.trim() || existing.nextSessionTemplate,
      status: nextStatus,
      isPublished: false,
      submittedAt: input.submitForReview ? now : existing.submittedAt ?? null,
      reviewedByAdminId: input.submitForReview ? null : existing.reviewedByAdminId ?? null,
      reviewedAt: input.submitForReview ? null : existing.reviewedAt ?? null,
      publishedAt: null,
      reviewNotes: input.submitForReview ? null : existing.reviewNotes ?? null,
      updatedAt: now,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'wellnessPrograms', updated.id), updated, { merge: true });
      } catch (err) {
        console.warn('Could not persist programme update in Firestore:', err);
      }
    }

    store[updated.id] = updated;
    setLocalMap(LOCAL_PROGRAMS_KEY, store);
    return updated;
  }

  const existingDuplicate = Object.values(store).find(
    (item) =>
      item.creatorPractitionerId === input.creatorPractitionerId &&
      item.title.trim().toLowerCase() === normalizedTitle
  );
  if (existingDuplicate) {
    throw new Error(
      'A wellness programme with this title already exists in your workspace. Please edit the existing programme instead of creating a duplicate.'
    );
  }

  const newId = generateUniqueProgramId();
  const created: WellnessProgramDocument = {
    id: newId,
    title: trimmedTitle,
    discipline: input.discipline,
    category: input.category,
    durationWeeks: weeks,
    totalSessions: weeks * 4,
    creatorPractitionerId: input.creatorPractitionerId,
    practitionerName: input.practitionerName,
    practitionerTitle: input.practitionerTitle,
    description: trimmedDescription,
    nextSessionTemplate:
      input.nextSessionTemplate?.trim() || 'Module 1: Orientation & Foundations',
    level: input.level,
    status: nextStatus,
    isPublished: false,
    submittedAt: input.submitForReview ? now : null,
    reviewedByAdminId: null,
    reviewedAt: null,
    publishedAt: null,
    reviewNotes: null,
    isSimulated: false,
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'wellnessPrograms', created.id), created);
    } catch (err) {
      console.warn('Could not persist new programme in Firestore:', err);
    }
  }

  store[created.id] = created;
  setLocalMap(LOCAL_PROGRAMS_KEY, store);
  return created;
}

/**
 * Fetches wellness programmes strictly owned by the given practitioner.
 */
export async function fetchProgramsForPractitioner(
  practitionerId: string
): Promise<WellnessProgramDocument[]> {
  if (!practitionerId?.trim()) return [];

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'wellnessPrograms'),
        where('creatorPractitionerId', '==', practitionerId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => d.data() as WellnessProgramDocument)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.warn('Could not fetch practitioner programmes from Firestore:', err);
    }
  }

  const store = getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY);
  return Object.values(store)
    .filter((prog) => prog.creatorPractitionerId === practitionerId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Fetches submitted, published, and revision-requested programmes for Admin governance approval.
 * Private practitioner drafts ('draft') are excluded until submitted.
 */
export async function fetchProgramsForAdminApproval(): Promise<WellnessProgramDocument[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'wellnessPrograms'));
      return snap.docs
        .map((d) => d.data() as WellnessProgramDocument)
        .filter((prog) => prog.status !== 'draft')
        .sort((a, b) => {
          const priority = (s: ProgramApprovalStatus) =>
            s === 'pending_approval' ? 0 : s === 'revision_requested' ? 1 : 2;
          const pDiff = priority(a.status) - priority(b.status);
          if (pDiff !== 0) return pDiff;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    } catch (err) {
      console.warn('Could not fetch admin approval programmes from Firestore:', err);
    }
  }

  const store = getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY);
  return Object.values(store)
    .filter((prog) => prog.status !== 'draft')
    .sort((a, b) => {
      const priority = (s: ProgramApprovalStatus) =>
        s === 'pending_approval' ? 0 : s === 'revision_requested' ? 1 : 2;
      const pDiff = priority(a.status) - priority(b.status);
      if (pDiff !== 0) return pDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

/**
 * Persists an Administrator's Approve & Publish or Request Revision decision on a programme.
 * Blocks non-admin roles and self-approval by the creating practitioner.
 */
export async function reviewProgramDecision(
  input: ReviewProgramDecisionInput
): Promise<WellnessProgramDocument> {
  if (input.reviewerRole !== 'admin') {
    throw new Error(
      'Unauthorized: Administrator governance privileges are required to approve programmes.'
    );
  }
  if (!input.reviewerId?.trim()) {
    throw new Error('Reviewer administrator ID is required.');
  }

  const store = getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY);
  const existing = store[input.programId];
  if (!existing) {
    throw new Error('Wellness programme submission not found.');
  }
  if (existing.creatorPractitionerId === input.reviewerId) {
    throw new Error('Unauthorized: Practitioners cannot approve their own wellness programmes.');
  }
  if (existing.status === 'draft') {
    throw new Error('Private practitioner drafts cannot be approved until submitted for review.');
  }

  const now = new Date().toISOString();
  const defaultNote =
    input.decision === 'published'
      ? 'Approved for public seeker catalog after non-diagnostic compliance review.'
      : 'Ensure safety disclaimers specify non-diagnostic scope and contraindication notes.';
  const finalNotes = input.reviewNotes?.trim() || defaultNote;

  const updated: WellnessProgramDocument = {
    ...existing,
    status: input.decision,
    isPublished: input.decision === 'published',
    reviewedByAdminId: input.reviewerId,
    reviewedAt: now,
    publishedAt: input.decision === 'published' ? now : null,
    reviewNotes: finalNotes,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'wellnessPrograms', updated.id), {
        status: updated.status,
        isPublished: updated.isPublished,
        reviewedByAdminId: updated.reviewedByAdminId,
        reviewedAt: updated.reviewedAt,
        publishedAt: updated.publishedAt,
        reviewNotes: updated.reviewNotes,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.warn('Could not persist programme approval decision in Firestore:', err);
    }
  }

  store[updated.id] = updated;
  setLocalMap(LOCAL_PROGRAMS_KEY, store);
  return updated;
}

/**
 * Sanitizes a stored wellness programme into a seeker-safe published programme view.
 * Explicitly whitelists public fields and NEVER exposes internal reviewNotes or reviewer IDs.
 */
function toPublishedUserProgram(docItem: WellnessProgramDocument): PublishedUserProgram {
  return {
    id: docItem.id,
    title: docItem.title,
    discipline: docItem.discipline,
    category: docItem.category,
    durationWeeks: docItem.durationWeeks,
    totalSessions: docItem.totalSessions,
    creatorPractitionerId: docItem.creatorPractitionerId,
    practitionerName: docItem.practitionerName,
    practitionerTitle: docItem.practitionerTitle,
    description: docItem.description,
    nextSession: docItem.nextSessionTemplate,
    level: docItem.level,
    status: 'published',
    isPublished: true,
    publishedAt: docItem.publishedAt || docItem.reviewedAt || docItem.updatedAt || null,
    createdAt: docItem.createdAt,
    updatedAt: docItem.updatedAt,
    isSimulated: Boolean(docItem.isSimulated),
  };
}

/**
 * Fetches wellness programmes strictly for the User Dashboard.
 * - Requires BOTH status === 'published' AND isPublished === true.
 * - Deduplicates against optional static demoCatalog across all store states
 *   (so retracted or revision-requested items never resurface from static fallbacks).
 * - Never exposes internal reviewNotes or reviewedByAdminId.
 */
export async function fetchPublishedProgramsForUser(options?: {
  demoCatalog?: WellnessProgram[];
}): Promise<PublishedUserProgram[]> {
  let allRecords: WellnessProgramDocument[] = [];

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'wellnessPrograms'));
      allRecords = snap.docs.map((d) => d.data() as WellnessProgramDocument);
    } catch (err) {
      console.warn('Could not fetch published programmes from Firestore:', err);
      const store = getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY);
      allRecords = Object.values(store);
    }
  } else {
    const store = getLocalMap<WellnessProgramDocument>(LOCAL_PROGRAMS_KEY);
    allRecords = Object.values(store);
  }

  const seenIds = new Set<string>();
  const seenNormalizedTitles = new Set<string>();
  const knownAllStoreIds = new Set<string>();
  const knownAllStoreTitles = new Set<string>();

  for (const record of allRecords) {
    knownAllStoreIds.add(record.id);
    knownAllStoreTitles.add(record.title.trim().toLowerCase());
  }

  const publishedList: PublishedUserProgram[] = [];

  for (const record of allRecords) {
    if (record.status !== 'published' || record.isPublished !== true) continue;
    const normTitle = record.title.trim().toLowerCase();
    if (seenIds.has(record.id) || seenNormalizedTitles.has(normTitle)) continue;

    seenIds.add(record.id);
    seenNormalizedTitles.add(normTitle);
    publishedList.push(toPublishedUserProgram(record));
  }

  if (options?.demoCatalog?.length) {
    for (const demoProg of options.demoCatalog) {
      const normTitle = demoProg.title.trim().toLowerCase();
      if (
        knownAllStoreIds.has(demoProg.id) ||
        knownAllStoreTitles.has(normTitle) ||
        seenIds.has(demoProg.id) ||
        seenNormalizedTitles.has(normTitle)
      ) {
        continue;
      }

      seenIds.add(demoProg.id);
      seenNormalizedTitles.add(normTitle);
      publishedList.push({
        id: demoProg.id,
        title: demoProg.title,
        discipline: demoProg.discipline,
        category: demoProg.category,
        durationWeeks: demoProg.durationWeeks,
        totalSessions: demoProg.totalSessions,
        creatorPractitionerId: 'demo_catalog_practitioner',
        practitionerName: demoProg.practitionerName,
        practitionerTitle: demoProg.practitionerTitle,
        description: demoProg.description,
        nextSession: demoProg.nextSession,
        level: demoProg.level,
        status: 'published',
        isPublished: true,
        publishedAt: demoProg.publishedAt ?? '2026-10-15T00:00:00.000Z',
        createdAt: '2026-10-15T00:00:00.000Z',
        updatedAt: '2026-10-15T00:00:00.000Z',
        isSimulated: true,
      });
    }
  }

  return publishedList.sort((a, b) => {
    const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    if (a.isSimulated !== b.isSimulated) return a.isSimulated ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Seeds initial demo enrollments strictly for the demo guest preview user once.
 * Newly approved programmes are never automatically enrolled.
 */
export function seedDemoUserEnrollments(guestUserId: string): ProgramEnrollmentRecord[] {
  if (!guestUserId?.trim()) return [];
  if (getFlag(SEEDED_ENROLLMENTS_FLAG_KEY)) {
    const store = getLocalMap<ProgramEnrollmentRecord[]>(LOCAL_ENROLLMENTS_KEY);
    return store[guestUserId] || [];
  }

  const store = getLocalMap<ProgramEnrollmentRecord[]>(LOCAL_ENROLLMENTS_KEY);
  const existing = store[guestUserId] || [];
  if (existing.length === 0) {
    store[guestUserId] = [
      {
        programId: 'prog-1',
        userId: guestUserId,
        completedSessions: 14,
        enrolledAt: '2026-10-21T08:00:00.000Z',
        isSimulated: true,
      },
      {
        programId: 'prog-2',
        userId: guestUserId,
        completedSessions: 6,
        enrolledAt: '2026-10-24T08:00:00.000Z',
        isSimulated: true,
      },
    ];
    setLocalMap(LOCAL_ENROLLMENTS_KEY, store);
  }
  setFlag(SEEDED_ENROLLMENTS_FLAG_KEY);
  return store[guestUserId];
}

export async function fetchUserProgramEnrollments(
  userId: string
): Promise<ProgramEnrollmentRecord[]> {
  if (!userId?.trim()) return [];
  const store = getLocalMap<ProgramEnrollmentRecord[]>(LOCAL_ENROLLMENTS_KEY);
  return store[userId] || [];
}

/**
 * Enrolls a user in a verified published programme without duplicate enrollments.
 * Rejects unpublished (draft, pending_approval, revision_requested) programmes.
 */
export async function enrollInPublishedProgram(
  userId: string,
  programId: string,
  demoCatalog?: WellnessProgram[]
): Promise<ProgramEnrollmentRecord> {
  if (!userId?.trim()) {
    throw new Error('User identifier is required to enroll in a wellness programme.');
  }
  const publishedPrograms = await fetchPublishedProgramsForUser({ demoCatalog });
  const targetProgram = publishedPrograms.find((p) => p.id === programId);
  if (!targetProgram) {
    throw new Error('Only Admin-published wellness programmes can be enrolled in.');
  }

  const store = getLocalMap<ProgramEnrollmentRecord[]>(LOCAL_ENROLLMENTS_KEY);
  const currentList = store[userId] || [];
  const existing = currentList.find((e) => e.programId === programId);
  if (existing) {
    return existing;
  }

  const created: ProgramEnrollmentRecord = {
    programId,
    userId,
    completedSessions: 0,
    enrolledAt: new Date().toISOString(),
    isSimulated: false,
  };
  store[userId] = [created, ...currentList];
  setLocalMap(LOCAL_ENROLLMENTS_KEY, store);
  return created;
}
