import { AYUSHDiscipline, WellnessCategory, RoleType, EducationalArticle } from '../types';
import {
  ArticleApprovalStatus,
  EducationalArticleDocument,
} from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

export const LOCAL_ARTICLES_KEY = 'ayush_articles_store';
export const SEEDED_ARTICLES_FLAG_KEY = 'ayush_articles_demo_seeded';

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
    // Fallback to memory store
  }
  memoryStore.set(key, val);
}

function getFlag(key: string): boolean {
  try {
    if (hasBrowserStorage()) {
      return window.localStorage.getItem(key) === 'true';
    }
  } catch {
    // Ignore storage error
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

function generateUniqueArticleId(): string {
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  return `art_${Date.now()}_${randomSuffix}`;
}

export interface PublishedUserArticle extends EducationalArticle {
  authorId: string;
  status: 'published';
  publishedAt: string | null;
  submittedAt: string | null;
  createdAt?: string;
  updatedAt: string;
  isSimulated: boolean;
}

export function formatPublicationDateLabel(iso?: string | null): string {
  if (!iso) return 'Published';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `Published ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(parsed)}`;
}

export interface SaveOrSubmitArticleInput {
  id?: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  readTime?: string;
  summary: string;
  fullContent?: string;
  keyTakeaways?: string[];
  authorId: string;
  authorName: string;
  authorQualification: string;
  submitForReview: boolean;
}

export interface ReviewArticleDecisionInput {
  articleId: string;
  decision: 'published' | 'revision_requested';
  reviewerId: string;
  reviewerRole: RoleType | null | undefined;
  reviewNotes?: string;
}

export function validateArticleInput(input: SaveOrSubmitArticleInput): {
  isValid: boolean;
  message?: string;
} {
  if (!input.authorId?.trim()) {
    return { isValid: false, message: 'Practitioner author identity is required.' };
  }
  if (!input.title?.trim() || input.title.trim().length < 4) {
    return {
      isValid: false,
      message: 'Please provide an educational article title (at least 4 characters).',
    };
  }
  if (!input.summary?.trim() || input.summary.trim().length < 10) {
    return {
      isValid: false,
      message: 'Please provide an educational thesis or summary (at least 10 characters).',
    };
  }
  return { isValid: true };
}

/**
 * Seeds synthetic demo educational articles once into Local Persistent Demo Storage.
 * Includes Practitioner authored drafts/submissions and existing Admin demo catalog records.
 */
export function seedDemoArticles(): EducationalArticleDocument[] {
  if (getFlag(SEEDED_ARTICLES_FLAG_KEY)) {
    return Object.values(getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY));
  }

  const store = getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY);
  const demoArticles: EducationalArticleDocument[] = [
    {
      id: 'auth-1',
      title: 'Guidance on Seasonal Herbal Teas for Autumn Transition (Sharad Ritucharya)',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      readTime: '6 min read',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda), CCY (Yoga Certification)',
      summary:
        'Clear educational tone with appropriate safety disclaimers regarding culinary vs medicinal dosages of ginger and tulsi.',
      fullContent:
        'In late autumn (Sharad Ritucharya), the environmental cooling requires pacification of residual Pitta heat followed by stabilization of Vata dryness. Traditional infusions of boiled coriander seeds, dried ginger, and holy basil support gentle digestive fire without overheating mucosal membranes.',
      keyTakeaways: [
        'Separate culinary herbal infusions from concentrated therapeutic preparations.',
        'Observe individual digestive warmth before adding warming spices.',
        'Maintain non-diagnostic seasonal hydration rhythms.',
      ],
      status: 'pending_approval',
      submittedAt: '2026-11-04T09:00:00.000Z',
      reviewedByAdminId: null,
      reviewedAt: null,
      publishedAt: null,
      reviewNotes:
        'Clear educational tone with appropriate safety disclaimers regarding culinary vs medicinal dosages.',
      isSimulated: true,
      createdAt: '2026-11-04T08:30:00.000Z',
      updatedAt: '2026-11-04T09:00:00.000Z',
    },
    {
      id: 'auth-2',
      title: 'Understanding Prakriti: Your Unique Constitutional Blueprint',
      discipline: 'Ayurveda',
      category: 'Ayurveda',
      readTime: '6 min read',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda), CCY (Yoga Certification)',
      summary:
        'A foundational introduction to Vata, Pitta, and Kapha biological principles for beginners.',
      fullContent:
        'Prakriti is the individual biological constitution established at conception according to classical Ayurvedic biology. Observing natural rhythms allows gentle calibration of daily meals, movement, and rest.',
      keyTakeaways: [
        'Prakriti reflects baseline constitutional tendencies.',
        'Opposite qualities help cultivate gentle daily balance.',
      ],
      status: 'published',
      submittedAt: '2026-10-14T10:00:00.000Z',
      reviewedByAdminId: 'admin_demo_seed',
      reviewedAt: '2026-10-15T14:00:00.000Z',
      publishedAt: '2026-10-15T14:00:00.000Z',
      reviewNotes: 'Approved for public educational catalog.',
      isSimulated: true,
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-15T14:00:00.000Z',
    },
    {
      id: 'auth-3',
      title: 'Dinacharya Guidelines: Circadian Awakening & Oral Hygiene Rituals',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      readTime: '5 min read',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda), CCY (Yoga Certification)',
      summary:
        'Exploring oil pulling (Gandusha), tongue scraping (Jihwa Nirlekhana), and warm morning hydration.',
      fullContent:
        'Classical texts recommend sensory organ purification upon waking to stimulate vagal nerve tone and prime gastrointestinal tract readiness.',
      keyTakeaways: [
        'Gentle tongue scraping supports morning digestive readiness.',
        'Warm water hydration initiates calm circadian awakening.',
      ],
      status: 'draft',
      submittedAt: null,
      reviewedByAdminId: null,
      reviewedAt: null,
      publishedAt: null,
      reviewNotes: null,
      isSimulated: true,
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T08:00:00.000Z',
    },
    {
      id: 'appr-2',
      title: 'Safe Spinal Mobilization Principles for Desk Workers',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      readTime: '5 min read',
      authorId: 'prac-2',
      authorName: 'Acharya Rajesh Verma',
      authorQualification: 'M.Sc Yoga Therapy, Naturopath',
      summary:
        'Verified alignment with Naturopathic posture safety standards for gentle midday neck and spine unwinding.',
      fullContent:
        'Prolonged desk work compresses lumbar discs and rounds thoracic posture. Gentle breath-led spinal flexion and extension restore ergonomic mobility without strain.',
      keyTakeaways: [
        'Pair thoracic opening with slow nasal exhalations.',
        'Avoid forced neck rotation during seated breaks.',
      ],
      status: 'published',
      submittedAt: '2026-11-01T11:00:00.000Z',
      reviewedByAdminId: 'admin_demo_seed',
      reviewedAt: '2026-11-02T15:30:00.000Z',
      publishedAt: '2026-11-02T15:30:00.000Z',
      reviewNotes: 'Verified alignment with Naturopathic posture safety standards.',
      isSimulated: true,
      createdAt: '2026-11-01T10:30:00.000Z',
      updatedAt: '2026-11-02T15:30:00.000Z',
    },
    {
      id: 'appr-3',
      title: 'Foundations of Unani Mizaj (Temperament) Self-Observation',
      discipline: 'Unani',
      category: 'Lifestyle Education',
      readTime: '6 min read',
      authorId: 'prac-4',
      authorName: 'Dr. Tariq Mansoor',
      authorQualification: 'BUMS, Unani Physician',
      summary:
        'Non-diagnostic, focusing strictly on seasonal environment and hydration awareness through classical Mizaj balance.',
      fullContent:
        'Classical Unani wellness explores how ambient air, restful sleep, movement, and hydration interact with individual temperament (Mizaj).',
      keyTakeaways: [
        'Focuses on the six essential lifestyle factors (Asbab-e-Sittah Zarooriyyah).',
        'Strictly non-diagnostic lifestyle education.',
      ],
      status: 'published',
      submittedAt: '2026-10-29T10:00:00.000Z',
      reviewedByAdminId: 'admin_demo_seed',
      reviewedAt: '2026-10-30T13:00:00.000Z',
      publishedAt: '2026-10-30T13:00:00.000Z',
      reviewNotes: 'Non-diagnostic, focusing strictly on seasonal environment and hydration awareness.',
      isSimulated: true,
      createdAt: '2026-10-29T09:00:00.000Z',
      updatedAt: '2026-10-30T13:00:00.000Z',
    },
  ];

  for (const article of demoArticles) {
    if (!store[article.id]) {
      store[article.id] = article;
    }
  }
  setLocalMap(LOCAL_ARTICLES_KEY, store);
  setFlag(SEEDED_ARTICLES_FLAG_KEY);
  return Object.values(store);
}

