import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * High-fidelity test harness modeling the exact semantic rules in firestore.rules.
 * Tests evaluate permission decisions against the exact same logic and constraints.
 */
interface AuthContext {
  uid: string | null;
}

interface DatabaseState {
  users: Record<string, Record<string, any>>;
  clientProfiles: Record<string, Record<string, any>>;
  assessments: Record<string, Record<string, any>>;
  dailyActivities: Record<string, Record<string, any>>;
  wellnessPrograms: Record<string, Record<string, any>>;
  educationalArticles: Record<string, Record<string, any>>;
  practitioners: Record<string, Record<string, any>>;
  consultations: Record<string, Record<string, any>>;
  contentApprovals: Record<string, Record<string, any>>;
}

interface RequestContext {
  auth: AuthContext | null;
  resource?: { data: Record<string, any> };
  requestResource?: { data: Record<string, any> };
}

class FirestoreRulesEngine {
  constructor(private db: DatabaseState) {}

  // Helper functions directly mirroring firestore.rules
  private isSignedIn(ctx: RequestContext): boolean {
    return ctx.auth !== null && ctx.auth.uid !== null;
  }

  private isOwner(ctx: RequestContext, userId: string): boolean {
    return this.isSignedIn(ctx) && ctx.auth?.uid === userId;
  }

  private userDocExists(uid: string): boolean {
    return Boolean(this.db.users[uid]);
  }

  private getUserData(uid: string): Record<string, any> {
    return this.db.users[uid] || {};
  }

  private isAdmin(ctx: RequestContext): boolean {
    if (!this.isSignedIn(ctx)) return false;
    const uid = ctx.auth!.uid!;
    return (
      this.userDocExists(uid) &&
      'role' in this.getUserData(uid) &&
      this.getUserData(uid).role === 'admin'
    );
  }

  private isPractitioner(ctx: RequestContext): boolean {
    if (!this.isSignedIn(ctx)) return false;
    const uid = ctx.auth!.uid!;
    return (
      this.userDocExists(uid) &&
      'role' in this.getUserData(uid) &&
      this.getUserData(uid).role === 'practitioner'
    );
  }

  private isAssignedPractitioner(ctx: RequestContext, clientUid: string): boolean {
    if (!this.isPractitioner(ctx)) return false;
    const clientData = this.db.clientProfiles[clientUid];
    if (!clientData) return false;
    if (!('assignedPractitionerId' in clientData)) return false;
    if (clientData.assignedPractitionerId === null) return false;
    return clientData.assignedPractitionerId === ctx.auth?.uid;
  }

  private hasOnly(diffKeys: string[], allowed: string[]): boolean {
    return diffKeys.every((k) => allowed.includes(k));
  }

  private getDiffKeys(before: Record<string, any>, after: Record<string, any>): string[] {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changed: string[] = [];
    for (const k of keys) {
      if (before[k] !== after[k]) {
        changed.push(k);
      }
    }
    return changed;
  }

  // --- Collection rule evaluations ---

  // 1. Users collection
  canUpdateUser(ctx: RequestContext, targetUserId: string): boolean {
    if (this.isAdmin(ctx)) return true;
    if (!this.isOwner(ctx, targetUserId)) return false;

    const before = ctx.resource?.data || {};
    const after = ctx.requestResource?.data || {};
    const diff = this.getDiffKeys(before, after);

    return this.hasOnly(diff, [
      'displayName',
      'avatarUrl',
      'prakritiBaseline',
      'agreedToTerms',
      'reminderPreferences',
      'updatedAt',
      'updatedAtServer',
    ]);
  }

  canReadUser(ctx: RequestContext, targetUserId: string): boolean {
    return this.isOwner(ctx, targetUserId) || this.isAdmin(ctx);
  }

  // 2. ClientProfiles collection
  canReadClientProfile(ctx: RequestContext, targetUserId: string): boolean {
    return (
      this.isOwner(ctx, targetUserId) ||
      this.isAdmin(ctx) ||
      this.isAssignedPractitioner(ctx, targetUserId)
    );
  }

  // 3. Assessments collection
  canReadAssessment(ctx: RequestContext, assessmentId: string): boolean {
    if (!this.isSignedIn(ctx)) return false;
    const res = ctx.resource?.data;
    if (!res) return false;
    return (
      res.userId === ctx.auth?.uid ||
      this.isAdmin(ctx) ||
      this.isAssignedPractitioner(ctx, res.userId)
    );
  }

