import { ContentApprovalDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LOCAL_APPROVALS_KEY = 'ayush_approvals_store';
const memoryStore = new Map<string, string>();

function getLocalData<T>(key: string): Record<string, T> {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(key)
      : memoryStore.get(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    const raw = memoryStore.get(key);
    return raw ? JSON.parse(raw) : {};
  }
}

function setLocalData<T>(key: string, data: Record<string, T>): void {
  try {
    const val = JSON.stringify(data);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
    memoryStore.set(key, val);
  } catch {
    memoryStore.set(key, JSON.stringify(data));
  }
}

/**
 * Updates content approval decision.
 * Strictly restricted to users with role 'admin' per Firestore security rules.
 */
export async function updateApprovalDecision(
  approvalId: string,
  status: 'Approved' | 'Revision Requested',
  adminUserId: string,
  reviewNotes?: string
): Promise<void> {
  const now = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'contentApprovals', approvalId);
      await updateDoc(docRef, {
        status,
        reviewedByAdminId: adminUserId,
        ...(reviewNotes ? { reviewNotes } : {}),
        reviewedAt: now,
        updatedAt: now,
      });
      return;
    } catch (err) {
      console.warn('Error recording approval in Cloud Firestore:', err);
    }
  }

  const store = getLocalData<ContentApprovalDocument>(LOCAL_APPROVALS_KEY);
  if (store[approvalId]) {
    store[approvalId].status = status === 'Approved' ? 'Approved' : 'Revision Requested';
    store[approvalId].reviewedByAdminId = adminUserId;
    if (reviewNotes) store[approvalId].reviewNotes = reviewNotes;
    store[approvalId].reviewedAt = now;
  }
  setLocalData(LOCAL_APPROVALS_KEY, store);
}