/**
 * Creates or updates an educational article in Draft or Pending Review status.
 * Editing an existing article updates it in place instead of creating duplicates.
 * Practitioners can never directly set status to 'published'.
 */
export async function saveOrSubmitArticle(
  input: SaveOrSubmitArticleInput
): Promise<EducationalArticleDocument> {
  const validation = validateArticleInput(input);
  if (!validation.isValid) {
    throw new Error(validation.message || 'Please complete all required article fields.');
  }

  const now = new Date().toISOString();
  const trimmedTitle = input.title.trim();
  const normalizedTitle = trimmedTitle.toLowerCase();
  const trimmedSummary = input.summary.trim();
  const trimmedContent =
    input.fullContent?.trim() ||
    `${trimmedSummary}\n\nEducational guidance drafted for non-diagnostic lifestyle reflection.`;
  const nextStatus: ArticleApprovalStatus = input.submitForReview
    ? 'pending_approval'
    : 'draft';

  const store = getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY);

  if (input.id) {
    const existing = store[input.id];
    if (!existing) {
      throw new Error('The article record could not be found.');
    }
    if (existing.authorId !== input.authorId) {
      throw new Error('Unauthorized: You may only edit articles authored by your account.');
    }

    const duplicateTitle = Object.values(store).find(
      (item) =>
        item.id !== input.id &&
        item.authorId === input.authorId &&
        item.title.trim().toLowerCase() === normalizedTitle
    );
    if (duplicateTitle) {
      throw new Error('Another article with this title already exists in your workspace.');
    }

    const updated: EducationalArticleDocument = {
      ...existing,
      title: trimmedTitle,
      discipline: input.discipline,
      category: input.category,
      readTime: input.readTime?.trim() || existing.readTime || '5 min read',
      summary: trimmedSummary,
      fullContent: trimmedContent,
      keyTakeaways: input.keyTakeaways?.length
        ? input.keyTakeaways
        : existing.keyTakeaways,
      status: nextStatus,
      submittedAt: input.submitForReview ? now : existing.submittedAt ?? null,
      reviewedByAdminId: input.submitForReview ? null : existing.reviewedByAdminId ?? null,
      reviewedAt: input.submitForReview ? null : existing.reviewedAt ?? null,
      publishedAt: null,
      reviewNotes: input.submitForReview ? null : existing.reviewNotes ?? null,
      updatedAt: now,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'educationalArticles', updated.id), updated, { merge: true });
      } catch (err) {
        console.warn('Could not persist article update in Firestore:', err);
      }
    }

    store[updated.id] = updated;
    setLocalMap(LOCAL_ARTICLES_KEY, store);
    return updated;
  }

  // Prevent accidental duplicate submission with identical title for same practitioner
  const existingDuplicate = Object.values(store).find(
    (item) =>
      item.authorId === input.authorId &&
      item.title.trim().toLowerCase() === normalizedTitle
  );
  if (existingDuplicate) {
    throw new Error(
      'An article with this title already exists in your workspace. Please edit the existing article instead of creating a duplicate.'
    );
  }

  const newId = generateUniqueArticleId();
  const created: EducationalArticleDocument = {
    id: newId,
    title: trimmedTitle,
    discipline: input.discipline,
    category: input.category,
    readTime: input.readTime?.trim() || '5 min read',
    authorId: input.authorId,
    authorName: input.authorName,
    authorQualification: input.authorQualification,
    summary: trimmedSummary,
    fullContent: trimmedContent,
    keyTakeaways: input.keyTakeaways?.length
      ? input.keyTakeaways
      : [
          'Focuses on classical non-diagnostic health cultivation.',
          'Safe culinary awareness of traditional wellness practices.',
          'Consult a qualified practitioner for personalized guidance.',
        ],
    status: nextStatus,
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
      await setDoc(doc(db, 'educationalArticles', created.id), created);
    } catch (err) {
      console.warn('Could not save new article in Firestore:', err);
    }
  }

  store[created.id] = created;
  setLocalMap(LOCAL_ARTICLES_KEY, store);
  return created;
}

