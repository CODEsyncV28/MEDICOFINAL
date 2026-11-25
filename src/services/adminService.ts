import { ContentApprovalDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const LOCAL_APPROVALS_KEY = 'ayush_approvals_store';
export const LOCAL_AUDIT_LOG_KEY = 'ayush_governance_audit_store';
export const SEEDED_AUDIT_FLAG_KEY = 'ayush_governance_audit_demo_seeded';

const memoryStore = new Map<string, string>();

function hasBrowserStorage(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function getLocalData<T>(key: string): Record<string, T> {
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

function setLocalData<T>(key: string, data: Record<string, T>): void {
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

function getLocalList<T>(key: string): T[] {
  try {
    const raw = hasBrowserStorage()
      ? window.localStorage.getItem(key)
      : memoryStore.get(key) ?? null;
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    const raw = memoryStore.get(key) ?? null;
    return raw ? (JSON.parse(raw) as T[]) : [];
  }
}

function setLocalList<T>(key: string, data: T[]): void {
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

export interface GovernanceAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  adminId: string;
  adminName: string;
  type: 'content' | 'credential' | 'program' | 'system';
  status: 'Approved' | 'Rejected' | 'Revision' | 'Enforced';
  notes?: string;
  isSimulated?: boolean;
}

export function seedDemoAuditLog(): GovernanceAuditEntry[] {
  if (getFlag(SEEDED_AUDIT_FLAG_KEY)) {
    return getLocalList<GovernanceAuditEntry>(LOCAL_AUDIT_LOG_KEY);
  }

  const existing = getLocalList<GovernanceAuditEntry>(LOCAL_AUDIT_LOG_KEY);
  if (existing.length === 0) {
    const seedEntries: GovernanceAuditEntry[] = [
      {
        id: 'log-1',
        timestamp: '2026-11-05T08:30:00.000Z',
        action: 'Verified Statutory Practitioner License',
        target: 'Dr. K. Senthil Kumar (BSMS, Tamil Nadu Siddha Council)',
        adminId: 'admin_demo_seed',
        adminName: 'Platform Governance Admin',
        type: 'credential',
        status: 'Approved',
        isSimulated: true,
      },
      {
        id: 'log-2',
        timestamp: '2026-11-04T16:15:00.000Z',
        action: 'Approved Educational Article for Public Catalog',
        target: 'Understanding Prakriti: Your Unique Constitutional Blueprint',
        adminId: 'admin_demo_seed',
        adminName: 'Platform Governance Admin',
        type: 'content',
        status: 'Approved',
        isSimulated: true,
      },
      {
        id: 'log-3',
        timestamp: '2026-11-03T14:40:00.000Z',
        action: 'Rejected Non-Compliant Licensure Application',
        target: 'Dr. Aris Thorne (Unaccredited Distance Diploma)',
        adminId: 'admin_demo_seed',
        adminName: 'Platform Governance Admin',
        type: 'credential',
        status: 'Rejected',
        isSimulated: true,
      },
      {
        id: 'log-4',
        timestamp: '2026-11-02T11:10:00.000Z',
        action: 'Requested Revision for Medicinal Dosage Disclaimer',
        target: 'Guidance on Seasonal Herbal Teas for Autumn Transition',
        adminId: 'admin_demo_seed',
        adminName: 'Platform Governance Admin',
        type: 'content',
        status: 'Revision',
        isSimulated: true,
      },
    ];
    setLocalList(LOCAL_AUDIT_LOG_KEY, seedEntries);
  }

  setFlag(SEEDED_AUDIT_FLAG_KEY);
  return getLocalList<GovernanceAuditEntry>(LOCAL_AUDIT_LOG_KEY);
}

export async function fetchGovernanceAuditLog(): Promise<GovernanceAuditEntry[]> {
  return getLocalList<GovernanceAuditEntry>(LOCAL_AUDIT_LOG_KEY);
}

export async function appendGovernanceAuditLog(
  entry: Omit<GovernanceAuditEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<GovernanceAuditEntry> {
  const created: GovernanceAuditEntry = {
    id: entry.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    action: entry.action,
    target: entry.target,
    adminId: entry.adminId,
    adminName: entry.adminName,
    type: entry.type,
    status: entry.status,
    notes: entry.notes,
    isSimulated: entry.isSimulated ?? false,
  };
  const current = getLocalList<GovernanceAuditEntry>(LOCAL_AUDIT_LOG_KEY);
  const next = [created, ...current];
  setLocalList(LOCAL_AUDIT_LOG_KEY, next);
  return created;
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
