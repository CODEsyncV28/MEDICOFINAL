import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchPublishedArticlesForUser,
  reviewArticleDecision,
  saveOrSubmitArticle,
  seedDemoArticles,
} from '../services/contentService';
import {
  enrollInPublishedProgram,
  fetchPublishedProgramsForUser,
  fetchUserProgramEnrollments,
  reviewProgramDecision,
  saveOrSubmitProgram,
  seedDemoPrograms,
  seedDemoUserEnrollments,
} from '../services/programService';
import { INITIAL_ARTICLES, INITIAL_PROGRAMS } from '../data/mockData';

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

describe('Phase 4.4B.3: Admin-to-User Publication Integration', () => {
  beforeEach(() => {
    installMockLocalStorage();
  });

  it('1. Newly approved educational article appears in User Dashboard data with author and publication metadata', async () => {
    const submitted = await saveOrSubmitArticle({
      title: 'Mindful Evening Hydration & Ginger Infusion',
      discipline: 'Ayurveda',
      category: 'Nutrition',
      readTime: '5 min read',
      summary: 'Non-diagnostic evening hydration guide using gentle roasted cumin and ginger.',
      fullContent: 'Sip warm water with a pinch of roasted cumin 90 minutes before sleep.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    // Before approval, not visible to users
    const beforeApproval = await fetchPublishedArticlesForUser();
    assert.equal(beforeApproval.some((a) => a.id === submitted.id), false);

    // Admin approves
    await reviewArticleDecision({
      articleId: submitted.id,
      decision: 'published',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Approved for public educational catalog.',
    });

    const userArticles = await fetchPublishedArticlesForUser();
    const published = userArticles.find((a) => a.id === submitted.id);
    assert.ok(published);
    assert.equal(published.status, 'published');
    assert.equal(published.author, 'Dr. Ananya Sharma');
    assert.equal(published.authorQualification, 'BAMS, MD (Ayurveda)');
    assert.equal(published.category, 'Nutrition');
    assert.ok(published.publishedAt);
    assert.equal(published.isSimulated, false);
  });

  it('2. Newly approved wellness programme appears in User Dashboard without being auto-enrolled', async () => {
    const submittedProg = await saveOrSubmitProgram({
      title: '7-Day Monsoon Digestion & Agni Care',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      durationWeeks: 2,
      level: 'Beginner',
      description: 'Light warm meals and gentle breathing practices during humid weather.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    // Before approval, hidden from users
    assert.equal(
      (await fetchPublishedProgramsForUser()).some((p) => p.id === submittedProg.id),
      false
    );

    // Admin approves and publishes
    await reviewProgramDecision({
      programId: submittedProg.id,
      decision: 'published',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Approved after confirming non-diagnostic disclaimers.',
    });

    const userPrograms = await fetchPublishedProgramsForUser();
    const publishedProg = userPrograms.find((p) => p.id === submittedProg.id);
    assert.ok(publishedProg);
    assert.equal(publishedProg.status, 'published');
    assert.equal(publishedProg.isPublished, true);
    assert.equal(publishedProg.practitionerName, 'Dr. Ananya Sharma');
    assert.equal(publishedProg.practitionerTitle, 'BAMS, MD (Ayurveda)');
    assert.ok(publishedProg.publishedAt);
    assert.equal(publishedProg.isSimulated, false);

    // Must NOT be automatically enrolled for the user
    const enrollmentsBefore = await fetchUserProgramEnrollments('seeker_123');
    assert.equal(enrollmentsBefore.some((e) => e.programId === submittedProg.id), false);

    // Explicit user enrollment persists
    const enrolled = await enrollInPublishedProgram('seeker_123', submittedProg.id);
    assert.equal(enrolled.programId, submittedProg.id);
    assert.equal(enrolled.completedSessions, 0);
    const enrollmentsAfter = await fetchUserProgramEnrollments('seeker_123');
    assert.equal(enrollmentsAfter.length, 1);
    assert.equal(enrollmentsAfter[0].programId, submittedProg.id);
  });

  it('3. Pending educational articles remain strictly hidden from User Dashboard', async () => {
    seedDemoArticles();
    const pending = await saveOrSubmitArticle({
      title: 'Pending Review Herbal Decoction Notes',
      discipline: 'Siddha',
      category: 'Lifestyle Education',
      summary: 'Submitted article still awaiting administrator approval.',
      authorId: 'prac-3',
      authorName: 'Dr. K. Senthil Kumar',
      authorQualification: 'BSMS, MD (Siddha)',
      submitForReview: true,
    });

    const userArticles = await fetchPublishedArticlesForUser({ demoCatalog: INITIAL_ARTICLES });
    // Both seeded pending ('auth-1') and newly submitted pending must be hidden
    assert.equal(userArticles.some((a) => a.id === pending.id), false);
    assert.equal(userArticles.some((a) => a.id === 'auth-1'), false);
    // Seeded draft ('auth-3') must also be hidden
    assert.equal(userArticles.some((a) => a.id === 'auth-3'), false);
  });

  it('4. Draft and pending wellness programmes remain hidden and cannot be enrolled in', async () => {
    seedDemoPrograms();
    const draftProg = await saveOrSubmitProgram({
      title: 'Unfinished Draft Neck Mobility Regimen',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      durationWeeks: 2,
      level: 'Beginner',
      description: 'Private practitioner draft not yet submitted for approval.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: false,
    });

    const pendingProg = await saveOrSubmitProgram({
      title: 'Pending Approval Unani Sleep Protocol',
      discipline: 'Unani',
      category: 'Meditation',
      durationWeeks: 3,
      level: 'Intermediate',
      description: 'Submitted programme still awaiting administrator review.',
      creatorPractitionerId: 'prac-4',
      practitionerName: 'Dr. Tariq Mansoor',
      practitionerTitle: 'BUMS',
      submitForReview: true,
    });

    const userPrograms = await fetchPublishedProgramsForUser({ demoCatalog: INITIAL_PROGRAMS });
    assert.equal(userPrograms.some((p) => p.id === draftProg.id), false);
    assert.equal(userPrograms.some((p) => p.id === pendingProg.id), false);
    assert.equal(userPrograms.some((p) => p.id === 'prog-app-1'), false);
    assert.equal(userPrograms.some((p) => p.id === 'prog-app-2'), false);

    // Attempting to enroll in draft or pending programme must fail
    await assert.rejects(
      () => enrollInPublishedProgram('seeker_123', draftProg.id, INITIAL_PROGRAMS),
      /only admin-published/i
    );
    await assert.rejects(
      () => enrollInPublishedProgram('seeker_123', pendingProg.id, INITIAL_PROGRAMS),
      /only admin-published/i
    );
  });

  it('5. Revision-requested content remains hidden and previously published content disappears when moved to revision', async () => {
    seedDemoArticles();
    seedDemoPrograms();

    const art = await saveOrSubmitArticle({
      title: 'Circadian Spice Infusion Protocol',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      summary: 'Warm morning spice infusion guidance.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    const prog = await saveOrSubmitProgram({
      title: 'Autumn Pranayama Calibration',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      durationWeeks: 3,
      level: 'Beginner',
      description: 'Gentle pranayama sequence for seasonal transitions.',
      creatorPractitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });

    // Admin approves both first
    await reviewArticleDecision({
      articleId: art.id,
      decision: 'published',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Initially approved.',
    });
    await reviewProgramDecision({
      programId: prog.id,
      decision: 'published',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'Initially approved.',
    });

    assert.equal(
      (await fetchPublishedArticlesForUser({ demoCatalog: INITIAL_ARTICLES })).some((a) => a.id === art.id),
      true
    );
    assert.equal(
      (await fetchPublishedProgramsForUser({ demoCatalog: INITIAL_PROGRAMS })).some((p) => p.id === prog.id),
      true
    );

    // Admin later requests revision on both AND on seeded 'auth-2' / 'prog-1'
    await reviewArticleDecision({
      articleId: art.id,
      decision: 'revision_requested',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'INTERNAL: Clarify herb safety note before republishing.',
    });
    await reviewArticleDecision({
      articleId: 'auth-2',
      decision: 'revision_requested',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'INTERNAL: Refresh Prakriti section.',
    });
    await reviewProgramDecision({
      programId: prog.id,
      decision: 'revision_requested',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'INTERNAL: Update beginner contraindication wording.',
    });
    await reviewProgramDecision({
      programId: 'prog-1',
      decision: 'revision_requested',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
      reviewNotes: 'INTERNAL: Review week 3 module pacing.',
    });

    const userArticlesAfter = await fetchPublishedArticlesForUser({ demoCatalog: INITIAL_ARTICLES });
    const userProgramsAfter = await fetchPublishedProgramsForUser({ demoCatalog: INITIAL_PROGRAMS });

    // Previously published items must immediately disappear, and static demo fallbacks must NOT resurrect them
    assert.equal(userArticlesAfter.some((a) => a.id === art.id), false);
    assert.equal(
      userArticlesAfter.some(
        (a) => a.title.toLowerCase() === 'understanding prakriti: your unique constitutional blueprint'
      ),
      false
    );
    assert.equal(userProgramsAfter.some((p) => p.id === prog.id), false);
    assert.equal(userProgramsAfter.some((p) => p.id === 'prog-1'), false);
  });

  it('6. Prevents duplicate records when seeded demo records and static catalog coexist with new submissions', async () => {
    seedDemoArticles();
    seedDemoPrograms();
    seedDemoUserEnrollments('guest_demo_seeker');

    const newArt = await saveOrSubmitArticle({
      title: 'Balanced Midday Restorative Walk',
      discipline: 'Yoga & Naturopathy',
      category: 'Lifestyle Education',
      summary: 'A short post-lunch walk to support digestion and mental clarity.',
      authorId: 'prac-2',
      authorName: 'Acharya Rajesh Verma',
      authorQualification: 'M.Sc Yoga Therapy',
      submitForReview: true,
    });
    await reviewArticleDecision({
      articleId: newArt.id,
      decision: 'published',
      reviewerId: 'admin_gov_1',
      reviewerRole: 'admin',
    });

    const articles = await fetchPublishedArticlesForUser({ demoCatalog: INITIAL_ARTICLES });
    const articleTitles = articles.map((a) => a.title.trim().toLowerCase());
    assert.equal(new Set(articleTitles).size, articleTitles.length);
    // Prakriti article ('auth-2' in store + 'art-1' in INITIAL_ARTICLES) must appear strictly once
    assert.equal(
      articleTitles.filter((t) => t === 'understanding prakriti: your unique constitutional blueprint')
        .length,
      1
    );

    const programs = await fetchPublishedProgramsForUser({ demoCatalog: INITIAL_PROGRAMS });
    const programIds = programs.map((p) => p.id);
    const programTitles = programs.map((p) => p.title.trim().toLowerCase());
    assert.equal(new Set(programIds).size, programIds.length);
    assert.equal(new Set(programTitles).size, programTitles.length);

    // Seeded demo items remain marked isSimulated: true while new submission is isSimulated: false
    const seededPrakriti = articles.find((a) => a.id === 'auth-2');
    const submittedArt = articles.find((a) => a.id === newArt.id);
    assert.equal(seededPrakriti?.isSimulated, true);
    assert.equal(submittedArt?.isSimulated, false);
  });

  it('7. Never exposes internal Admin reviewNotes or reviewer IDs in user-facing data', async () => {
    seedDemoArticles();
    seedDemoPrograms();

    const secretArticleReviewNote = 'INTERNAL ADMIN NOTE: Verify clinical source citation #44B3.';
    const secretProgramReviewNote = 'INTERNAL ADMIN NOTE: Approved pending Q4 audit check.';

    const art = await saveOrSubmitArticle({
      title: 'Evidence-Informed Tulsi & Mint Infusion',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      summary: 'Refreshing afternoon herbal beverage for seasonal hydration.',
      authorId: 'prac-1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD (Ayurveda)',
      submitForReview: true,
    });
    await reviewArticleDecision({
      articleId: art.id,
      decision: 'published',
      reviewerId: 'admin_secret_99',
      reviewerRole: 'admin',
      reviewNotes: secretArticleReviewNote,
    });

    const prog = await saveOrSubmitProgram({
      title: 'Gentle Morning Spine Mobilization',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      durationWeeks: 2,
      level: 'Beginner',
      description: 'Five-minute standing and seated spinal mobilization routines.',
      creatorPractitionerId: 'prac-2',
      practitionerName: 'Acharya Rajesh Verma',
      practitionerTitle: 'M.Sc Yoga Therapy',
      submitForReview: true,
    });
    await reviewProgramDecision({
      programId: prog.id,
      decision: 'published',
      reviewerId: 'admin_secret_99',
      reviewerRole: 'admin',
      reviewNotes: secretProgramReviewNote,
    });

    const userArticles = await fetchPublishedArticlesForUser({ demoCatalog: INITIAL_ARTICLES });
    const userPrograms = await fetchPublishedProgramsForUser({ demoCatalog: INITIAL_PROGRAMS });

    for (const item of userArticles) {
      assert.equal('reviewNotes' in item, false);
      assert.equal('reviewedByAdminId' in item, false);
      const serialized = JSON.stringify(item);
      assert.equal(serialized.includes(secretArticleReviewNote), false);
      assert.equal(serialized.includes('admin_secret_99'), false);
    }

    for (const item of userPrograms) {
      assert.equal('reviewNotes' in item, false);
      assert.equal('reviewedByAdminId' in item, false);
      const serialized = JSON.stringify(item);
      assert.equal(serialized.includes(secretProgramReviewNote), false);
      assert.equal(serialized.includes('admin_secret_99'), false);
    }
  });
});