/**
 * Fetches educational articles authored strictly by the specified practitioner.
 */
export async function fetchArticlesForPractitioner(
  practitionerId: string
): Promise<EducationalArticleDocument[]> {
  if (!practitionerId?.trim()) return [];

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'educationalArticles'),
        where('authorId', '==', practitionerId)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => d.data() as EducationalArticleDocument)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.warn('Could not fetch practitioner articles from Firestore:', err);
    }
  }

  const store = getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY);
  return Object.values(store)
    .filter((art) => art.authorId === practitionerId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Fetches submitted, approved, and revision-requested articles for Admin governance moderation.
 * Private practitioner drafts ('draft') are excluded until submitted for review.
 */
export async function fetchArticlesForAdminModeration(): Promise<EducationalArticleDocument[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'educationalArticles'));
      return snap.docs
        .map((d) => d.data() as EducationalArticleDocument)
        .filter((art) => art.status !== 'draft')
        .sort((a, b) => {
          const priority = (s: ArticleApprovalStatus) =>
            s === 'pending_approval' ? 0 : s === 'revision_requested' ? 1 : 2;
          const pDiff = priority(a.status) - priority(b.status);
          if (pDiff !== 0) return pDiff;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    } catch (err) {
      console.warn('Could not fetch moderation articles from Firestore:', err);
    }
  }

  const store = getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY);
  return Object.values(store)
    .filter((art) => art.status !== 'draft')
    .sort((a, b) => {
      const priority = (s: ArticleApprovalStatus) =>
        s === 'pending_approval' ? 0 : s === 'revision_requested' ? 1 : 2;
      const pDiff = priority(a.status) - priority(b.status);
      if (pDiff !== 0) return pDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

/**
 * Persists an Administrator's Approve or Request Revision decision on an article submission.
 * Blocks non-admin roles and prevents self-approval by the authoring practitioner.
 */
export async function reviewArticleDecision(
  input: ReviewArticleDecisionInput
): Promise<EducationalArticleDocument> {
  if (input.reviewerRole !== 'admin') {
    throw new Error(
      'Unauthorized: Administrator governance privileges are required to moderate articles.'
    );
  }
  if (!input.reviewerId?.trim()) {
    throw new Error('Reviewer administrator ID is required.');
  }

  const store = getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY);
  const existing = store[input.articleId];
  if (!existing) {
    throw new Error('Article submission not found.');
  }
  if (existing.authorId === input.reviewerId) {
    throw new Error('Unauthorized: Authors cannot approve or review their own submissions.');
  }
  if (existing.status === 'draft') {
    throw new Error('Private practitioner drafts cannot be moderated until submitted for review.');
  }

  const now = new Date().toISOString();
  const defaultNote =
    input.decision === 'published'
      ? 'Approved by Platform Governance Administrator for non-diagnostic educational compliance.'
      : 'Ensure culinary dosage safety and non-diagnostic framing are explicitly stated.';
  const finalNotes = input.reviewNotes?.trim() || defaultNote;

  const updated: EducationalArticleDocument = {
    ...existing,
    status: input.decision,
    reviewedByAdminId: input.reviewerId,
    reviewedAt: now,
    publishedAt: input.decision === 'published' ? now : null,
    reviewNotes: finalNotes,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'educationalArticles', updated.id), {
        status: updated.status,
        reviewedByAdminId: updated.reviewedByAdminId,
        reviewedAt: updated.reviewedAt,
        publishedAt: updated.publishedAt,
        reviewNotes: updated.reviewNotes,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.warn('Could not persist article moderation decision in Firestore:', err);
    }
  }

  store[updated.id] = updated;
  setLocalMap(LOCAL_ARTICLES_KEY, store);
  return updated;
}

