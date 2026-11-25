import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCAL_ARTICLES_KEY,
  fetchArticlesForAdminModeration,
  fetchArticlesForPractitioner,
  reviewArticleDecision,
  saveOrSubmitArticle,
  seedDemoArticles,
} from '../services/contentService';
import {
  LOCAL_PROGRAMS_KEY,
  fetchProgramsForAdminApproval,
  fetchProgramsForPractitioner,
  reviewProgramDecision,
  saveOrSubmitProgram,
  seedDemoPrograms,
} from '../services/programService';
import {
  LOCAL_AUDIT_LOG_KEY,
  appendGovernanceAuditLog,
  fetchGovernanceAuditLog,
  seedDemoAuditLog,
} from '../services/adminService';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };

  (globalThis as any).window = { localStorage: mockLocalStorage };
  return store;
}

describe('Phase 4.4B.2: Practitioner to Admin Content & Programme Integration', () => {
  let backingStore: Map<string, string>;

  beforeEach(() => {
    backingStore = installMockLocalStorage();
  });

  it('1. Saves article drafts persistently and excludes private drafts from Admin moderation queue', async () => {
    const draft = await saveOrSubmitArticle({
      title: 'Morning Warm Water & Tongue Scraping',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      readTime: '4 min read',
      summary: 'Non-diagnostic guide to gentle oral cleansing upon waking.',
      fullContent: 'Begin the morning with warm water and gentle copper tongue scraping.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: false,
    });

    assert.ok(draft.id.startsWith('art_'));
    assert.equal(draft.status, 'draft');
    assert.equal(draft.submittedAt, null);
    assert.equal(draft.isSimulated, false);

    // Practitioner sees their draft
    const pracArticles = await fetchArticlesForPractitioner('prac-1');
    assert.equal(pracArticles.length, 1);
    assert.equal(pracArticles[0].id, draft.id);
    assert.equal(pracArticles[0].status, 'draft');

    // Admin moderation queue must NOT show unsubmitted drafts
    const adminQueue = await fetchArticlesForAdminModeration();
    assert.equal(adminQueue.some((a) => a.id === draft.id), false);
  });

  it('2. Submits articles with unique ID and timestamp, and edits update in place without duplicates', async () => {
    const draft = await saveOrSubmitArticle({
      title: 'Evening Digital Curfew Guide',
      discipline: 'Yoga & Naturopathy',
      category: 'Meditation',
      summary: 'Dimming lights 60 minutes prior to sleep to support melatonin cadence.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: false,
    });

    const submitted = await saveOrSubmitArticle({
      id: draft.id,
      title: 'Evening Digital Curfew & Trataka Guide',
      discipline: 'Yoga & Naturopathy',
      category: 'Meditation',
      summary: 'Updated guide covering amber lighting and Trataka breath calming.',
      fullContent: 'Practice two minutes of steady candle or horizon gazing before rest.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    assert.equal(submitted.id, draft.id);
    assert.equal(submitted.status, 'pending_approval');
    assert.ok(submitted.submittedAt);

    // Must still only be 1 record for this practitioner (no duplicate created)
    const pracArticles = await fetchArticlesForPractitioner('prac-1');
    assert.equal(pracArticles.length, 1);
    assert.equal(pracArticles[0].title, 'Evening Digital Curfew & Trataka Guide');

    // Admin queue now shows the submitted article
    const adminQueue = await fetchArticlesForAdminModeration();
    assert.equal(adminQueue.length, 1);
    assert.equal(adminQueue[0].id, draft.id);
    assert.equal(adminQueue[0].status, 'pending_approval');
  });

  it('3. Persists Admin article approval and revision decisions with reviewer metadata and blocks self-approval', async () => {
    const submitted = await saveOrSubmitArticle({
      title: 'Seasonal Coriander & Cumin Tea Guide',
      discipline: 'Ayurveda',
      category: 'Nutrition',
      summary: 'Culinary herbal infusion supporting comfortable midday digestion.',
      fullContent: 'Steep half a teaspoon of roasted cumin and coriander seeds.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    // Non-admin role cannot approve
    await assert.rejects(
      () =>
        reviewArticleDecision({
          articleId: submitted.id,
          decision: 'published',
          reviewerId: 'user-99',
          reviewerRole: 'practitioner',
        }),
      /administrator governance privileges/i
    );

    // Author cannot self-approve even if role check is bypassed
    await assert.rejects(
      () =>
        reviewArticleDecision({
          articleId: submitted.id,
          decision: 'published',
          reviewerId: 'prac-1',
          reviewerRole: 'admin',
        }),
      /cannot approve or review their own/i
    );

    // Admin requests revision with explicit feedback
    const revisionRequested = await reviewArticleDecision({
      articleId: submitted.id,
      decision: 'revision_requested',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Add note distinguishing culinary tea from medicinal decoctions.',
    });

    assert.equal(revisionRequested.status, 'revision_requested');
    assert.equal(revisionRequested.reviewedByAdminId, 'admin_gov_1');
    assert.ok(revisionRequested.reviewedAt);
    assert.equal(revisionRequested.publishedAt, null);
    assert.equal(
      revisionRequested.reviewNotes,
      'Add note distinguishing culinary tea from medicinal decoctions.'
    );

    // Admin approves after verification
    const approved = await reviewArticleDecision({
      articleId: submitted.id,
      decision: 'published',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Dosage disclaimer verified; approved for catalog.',
    });
    assert.equal(approved.status, 'published');
    assert.ok(approved.publishedAt);
    assert.equal(approved.reviewedByAdminId, 'admin_gov_1');
  });

  it('4. Creates and edits wellness programmes persistently in Draft or Pending Approval without direct publishing', async () => {
    const draftProg = await saveOrSubmitProgram({
      title: '14-Day Gentle Digestive Reset',
      discipline: 'Ayurveda',
      category: 'Nutrition',
      durationWeeks: 2,
      level: 'Beginner',
      description: 'Mindful meal spacing, warm spiced water, and early light dinners.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: false,
    });

    assert.ok(draftProg.id.startsWith('prog_'));
    assert.equal(draftProg.status, 'draft');
    assert.equal(draftProg.isPublished, false);
    assert.equal(draftProg.totalSessions, 8);

    // Draft is hidden from Admin queue until submitted
    assert.equal((await fetchProgramsForAdminApproval()).length, 0);

    // Edit & submit for Admin approval updates same ID
    const submittedProg = await saveOrSubmitProgram({
      id: draftProg.id,
      title: '21-Day Gentle Digestive Reset',
      discipline: 'Ayurveda',
      category: 'Nutrition',
      durationWeeks: 3,
      level: 'Intermediate',
      description: 'Expanded 3-week mindful digestion and circadian meal timing curriculum.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    assert.equal(submittedProg.id, draftProg.id);
    assert.equal(submittedProg.status, 'pending_approval');
    assert.equal(submittedProg.isPublished, false);
    assert.equal(submittedProg.totalSessions, 12);
    assert.ok(submittedProg.submittedAt);

    const pracPrograms = await fetchProgramsForPractitioner('prac-1');
    assert.equal(pracPrograms.length, 1);
    assert.equal(pracPrograms[0].title, '21-Day Gentle Digestive Reset');
  });

  it('5. Persists Admin programme Approve & Publish and Request Revision decisions', async () => {
    const prog = await saveOrSubmitProgram({
      title: 'Restorative Pranayama Foundations',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      durationWeeks: 4,
      level: 'Beginner',
      description: 'Slow diaphragmatic and Nadi Shodhana breath progression.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    // Self-approval blocked
    await assert.rejects(
      () =>
        reviewProgramDecision({
          programId: prog.id,
          decision: 'published',
          reviewerId: 'prac-1',
          reviewerRole: 'admin',
        }),
      /cannot approve their own/i
    );

    const approved = await reviewProgramDecision({
      programId: prog.id,
      decision: 'published',
      reviewerId: 'admin_gov_2',
      reviewerRole: 'admin',
      reviewNotes: 'Approved for public wellness curriculum.',
    });

    assert.equal(approved.status, 'published');
    assert.equal(approved.isPublished, true);
    assert.equal(approved.reviewedByAdminId, 'admin_gov_2');
    assert.ok(approved.reviewedAt);
    assert.equal(approved.reviewNotes, 'Approved for public wellness curriculum.');

    const adminPrograms = await fetchProgramsForAdminApproval();
    assert.equal(adminPrograms.length, 1);
    assert.equal(adminPrograms[0].isPublished, true);
  });

  it('6. Returns Admin revision feedback to Practitioner workspace and supports resubmission', async () => {
    const art = await saveOrSubmitArticle({
      title: 'Herbal Steam Inhalation Wellness Guide',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      summary: 'Gentle respiratory comfort using eucalyptus and ajwain steam.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    const prog = await saveOrSubmitProgram({
      title: 'Winter Joint Mobility Routine',
      discipline: 'Siddha',
      category: 'Yoga',
      durationWeeks: 3,
      level: 'Beginner',
      description: 'Gentle joint rotations and warm sesame self-massage.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    await reviewArticleDecision({
      articleId: art.id,
      decision: 'revision_requested',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Specify safe water temperature and eye-closure precaution.',
    });

    await reviewProgramDecision({
      programId: prog.id,
      decision: 'revision_requested',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Add disclaimer advising consultation before acute joint swelling.',
    });

    const pracArts = await fetchArticlesForPractitioner('prac-1');
    const pracProgs = await fetchProgramsForPractitioner('prac-1');
    assert.equal(pracArts[0].status, 'revision_requested');
    assert.equal(
      pracArts[0].reviewNotes,
      'Specify safe water temperature and eye-closure precaution.'
    );
    assert.equal(pracProgs[0].status, 'revision_requested');
    assert.equal(pracProgs[0].isPublished, false);
    assert.equal(
      pracProgs[0].reviewNotes,
      'Add disclaimer advising consultation before acute joint swelling.'
    );

    // Practitioner edits and resubmits both
    const resubmittedArt = await saveOrSubmitArticle({
      id: art.id,
      title: art.title,
      discipline: art.discipline,
      category: art.category,
      summary: `${art.summary} Keep eyes closed and maintain safe distance from steam.`,
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });
    assert.equal(resubmittedArt.id, art.id);
    assert.equal(resubmittedArt.status, 'pending_approval');

    const resubmittedProg = await saveOrSubmitProgram({
      id: prog.id,
      title: prog.title,
      discipline: prog.discipline,
      category: prog.category,
      durationWeeks: prog.durationWeeks,
      level: prog.level,
      description: `${prog.description} Not intended for acute inflammatory flare-ups.`,
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });
    assert.equal(resubmittedProg.id, prog.id);
    assert.equal(resubmittedProg.status, 'pending_approval');
  });

  it('7. Isolates articles and programmes strictly between different practitioners', async () => {
    const p1Art = await saveOrSubmitArticle({
      title: 'Practitioner 1 Private Draft',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      summary: 'Draft authored solely by practitioner 1.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS',
      submitForReview: false,
    });

    const p2Art = await saveOrSubmitArticle({
      title: 'Practitioner 2 Breath Article',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      summary: 'Submitted solely by practitioner 2.',
      authorId: 'prac-2',
      authorName: 'Acharya Rajesh Verma',
      authorQualification: 'M.Sc Yoga',
      submitForReview: true,
    });

    const p1Prog = await saveOrSubmitProgram({
      title: 'Practitioner 1 Morning Regimen',
      discipline: 'Ayurveda',
      category: 'Ayurveda',
      durationWeeks: 2,
      level: 'Beginner',
      description: 'Exclusive to practitioner 1.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS',
      submitForReview: true,
    });

    const p1Articles = await fetchArticlesForPractitioner('prac-1');
    const p2Articles = await fetchArticlesForPractitioner('prac-2');
    assert.equal(p1Articles.length, 1);
    assert.equal(p1Articles[0].id, p1Art.id);
    assert.equal(p2Articles.length, 1);
    assert.equal(p2Articles[0].id, p2Art.id);

    const p2Programs = await fetchProgramsForPractitioner('prac-2');
    assert.equal(p2Programs.length, 0);

    // Practitioner 2 cannot overwrite Practitioner 1's article or programme
    await assert.rejects(
      () =>
        saveOrSubmitArticle({
          id: p1Art.id,
          title: 'Hijacked Title',
          discipline: 'Ayurveda',
          category: 'Ayurveda',
          summary: 'Attempted cross-practitioner edit.',
          authorId: 'prac-2',
          authorName: 'Acharya Rajesh Verma',
          authorQualification: 'M.Sc Yoga',
          submitForReview: true,
        }),
      /unauthorized/i
    );

    await assert.rejects(
      () =>
        saveOrSubmitProgram({
          id: p1Prog.id,
          title: 'Hijacked Regimen',
          discipline: 'Ayurveda',
          category: 'Ayurveda',
          durationWeeks: 2,
          level: 'Beginner',
          description: 'Attempted cross-practitioner programme edit.',
          creatorPractitionerId: 'prac-2',
          practitionerName: 'Acharya Rajesh Verma',
          practitionerTitle: 'M.Sc Yoga',
          submitForReview: true,
        }),
      /unauthorized/i
    );
  });

  it('8. Prevents duplicate submissions, keeps article/programme stores separated, and persists demo seeds + audit logs', async () => {
    seedDemoArticles();
    seedDemoArticles(); // idempotent
    seedDemoPrograms();
    seedDemoPrograms(); // idempotent
    seedDemoAuditLog();
    seedDemoAuditLog(); // idempotent

    // Duplicate title creation for same practitioner is rejected
    await saveOrSubmitArticle({
      title: 'Unique Circadian Guide',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      summary: 'Original circadian guide content for verification.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS',
      submitForReview: true,
    });

    await assert.rejects(
      () =>
        saveOrSubmitArticle({
          title: 'unique circadian guide',
          discipline: 'Ayurveda',
          category: 'Lifestyle Education',
          summary: 'Duplicate submission attempt with same title.',
          authorId: 'prac-1',
          authorName: 'Dr. Ananya Sharma',
          authorQualification: 'BAMS',
          submitForReview: true,
        }),
      /already exists/i
    );

    await saveOrSubmitProgram({
      title: 'Unique Seasonal Routine',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      durationWeeks: 3,
      level: 'Beginner',
      description: 'Original seasonal programme curriculum.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS',
      submitForReview: true,
    });

    await assert.rejects(
      () =>
        saveOrSubmitProgram({
          title: 'Unique Seasonal Routine',
          discipline: 'Ayurveda',
          category: 'Lifestyle Education',
          durationWeeks: 3,
          level: 'Beginner',
          description: 'Duplicate programme submission attempt.',
          creatorPractitionerId: 'prac-1',
          practitionerName: 'Dr. Ananya Sharma',
          practitionerTitle: 'BAMS',
          submitForReview: true,
        }),
      /already exists/i
    );

    // Verify separate storage keys
    const rawArticles = JSON.parse(backingStore.get(LOCAL_ARTICLES_KEY) || '{}');
    const rawPrograms = JSON.parse(backingStore.get(LOCAL_PROGRAMS_KEY) || '{}');
    assert.ok(Object.values(rawArticles).every((item: any) => 'summary' in item && !('durationWeeks' in item)));
    assert.ok(Object.values(rawPrograms).every((item: any) => 'durationWeeks' in item && !('fullContent' in item)));

    // Verify audit log persistence
    await appendGovernanceAuditLog({
      action: 'Approved Educational Article for Public Catalog',
      target: 'Unique Circadian Guide',
      adminId: 'admin_gov_1',
      adminName: 'Platform Governance Admin',
      type: 'content',
      status: 'Approved',
    });
    const logs = await fetchGovernanceAuditLog();
    assert.ok(backingStore.has(LOCAL_AUDIT_LOG_KEY));
    assert.equal(logs[0].target, 'Unique Circadian Guide');
  });
});
