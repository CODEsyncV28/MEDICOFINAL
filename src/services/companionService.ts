import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { Practitioner } from '../types';
import {
  AIConversationDocument,
  CompanionChatMessage,
  CompanionConcernSummary,
  CompanionMatchingCriteria,
  CompanionPhase,
} from '../types/firebase';
import {
  COMPANION_GREETING_MESSAGE,
  SanitizedCompanionContext,
} from '../utils/companionLogic';

const LOCAL_CONVERSATION_KEY_PREFIX = 'ayush_ai_companion_session_v1_';
const memoryConversations = new Map<string, string>();

function getStorageKey(userId: string): string {
  const safeUid = (userId || 'guest').trim();
  return `${LOCAL_CONVERSATION_KEY_PREFIX}${safeUid}`;
}

function readLocalConversation(userId: string): AIConversationDocument | null {
  const key = getStorageKey(userId);
  try {
    const raw =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(key)
        : memoryConversations.get(key) ?? null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AIConversationDocument;
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalConversation(userId: string, docData: AIConversationDocument): void {
  const key = getStorageKey(userId);
  const serialized = JSON.stringify(docData);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serialized);
    }
    memoryConversations.set(key, serialized);
  } catch {
    memoryConversations.set(key, serialized);
  }
}

function deleteLocalConversation(userId: string): void {
  const key = getStorageKey(userId);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    memoryConversations.delete(key);
  } catch {
    memoryConversations.delete(key);
  }
}

export function createInitialCompanionSession(
  userId: string,
  hasAssessmentConsent: boolean = false
): AIConversationDocument {
  const now = new Date().toISOString();
  const safeUid = (userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    id: `conv_${safeUid}`,
    userId,
    title: 'AYUSH Wellness Companion Session',
    hasAssessmentConsent,
    minorGuardianFlag: false,
    messages: [
      {
        id: 'msg-greeting',
        role: 'assistant',
        text: COMPANION_GREETING_MESSAGE,
        timestamp: now,
        phase: 'greeting',
        followUpQuestion: null,
        suggestedReplies: [
          'Irregular sleep & late-night fatigue',
          'Digestive bloating or erratic appetite',
          'Work stress & neck/shoulder stiffness',
          'Help me find an AYUSH practitioner',
        ],
      },
    ],
    latestSummary: null,
    createdAt: now,
    updatedAt: now,
  };
}

function resolveActiveDb(
  userId: string,
  isLoggedIn: boolean,
  firestoreOverride?: Firestore | null
): Firestore | null {
  if (!isLoggedIn || !userId || userId.startsWith('guest')) return null;
  if (firestoreOverride) return firestoreOverride;
  return isFirebaseConfigured && db ? db : null;
}

export async function loadCompanionConversation(
  userId: string,
  isLoggedIn: boolean,
  firestoreOverride?: Firestore | null
): Promise<AIConversationDocument> {
  const activeDb = resolveActiveDb(userId, isLoggedIn, firestoreOverride);
  if (activeDb) {
    try {
      const q = query(
        collection(activeDb, 'aiConversations'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const remote = snap.docs[0].data() as AIConversationDocument;
        writeLocalConversation(userId, remote);
        return remote;
      }
    } catch {
      // Fallback to owner-scoped local cache if remote index/doc does not exist yet
    }
  }

  return readLocalConversation(userId) || createInitialCompanionSession(userId, false);
}

export async function saveCompanionConversation(
  conversation: AIConversationDocument,
  isLoggedIn: boolean,
  firestoreOverride?: Firestore | null
): Promise<void> {
  const boundedMessages = conversation.messages.slice(-50);
  const payload: AIConversationDocument = {
    ...conversation,
    messages: boundedMessages,
    updatedAt: new Date().toISOString(),
  };

  writeLocalConversation(conversation.userId, payload);

  const activeDb = resolveActiveDb(conversation.userId, isLoggedIn, firestoreOverride);
  if (activeDb) {
    const convRef = doc(activeDb, 'aiConversations', payload.id);
    await setDoc(convRef, {
      ...payload,
      updatedAtServer: serverTimestamp(),
    });
  }
}

export async function clearCompanionConversation(
  userId: string,
  conversationId: string,
  hasAssessmentConsent: boolean,
  isLoggedIn: boolean,
  firestoreOverride?: Firestore | null
): Promise<AIConversationDocument> {
  deleteLocalConversation(userId);
  const activeDb = resolveActiveDb(userId, isLoggedIn, firestoreOverride);
  if (activeDb && conversationId) {
    try {
      await deleteDoc(doc(activeDb, 'aiConversations', conversationId));
    } catch {
      // Ignore if doc doesn't exist yet
    }
  }
  const fresh = createInitialCompanionSession(userId, hasAssessmentConsent);
  writeLocalConversation(userId, fresh);
  return fresh;
}

export interface SendCompanionTurnInput {
  messages: CompanionChatMessage[];
  hasAssessmentConsent: boolean;
  consentedContext: SanitizedCompanionContext | null;
  practitioners: Practitioner[];
  isLiveFirebaseMode: boolean;
  sessionKey: string;
}

export interface CompanionApiResponse {
  phase: CompanionPhase;
  reply: string;
  followUpQuestion: string | null;
  suggestedReplies: string[];
  isUrgent: boolean;
  urgentGuidance: string | null;
  isMinorContext: boolean;
  summary: CompanionConcernSummary | null;
  recommendedPractitionerIds: string[];
  matchReasonsByPractitionerId: Record<string, string[]>;
  matchingCriteria: CompanionMatchingCriteria | null;
}

export class CompanionApiError extends Error {
  status: number;
  retryable: boolean;
  code?: string;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    retryable: boolean = true,
    code?: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'CompanionApiError';
    this.status = status;
    this.retryable = retryable;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function sendCompanionChatTurn(
  input: SendCompanionTurnInput
): Promise<CompanionApiResponse> {
  const payload = {
    messages: input.messages
      .filter((m) => m.id !== 'msg-greeting')
      .map((m) => ({
        role: m.role,
        text: m.followUpQuestion ? `${m.text}\n${m.followUpQuestion}` : m.text,
      })),
    hasAssessmentConsent: input.hasAssessmentConsent,
    consentedContext: input.hasAssessmentConsent ? input.consentedContext : null,
    practitioners: input.practitioners,
    isLiveFirebaseMode: input.isLiveFirebaseMode,
    sessionKey: input.sessionKey,
  };

  let response: Response;
  try {
    response = await fetch('/api/companion/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new CompanionApiError(
      'Network error while connecting to the AYUSH AI Wellness Companion. Please check your connection and retry.',
      0,
      true,
      'NETWORK_ERROR'
    );
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON upstream error
  }

  if (!response.ok) {
    const errMsg =
      typeof data.error === 'string' && data.error.trim()
        ? data.error
        : `Companion service returned status ${response.status}.`;
    const retryable = typeof data.retryable === 'boolean' ? data.retryable : response.status >= 429;
    const code = typeof data.code === 'string' ? data.code : undefined;
    const retryAfterSeconds =
      typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined;
    throw new CompanionApiError(errMsg, response.status, retryable, code, retryAfterSeconds);
  }

  return data as unknown as CompanionApiResponse;
}