/**
 * Sanitizes a stored article into a seeker-safe published article view.
 * Explicitly whitelists public fields and NEVER exposes internal reviewNotes or reviewer IDs.
 */
function toPublishedUserArticle(docItem: EducationalArticleDocument): PublishedUserArticle {
  const pubIso = docItem.publishedAt || docItem.updatedAt || null;
  return {
    id: docItem.id,
    title: docItem.title,
    discipline: docItem.discipline,
    category: docItem.category,
    readTime: docItem.readTime || '5 min read',
    author: docItem.authorName,
    authorQualification: docItem.authorQualification,
    authorId: docItem.authorId,
    summary: docItem.summary,
    fullContent: docItem.fullContent,
    keyTakeaways: Array.isArray(docItem.keyTakeaways) ? [...docItem.keyTakeaways] : [],
    reviewedDate: formatPublicationDateLabel(pubIso),
    publishedAt: pubIso,
    submittedAt: docItem.submittedAt ?? null,
    createdAt: docItem.createdAt,
    updatedAt: docItem.updatedAt,
    status: 'published',
    isSimulated: Boolean(docItem.isSimulated),
  };
}

/**
 * Fetches published educational articles strictly for the User Dashboard Learning Corner.
 * - Only returns records whose status is strictly 'published'.
 * - Deduplicates against optional static demoCatalog by ID and normalized title across all store states
 *   (so retracted or revision-requested items are never resurrected from static demo fallbacks).
 * - Never exposes internal reviewNotes or reviewedByAdminId to seekers.
 */
