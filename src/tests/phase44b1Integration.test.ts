import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmConsultation,
  createConsultationRequest,
  fetchConsultationsForPractitioner,
  fetchConsultationsForUser,
  seedDemoConsultations,
  updateConsultationStatus,
  validateConsultationInput,
} from '../services/consultationService';
import {
  fetchClientProfile,
  fetchClientsForPractitioner,
  seedDemoClientProfiles,
  updateClientObservationNotes,
} from '../services/practitionerService';
import { INITIAL_CLIENTS } from '../data/mockData';

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

describe('Phase 4.4B.1: Consultation & Practitioner Data Integration', () => {
  let backingStore: Map<string, string>;

  beforeEach(() => {
    backingStore = installMockLocalStorage();
  });

  it('1. Validates required consultation fields before creation', async () => {
    const missingDate = validateConsultationInput({
      userId: 'seeker-1',
      practitionerId: 'prac-1',
      topic: 'circadian-routine',
      preferredDate: '',
      preferredSlot: 'morning',
    });
    assert.equal(missingDate.isValid, false);
    assert.ok(missingDate.message?.toLowerCase().includes('date'));

    const missingPrac = validateConsultationInput({
      userId: 'seeker-1',
      practitionerId: '',
      topic: 'circadian-routine',
      preferredDate: '2026-12-01',
      preferredSlot: 'morning',
    });
    assert.equal(missingPrac.isValid, false);

    await assert.rejects(
      () =>
        createConsultationRequest({
          userId: 'seeker-1',
          userName: 'Aarav',
          practitionerId: 'prac-1',
          practitionerName: 'Dr. Ananya Sharma',
          topic: 'circadian-routine',
          preferredDate: '',
          preferredSlot: 'morning',
          notes: 'Need guidance',
        }),
      /preferred date/i
    );
  });

  it('2. Creates and persists consultation requests in Local Persistent Demo Storage', async () => {
    const created = await createConsultationRequest({
      userId: 'seeker-101',
      userName: 'Meera Nair',
      practitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'digestive-fire',
      preferredDate: '2026-12-03',
      preferredSlot: 'afternoon',
      notes: 'Afternoon bloating after cold salads.',
    });

    assert.ok(created.id.startsWith('consult_'));
    assert.equal(created.status, 'pending');
    assert.equal(created.isSimulated, false);
    assert.equal(created.topicLabel, 'Digestive Rhythm & Food Sensitivities (Agni)');
    assert.equal(created.preferredDate, '2026-12-03');
    assert.equal(created.preferredSlot, 'afternoon');
    assert.ok(created.createdAt);
    assert.ok(created.updatedAt);

    // Verify raw localStorage persistence
    const rawStore = backingStore.get('ayush_consultations_store');
    assert.ok(rawStore);
    const parsed = JSON.parse(rawStore);
    assert.equal(parsed[created.id].userName, 'Meera Nair');

    // Verify user retrieval
    const userConsults = await fetchConsultationsForUser('seeker-101');
    assert.equal(userConsults.length, 1);
    assert.equal(userConsults[0].id, created.id);
    assert.equal(userConsults[0].notes, 'Afternoon bloating after cold salads.');
  });

  it('3. Filters practitioner consultation inbox by practitionerId and preserves demo seeding without duplicates', async () => {
    seedDemoConsultations();
    seedDemoConsultations(); // calling twice must not duplicate

    const c1 = await createConsultationRequest({
      userId: 'seeker-a',
      userName: 'Rohan',
      practitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'circadian-routine',
      preferredDate: '2026-12-04',
      preferredSlot: 'morning',
      notes: 'Early waking',
    });

    const c2 = await createConsultationRequest({
      userId: 'seeker-b',
      userName: 'Kavya',
      practitionerId: 'prac-2',
      practitionerName: 'Acharya Rajesh Verma',
      topic: 'postural-yoga',
      preferredDate: '2026-12-05',
      preferredSlot: 'evening',
      notes: 'Neck stiffness',
    });

    const prac1Inbox = await fetchConsultationsForPractitioner('prac-1');
    const prac2Inbox = await fetchConsultationsForPractitioner('prac-2');

    // prac-1 gets 3 demo requests + c1 (4 total), and NOT c2
    assert.equal(prac1Inbox.length, 4);
    assert.ok(prac1Inbox.some((item) => item.id === c1.id));
    assert.ok(!prac1Inbox.some((item) => item.id === c2.id));

    // prac-2 gets strictly c2
    assert.equal(prac2Inbox.length, 1);
    assert.equal(prac2Inbox[0].id, c2.id);

    // Seekers only see their own consultation requests
    const seekerA = await fetchConsultationsForUser('seeker-a');
    assert.equal(seekerA.length, 1);
    assert.equal(seekerA[0].id, c1.id);
  });

  it('4. Persists accept (confirmed), reschedule, and reject status transitions and reflects them on user dashboard queries', async () => {
    const req = await createConsultationRequest({
      userId: 'seeker-202',
      userName: 'Devika Joshi',
      practitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'seasonal-transition',
      preferredDate: '2026-12-06',
      preferredSlot: 'morning',
      notes: 'Dry skin during winter onset.',
    });

    // Confirming without scheduledTime must reject
    await assert.rejects(
      () =>
        updateConsultationStatus(req.id, {
          status: 'confirmed',
          practitionerId: 'prac-1',
          scheduledTime: '   ',
        }),
      /scheduled appointment/i
    );

    // Unauthorized practitioner cannot update prac-1's consultation
    await assert.rejects(
      () =>
        updateConsultationStatus(req.id, {
          status: 'confirmed',
          practitionerId: 'prac-2',
          scheduledTime: 'Dec 6 at 9:00 AM',
        }),
      /unauthorized/i
    );

    // Confirm via convenience wrapper (verifies seeker notes are NOT overwritten)
    const confirmed = await confirmConsultation(
      req.id,
      '2026-12-06 at 09:30 AM',
      'Prepare warm sesame oil notes before call.',
      'prac-1'
    );
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.scheduledTime, '2026-12-06 at 09:30 AM');
    assert.equal(confirmed.practitionerNotes, 'Prepare warm sesame oil notes before call.');
    assert.equal(confirmed.notes, 'Dry skin during winter onset.');

    // Reschedule
    const rescheduled = await updateConsultationStatus(req.id, {
      status: 'rescheduled',
      practitionerId: 'prac-1',
      scheduledTime: '2026-12-07 at 11:00 AM',
      practitionerNotes: 'Moved to Monday morning slot.',
    });
    assert.equal(rescheduled.status, 'rescheduled');
    assert.equal(rescheduled.scheduledTime, '2026-12-07 at 11:00 AM');

    // User fetches their consultations and sees practitioner update immediately
    const seekerView = await fetchConsultationsForUser('seeker-202');
    assert.equal(seekerView.length, 1);
    assert.equal(seekerView[0].status, 'rescheduled');
    assert.equal(seekerView[0].scheduledTime, '2026-12-07 at 11:00 AM');
    assert.equal(seekerView[0].practitionerNotes, 'Moved to Monday morning slot.');

    // Reject a separate request clears scheduledTime
    const req2 = await createConsultationRequest({
      userId: 'seeker-202',
      userName: 'Devika Joshi',
      practitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'general-review',
      preferredDate: '2026-12-08',
      preferredSlot: 'evening',
    });
    const rejected = await updateConsultationStatus(req2.id, {
      status: 'rejected',
      practitionerId: 'prac-1',
      practitionerNotes: 'Evening clinic unavailable; please pick a morning slot.',
    });
    assert.equal(rejected.status, 'rejected');
    assert.equal(rejected.scheduledTime, null);
    assert.equal(
      rejected.practitionerNotes,
      'Evening clinic unavailable; please pick a morning slot.'
    );
  });

  it('5. Loads client records from practitionerService, persists notes without duplicates, and isolates notes across practitioners', async () => {
    seedDemoClientProfiles('prac-1', INITIAL_CLIENTS);
    seedDemoClientProfiles('prac-1', INITIAL_CLIENTS); // idempotent

    const prac1Clients = await fetchClientsForPractitioner('prac-1');
    assert.equal(prac1Clients.length, INITIAL_CLIENTS.length);
    assert.ok(prac1Clients.every((c) => c.isSimulated === true));

    // Save practitioner observation note for client-1 under prac-1
    const updatedClient = await updateClientObservationNotes(
      'client-1',
      'Updated note: continue Triphala water at 6:30 AM and journal sleep latency.',
      'Needs Review',
      'prac-1',
      prac1Clients[0]
    );

    assert.equal(updatedClient.id, 'client-1');
    assert.equal(updatedClient.status, 'Needs Review');
    assert.equal(
      updatedClient.practitionerNotes,
      'Updated note: continue Triphala water at 6:30 AM and journal sleep latency.'
    );

    // Reload roster for prac-1: persisted note must be present with no duplicate rows
    const reloadedPrac1Clients = await fetchClientsForPractitioner('prac-1');
    assert.equal(reloadedPrac1Clients.length, INITIAL_CLIENTS.length);
    const client1After = reloadedPrac1Clients.find((c) => c.id === 'client-1');
    assert.equal(client1After?.status, 'Needs Review');
    assert.equal(
      client1After?.practitionerNotes,
      'Updated note: continue Triphala water at 6:30 AM and journal sleep latency.'
    );

    // Practitioner isolation check: prac-2 must NOT see prac-1's notes on client-1
    const prac2Client1Profile = await fetchClientProfile('client-1', 'prac-2');
    assert.equal(prac2Client1Profile, null);

    const prac2ClientsBefore = await fetchClientsForPractitioner('prac-2');
    assert.equal(prac2ClientsBefore.length, 0);

    // If prac-2 saves their own note for client-1, prac-1's note remains completely untouched
    await updateClientObservationNotes(
      'client-1',
      'Practitioner 2 independent yoga note',
      'Active',
      'prac-2',
      { name: 'Priya Sundaram' }
    );

    const prac1ProfileCheck = await fetchClientProfile('client-1', 'prac-1');
    const prac2ProfileCheck = await fetchClientProfile('client-1', 'prac-2');
    assert.equal(
      prac1ProfileCheck?.practitionerNotes,
      'Updated note: continue Triphala water at 6:30 AM and journal sleep latency.'
    );
    assert.equal(prac2ProfileCheck?.practitionerNotes, 'Practitioner 2 independent yoga note');
  });
});
