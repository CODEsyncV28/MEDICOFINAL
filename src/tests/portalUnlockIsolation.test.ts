import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { canAccessPortal } from '../utils/portalAccess';
import {
  fetchClientsForPractitioner,
  seedDemoClientProfiles,
  updateClientObservationNotes,
} from '../services/practitionerService';
import {
  fetchConsultationsForPractitioner,
  seedDemoConsultations,
  updateConsultationStatus,
} from '../services/consultationService';
import {
  fetchArticlesForAdminModeration,
  fetchArticlesForPractitioner,
  reviewArticleDecision,
  saveOrSubmitArticle,
  seedDemoArticles,
} from '../services/contentService';
import {
  fetchProgramsForAdminApproval,
  fetchProgramsForPractitioner,
  reviewProgramDecision,
  saveOrSubmitProgram,
  seedDemoPrograms,
} from '../services/programService';
import { INITIAL_CLIENTS } from '../data/mockData';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  };
  return store;
}

describe('Portal Unlock & Sandbox RBAC Isolation Tests', () => {
  beforeEach(() => {
    installMockLocalStorage();
  });

  it('1. Unlocks Practitioner and Admin portals in UI Sandbox mode even when Firebase is configured while preserving role distinctions', () => {
    const guestPractitioner = canAccessPortal({
      targetRole: 'practitioner',
      accountRole: null,
      isAuthenticated: false,
      demoPortalEnabled: true,
      isFirebaseConfigured: true,
    });
    assert.equal(guestPractitioner.allowed, true);
    assert.equal(guestPractitioner.isDemoOverride, true);

    const userAdmin = canAccessPortal({
      targetRole: 'admin',
      accountRole: 'user',
      isAuthenticated: true,
      demoPortalEnabled: true,
      isFirebaseConfigured: true,
    });
    assert.equal(userAdmin.allowed, true);
    assert.equal(userAdmin.isDemoOverride, true);

    const realPractitioner = canAccessPortal({
      targetRole: 'practitioner',
      accountRole: 'practitioner',
      isAuthenticated: true,
      demoPortalEnabled: true,
      isFirebaseConfigured: true,
    });
    assert.equal(realPractitioner.allowed, true);
    assert.equal(realPractitioner.isDemoOverride, false);

    const lockedUserAdmin = canAccessPortal({
      targetRole: 'admin',
      accountRole: 'user',
      isAuthenticated: true,
      demoPortalEnabled: false,
      isFirebaseConfigured: true,
    });
    assert.equal(lockedUserAdmin.allowed, false);
  });

  it('2. Forces localStorage isolation across practitioner, consultation, content, and program services when useDemoStorage=true', async () => {
    // Passing a truthy fake Firestore object would throw inside Firebase SDK if resolveActiveDb didn't return null for useDemoStorage=true
    const fakeFirestore = { __mustNotBeUsed: true } as any;

    seedDemoClientProfiles('prac-1', INITIAL_CLIENTS);
    seedDemoConsultations();
    seedDemoArticles();
    seedDemoPrograms();

    const clients = await fetchClientsForPractitioner('prac-1', fakeFirestore, true);
    assert.equal(clients.length, INITIAL_CLIENTS.length);

    const updatedClient = await updateClientObservationNotes(
      clients[0].id,
      'Sandbox isolated note',
      'On Track',
      'prac-1',
      clients[0],
      fakeFirestore,
      true
    );
    assert.equal(updatedClient.practitionerNotes, 'Sandbox isolated note');

    const consults = await fetchConsultationsForPractitioner('prac-1', fakeFirestore, true);
    assert.ok(consults.length >= 1);

    const pendingConsult = consults.find((c) => c.status === 'pending') || consults[0];
    const updatedConsult = await updateConsultationStatus(
      pendingConsult.id,
      {
        status: 'confirmed',
        practitionerId: 'prac-1',
        scheduledTime: '2026-12-10 at 10:00 AM',
        practitionerNotes: 'Sandbox consultation confirmed.',
      },
      fakeFirestore,
      true
    );
    assert.equal(updatedConsult.status, 'confirmed');

    const savedArticle = await saveOrSubmitArticle(
      {
        title: 'Sandbox Herbal Infusion Guide',
        discipline: 'Ayurveda',
        category: 'Lifestyle Education',
        summary: 'Isolated local sandbox guide.',
        authorId: 'prac-1',
        authorName: 'Dr. Ananya Sharma',
        authorQualification: 'BAMS',
        submitForReview: true,
      },
      fakeFirestore,
      true
    );
    const pracArticles = await fetchArticlesForPractitioner('prac-1', fakeFirestore, true);
    assert.ok(pracArticles.some((a) => a.id === savedArticle.id));
    const adminArticles = await fetchArticlesForAdminModeration(fakeFirestore, true);
    assert.ok(adminArticles.some((a) => a.id === savedArticle.id));

    const savedProg = await saveOrSubmitProgram(
      {
        title: 'Sandbox Breath Rhythm Regimen',
        discipline: 'Yoga & Naturopathy',
        category: 'Yoga',
        durationWeeks: 2,
        level: 'Beginner',
        description: 'Isolated local sandbox regimen.',
        creatorPractitionerId: 'prac-1',
        practitionerName: 'Dr. Ananya Sharma',
        practitionerTitle: 'BAMS',
        submitForReview: true,
      },
      fakeFirestore,
      true
    );
    const pracPrograms = await fetchProgramsForPractitioner('prac-1', fakeFirestore, true);
    assert.ok(pracPrograms.some((p) => p.id === savedProg.id));
    const adminPrograms = await fetchProgramsForAdminApproval(fakeFirestore, true);
    assert.ok(adminPrograms.some((p) => p.id === savedProg.id));
  });

  it('3. Rejects non-admin roles on governance moderation decisions even in demo storage', async () => {
    const art = await saveOrSubmitArticle(
      {
        title: 'RBAC Guarded Article',
        discipline: 'Ayurveda',
        category: 'Nutrition',
        summary: 'Must require admin role for approval.',
        authorId: 'prac-1',
        authorName: 'Dr. Ananya Sharma',
        authorQualification: 'BAMS',
        submitForReview: true,
      },
      undefined,
      true
    );

    const prog = await saveOrSubmitProgram(
      {
        title: 'RBAC Guarded Regimen',
        discipline: 'Ayurveda',
        category: 'Lifestyle Education',
        durationWeeks: 2,
        level: 'Beginner',
        description: 'Must require admin role for approval.',
        creatorPractitionerId: 'prac-1',
        practitionerName: 'Dr. Ananya Sharma',
        practitionerTitle: 'BAMS',
        submitForReview: true,
      },
      undefined,
      true
    );

    await assert.rejects(
      () =>
        reviewArticleDecision(
          {
            articleId: art.id,
            decision: 'published',
            reviewerId: 'ordinary_user_1',
            reviewerRole: 'user',
          },
          undefined,
          true
        ),
      /administrator governance privileges/i
    );

    await assert.rejects(
      () =>
        reviewProgramDecision(
          {
            programId: prog.id,
            decision: 'published',
            reviewerId: 'prac-1',
            reviewerRole: 'practitioner',
          },
          undefined,
          true
        ),
      /administrator governance privileges/i
    );
  });

  it('4. Ensures AdminDashboard hides privileged status badges in demo mode and App.tsx isolates reviewerId', () => {
    const adminSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/dashboard/AdminDashboard.tsx'),
      'utf8'
    );
    assert.ok(adminSource.includes('{!isDemoMode ? ('));
    assert.ok(adminSource.includes('Admin Authorization Required for Live Governance'));

    const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    assert.ok(appSource.includes("userProfile?.role === 'admin' && firebaseUser"));
    assert.ok(appSource.includes(": 'admin_demo_governance'"));
  });
});