export async function fetchPublishedArticlesForUser(options?: {
  demoCatalog?: EducationalArticle[];
}): Promise<PublishedUserArticle[]> {
  let allRecords: EducationalArticleDocument[] = [];

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'educationalArticles'));
      allRecords = snap.docs.map((d) => d.data() as EducationalArticleDocument);
    } catch (err) {
      console.warn('Could not fetch published articles from Firestore:', err);
      const store = getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY);
      allRecords = Object.values(store);
    }
  } else {
    const store = getLocalMap<EducationalArticleDocument>(LOCAL_ARTICLES_KEY);
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

  const publishedList: PublishedUserArticle[] = [];

  for (const record of allRecords) {
    if (record.status !== 'published') continue;
    const normTitle = record.title.trim().toLowerCase();
    if (seenIds.has(record.id) || seenNormalizedTitles.has(normTitle)) continue;

    seenIds.add(record.id);
    seenNormalizedTitles.add(normTitle);
    publishedList.push(toPublishedUserArticle(record));
  }

  if (options?.demoCatalog?.length) {
    for (const demoArt of options.demoCatalog) {
      const normTitle = demoArt.title.trim().toLowerCase();
      if (
        knownAllStoreIds.has(demoArt.id) ||
        knownAllStoreTitles.has(normTitle) ||
        seenIds.has(demoArt.id) ||
        seenNormalizedTitles.has(normTitle)
      ) {
        continue;
      }

      seenIds.add(demoArt.id);
      seenNormalizedTitles.add(normTitle);
      publishedList.push({
        id: demoArt.id,
        title: demoArt.title,
        discipline: demoArt.discipline,
        category: demoArt.category,
        readTime: demoArt.readTime,
        author: demoArt.author,
        authorQualification: demoArt.authorQualification,
        authorId: 'demo_catalog_author',
        summary: demoArt.summary,
        fullContent: demoArt.fullContent,
        keyTakeaways: Array.isArray(demoArt.keyTakeaways) ? [...demoArt.keyTakeaways] : [],
        reviewedDate: demoArt.reviewedDate || 'Published',
        publishedAt: demoArt.publishedAt ?? null,
        submittedAt: null,
        updatedAt: '2026-11-01T00:00:00.000Z',
        status: 'published',
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