  canCreateAssessment(ctx: RequestContext, assessmentId: string): boolean {
    if (!this.isSignedIn(ctx)) return false;
    const after = ctx.requestResource?.data;
    if (!after) return false;
    return (
      assessmentId === `assess_${ctx.auth?.uid}` &&
      after.userId === ctx.auth?.uid
    );
  }

  // 4. Consultations collection
  canUpdateConsultation(ctx: RequestContext, _consultationId: string): boolean {
    if (this.isAdmin(ctx)) return true;
    if (!this.isSignedIn(ctx)) return false;

    const before = ctx.resource?.data || {};
    const after = ctx.requestResource?.data || {};
    const diff = this.getDiffKeys(before, after);
    const terminal = ['rejected', 'completed', 'cancelled'];
    if (terminal.includes(before.status)) return false;

    // Normal user branch
    if (
      before.userId === ctx.auth?.uid &&
      after.userId === before.userId &&
      after.practitionerId === before.practitionerId
    ) {
      const safeUserKeys =
        before.status === 'pending'
          ? ['preferredSlot', 'preferredDate', 'topic', 'topicLabel', 'notes', 'status', 'updatedAt', 'updatedAtServer']
          : ['notes', 'status', 'scheduledTime', 'updatedAt', 'updatedAtServer'];
      const keysAllowed = this.hasOnly(diff, safeUserKeys);
      const statusAllowed = after.status === before.status || after.status === 'cancelled';
      if (keysAllowed && statusAllowed) return true;
    }

    // Practitioner branch
    if (
      this.isPractitioner(ctx) &&
      before.practitionerId === ctx.auth?.uid &&
      after.userId === before.userId &&
      after.practitionerId === before.practitionerId
    ) {
      const safePractitionerKeys = ['status', 'scheduledTime', 'practitionerNotes', 'updatedAt', 'updatedAtServer'];
      const keysAllowed = this.hasOnly(diff, safePractitionerKeys);
      const transitionAllowed =
        (before.status === 'pending' && ['confirmed', 'rescheduled', 'rejected', 'cancelled'].includes(after.status)) ||
        (['confirmed', 'rescheduled'].includes(before.status) && ['confirmed', 'rescheduled', 'completed', 'cancelled'].includes(after.status));
      if (keysAllowed && transitionAllowed) return true;
    }

    return false;
  }

  // 5. Educational Articles
  canCreateArticle(ctx: RequestContext): boolean {
    if (!this.isSignedIn(ctx)) return false;
    const isAuthor = ctx.requestResource?.data?.authorId === ctx.auth?.uid;
    if (!isAuthor) return false;

    if (this.isAdmin(ctx)) return true;

    if (this.isPractitioner(ctx)) {
      const status = ctx.requestResource?.data?.status;
      return status === 'draft' || status === 'pending_approval';
    }

    return false;
  }

  canUpdateArticle(ctx: RequestContext): boolean {
    if (this.isAdmin(ctx)) return true;
    if (!this.isSignedIn(ctx)) return false;

    const before = ctx.resource?.data || {};
    const after = ctx.requestResource?.data || {};

    if (
      this.isPractitioner(ctx) &&
      before.authorId === ctx.auth?.uid &&
      after.authorId === ctx.auth?.uid &&
      ['draft', 'pending_approval'].includes(after.status) &&
      before.status !== 'published'
    ) {
      return true;
    }

    return false;
  }

  // 6. Content Approvals
  canUpdateContentApproval(ctx: RequestContext): boolean {
    return this.isAdmin(ctx);
  }

  // 7. AI Conversations (/aiConversations/{conversationId}) — strictly owner-only
  canReadAIConversation(ctx: RequestContext): boolean {
    if (!this.isSignedIn(ctx)) return false;
    return ctx.resource?.data?.userId === ctx.auth?.uid;
  }

  canCreateAIConversation(ctx: RequestContext, conversationId: string): boolean {
    if (!this.isSignedIn(ctx)) return false;
    const after = ctx.requestResource?.data;
    if (!after) return false;
    return after.id === conversationId && after.userId === ctx.auth?.uid;
  }

  // 8. Practitioner self-update for consultation details
  canUpdatePractitionerProfile(ctx: RequestContext): boolean {
    if (this.isAdmin(ctx)) return true;
    if (!this.isSignedIn(ctx)) return false;
    const before = ctx.resource?.data || {};
    const after = ctx.requestResource?.data || {};
    if (before.userId !== ctx.auth?.uid) return false;
    if (after.userId !== before.userId || after.id !== before.id || after.isVerified !== before.isVerified) {
      return false;
    }
    const diff = this.getDiffKeys(before, after);
    return this.hasOnly(diff, [
      'bio',
      'specialization',
      'nextAvailableSlot',
      'consultationFee',
      'consultationCurrency',
      'consultationFormat',
      'location',
      'languages',
      'photoUrl',
      'updatedAt',
      'updatedAtServer',
    ]);
  }
}

// ============================================================================
// TEST SUITE: 10 SPECIFIED VERIFICATION SCENARIOS
// ============================================================================

describe('Firestore Security Rules Verification Suite', () => {
  const initialDb: DatabaseState = {
    users: {
      user_123: {
        uid: 'user_123',
        role: 'user',
        isActive: true,
        displayName: 'Aarav Sharma',
        assignedPractitionerId: 'dr_ayurveda_1',
      },
      user_unassigned: {
        uid: 'user_unassigned',
        role: 'user',
        isActive: true,
        displayName: 'Pooja Patel',
        assignedPractitionerId: null,
      },
      dr_ayurveda_1: {
        uid: 'dr_ayurveda_1',
        role: 'practitioner',
        isActive: true,
        displayName: 'Dr. Priya Varma',
      },
      dr_other: {
        uid: 'dr_other',
        role: 'practitioner',
        isActive: true,
        displayName: 'Dr. Rajesh Nair',
      },
      admin_root: {
        uid: 'admin_root',
        role: 'admin',
        isActive: true,
        displayName: 'Chief Governance Officer',
      },
    },
    clientProfiles: {
      user_123: {
        userId: 'user_123',
        clientName: 'Aarav Sharma',
        assignedPractitionerId: 'dr_ayurveda_1',
        primaryGoal: 'Stress Management',
      },
    },
    assessments: {},
    dailyActivities: {},
    wellnessPrograms: {},
    educationalArticles: {},
    practitioners: {},
    consultations: {},
    contentApprovals: {},
  };

  const engine = new FirestoreRulesEngine(initialDb);

  // Test 1: Normal user attempting to change their role
  it('1. Normal user attempting to change their role must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'user_123' },
      resource: { data: { ...initialDb.users.user_123 } },
      requestResource: { data: { ...initialDb.users.user_123, role: 'admin' } },
    };
    const allowed = engine.canUpdateUser(ctx, 'user_123');
    assert.strictEqual(allowed, false, 'Security rule must block privilege escalation to admin');
  });

  // Test 2: Normal user attempting to change assignedPractitionerId
  it('2. Normal user attempting to change assignedPractitionerId must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'user_123' },
      resource: { data: { ...initialDb.users.user_123 } },
      requestResource: {
        data: { ...initialDb.users.user_123, assignedPractitionerId: 'dr_other' },
      },
    };
    const allowed = engine.canUpdateUser(ctx, 'user_123');
    assert.strictEqual(allowed, false, 'Security rule must block user from modifying assignedPractitionerId');
  });

  // Test 3: Normal user attempting to change isActive
  it('3. Normal user attempting to change isActive must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'user_123' },
      resource: { data: { ...initialDb.users.user_123 } },
      requestResource: { data: { ...initialDb.users.user_123, isActive: false } },
    };
    const allowed = engine.canUpdateUser(ctx, 'user_123');
    assert.strictEqual(allowed, false, 'Security rule must block user from altering isActive');
  });

  // Test 4: Practitioner reading an assigned client's permitted profile
  it('4. Practitioner reading an assigned client permitted profile must be ALLOWED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'dr_ayurveda_1' },
      resource: { data: initialDb.clientProfiles.user_123 },
    };
    const allowed = engine.canReadClientProfile(ctx, 'user_123');
    assert.strictEqual(allowed, true, 'Assigned practitioner must be permitted to read clientProfile');
  });

  // Test 5: Practitioner reading an unassigned client's records
  it('5. Practitioner reading an unassigned client records must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'dr_other' }, // Dr. Other is not assigned to user_123
      resource: { data: initialDb.clientProfiles.user_123 },
    };
    const allowed = engine.canReadClientProfile(ctx, 'user_123');
    assert.strictEqual(allowed, false, 'Unassigned practitioner must be denied reading records');
  });

  // Test 6: User accessing another user's assessment
  it('6. User accessing another user assessment must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'user_unassigned' },
      resource: {
        data: {
          id: 'assess_user_123',
          userId: 'user_123',
          answers: { q1: 'gradual' },
        },
      },
    };
    const allowed = engine.canReadAssessment(ctx, 'assess_user_123');
    assert.strictEqual(allowed, false, 'Unrelated user must be blocked from reading another assessment');
  });

  // Test 7: User changing consultation administrative fields
  it('7. User changing consultation administrative fields (e.g. status to confirmed) must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'user_123' },
      resource: {
        data: {
          id: 'consult_1',
          userId: 'user_123',
          practitionerId: 'dr_ayurveda_1',
          status: 'pending',
          preferredSlot: 'morning',
        },
      },
      requestResource: {
        data: {
          id: 'consult_1',
          userId: 'user_123',
          practitionerId: 'dr_ayurveda_1',
          status: 'confirmed', // Attempting to self-confirm consultation
          scheduledTime: '2026-11-10T10:00:00Z',
          preferredSlot: 'morning',
        },
      },
    };
    const allowed = engine.canUpdateConsultation(ctx, 'consult_1');
    assert.strictEqual(allowed, false, 'User must not be able to self-confirm consultations or set scheduled times');
  });

  // Test 8: Practitioner publishing an unapproved article
  it('8. Practitioner publishing an unapproved article directly must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'dr_ayurveda_1' },
      requestResource: {
        data: {
          authorId: 'dr_ayurveda_1',
          title: 'Unreviewed Dinacharya Protocol',
          status: 'published', // Attempting to bypass admin review
        },
      },
    };
    const allowed = engine.canCreateArticle(ctx);
    assert.strictEqual(allowed, false, 'Practitioner must not be able to publish articles without admin approval');
  });

  // Test 9: Admin approving an article
  it('9. Admin approving an article must be ALLOWED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'admin_root' },
      resource: {
        data: {
          authorId: 'dr_ayurveda_1',
          title: 'Ayurvedic Principles of Chronobiology',
          status: 'pending_approval',
        },
      },
      requestResource: {
        data: {
          authorId: 'dr_ayurveda_1',
          title: 'Ayurvedic Principles of Chronobiology',
          status: 'published',
          reviewedByAdminId: 'admin_root',
        },
      },
    };
    const allowed = engine.canUpdateArticle(ctx);
    assert.strictEqual(allowed, true, 'Admin must be permitted to approve and publish articles');
  });

  // Test 10: User attempting to approve their own content
  it('10. User attempting to approve their own content must be DENIED', () => {
    const ctx: RequestContext = {
      auth: { uid: 'dr_ayurveda_1' }, // author
      resource: {
        data: {
          id: 'approval_1',
          submittedByAuthorId: 'dr_ayurveda_1',
          status: 'Pending Review',
        },
      },
      requestResource: {
        data: {
          id: 'approval_1',
          submittedByAuthorId: 'dr_ayurveda_1',
          status: 'Approved',
        },
      },
    };
    const allowed = engine.canUpdateContentApproval(ctx);
    assert.strictEqual(allowed, false, 'Author must not be able to update content approval queue');
  });

  // Test 11: Rejected consultations are terminal and cannot be reopened
  it('11. Rejected consultations are terminal and cannot be reopened by practitioner or seeker', () => {
    const reopenCtx: RequestContext = {
      auth: { uid: 'dr_ayurveda_1' },
      resource: {
        data: {
          id: 'consult_rej',
          userId: 'user_123',
          practitionerId: 'dr_ayurveda_1',
          status: 'rejected',
          scheduledTime: null,
        },
      },
      requestResource: {
        data: {
          id: 'consult_rej',
          userId: 'user_123',
          practitionerId: 'dr_ayurveda_1',
          status: 'confirmed',
          scheduledTime: '2026-12-01T10:00:00Z',
        },
      },
    };
    assert.strictEqual(engine.canUpdateConsultation(reopenCtx, 'consult_rej'), false);

    const pendingToCompletedCtx: RequestContext = {
      auth: { uid: 'dr_ayurveda_1' },
      resource: {
        data: {
          id: 'consult_pend',
          userId: 'user_123',
          practitionerId: 'dr_ayurveda_1',
          status: 'pending',
          scheduledTime: null,
        },
      },
      requestResource: {
        data: {
          id: 'consult_pend',
          userId: 'user_123',
          practitionerId: 'dr_ayurveda_1',
          status: 'completed',
          scheduledTime: null,
        },
      },
    };
    assert.strictEqual(engine.canUpdateConsultation(pendingToCompletedCtx, 'consult_pend'), false);
  });

  // Test 12: Owner updating their own reminderPreferences is allowed; another user is denied
  it('12. Owner updating reminderPreferences is ALLOWED while another user is DENIED', () => {
    const validOwnerCtx: RequestContext = {
      auth: { uid: 'user_123' },
      resource: { data: { ...initialDb.users.user_123 } },
      requestResource: {
        data: {
          ...initialDb.users.user_123,
          reminderPreferences: {
            remindersEnabled: true,
            intervalMinutes: 30,
            waterRemindersEnabled: true,
            waterIntervalMinutes: 60,
            quietHoursEnabled: true,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
            inAppNotificationsEnabled: true,
            browserNotificationsEnabled: false,
            updatedAt: '2026-11-27T06:00:00Z',
          },
        },
      },
    };
    assert.strictEqual(engine.canUpdateUser(validOwnerCtx, 'user_123'), true);

    const otherUserCtx: RequestContext = {
      ...validOwnerCtx,
      auth: { uid: 'user_unassigned' },
    };
    assert.strictEqual(engine.canUpdateUser(otherUserCtx, 'user_123'), false);
  });

  // Test 13: AI Conversations are strictly owner-only (denied for practitioners & other users)
  it('13. AI Companion conversations are readable only by owner and denied to practitioners and other seekers', () => {
    const convDoc = {
      id: 'conv_user_123',
      userId: 'user_123',
      hasAssessmentConsent: true,
      messages: [],
      createdAt: '2026-11-27T06:00:00Z',
      updatedAt: '2026-11-27T06:00:00Z',
    };

    assert.strictEqual(
      engine.canReadAIConversation({ auth: { uid: 'user_123' }, resource: { data: convDoc } }),
      true
    );
    assert.strictEqual(
      engine.canReadAIConversation({ auth: { uid: 'dr_ayurveda_1' }, resource: { data: convDoc } }),
      false,
      'Assigned practitioner must not read private AI conversations by default'
    );
    assert.strictEqual(
      engine.canReadAIConversation({ auth: { uid: 'user_unassigned' }, resource: { data: convDoc } }),
      false
    );
    assert.strictEqual(
      engine.canCreateAIConversation(
        { auth: { uid: 'user_unassigned' }, requestResource: { data: convDoc } },
        'conv_user_123'
      ),
      false
    );
  });

  // Test 14: Practitioner can update own consultation fee/format/location/languages but cannot self-verify
  it('14. Practitioner can update own consultation details but cannot alter isVerified', () => {
    const beforePrac = {
      id: 'dr_ayurveda_1',
      userId: 'dr_ayurveda_1',
      name: 'Dr. Priya Varma',
      qualification: 'BAMS, MD',
      councilRegistration: 'CCIM-123',
      isVerified: true,
      bio: 'Classical Dinacharya',
      specialization: 'Sleep & Digestion',
      nextAvailableSlot: 'Tomorrow 10 AM',
    };

    assert.strictEqual(
      engine.canUpdatePractitionerProfile({
        auth: { uid: 'dr_ayurveda_1' },
        resource: { data: beforePrac },
        requestResource: {
          data: {
            ...beforePrac,
            consultationFee: 600,
            consultationCurrency: 'INR',
            consultationFormat: 'both',
            location: 'Bengaluru',
            languages: ['English', 'Hindi'],
          },
        },
      }),
      true
    );

    assert.strictEqual(
      engine.canUpdatePractitionerProfile({
        auth: { uid: 'dr_ayurveda_1' },
        resource: { data: beforePrac },
        requestResource: {
          data: {
            ...beforePrac,
            isVerified: false,
          },
        },
      }),
      false
    );
  });
});
