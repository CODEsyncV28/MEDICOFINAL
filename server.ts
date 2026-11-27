import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import type { AYUSHDiscipline, Practitioner } from './src/types/index.ts';
import type {
  CompanionConcernSummary,
  CompanionMatchingCriteria,
  CompanionPhase,
} from './src/types/firebase.ts';
import {
  detectMinorOrGuardianContext,
  detectUrgentSymptomSignal,
  matchVerifiedPractitioners,
  normalizeAYUSHDisciplines,
} from './src/utils/companionMatching.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

interface IncomingMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface SanitizedContextPayload {
  assessmentCompleted?: boolean;
  answeredCount?: number;
  totalQuestions?: number;
  circadianBalance?: string;
  digestiveAgni?: string;
  dailyMovement?: string;
  stressResilience?: string;
  constitutionTendency?: string;
  assessmentVersion?: number | null;
  activePlanTitle?: string | null;
  activePlanFocus?: string | null;
  dinacharyaAdherencePercent?: number;
  dinacharyaCompletedCount?: number;
  dinacharyaTotalCount?: number;
  pendingDinacharyaTitles?: string[];
}

interface GeminiCompanionStructuredOutput {
  phase: 'contextual_understanding' | 'follow_up' | 'recommendation_ready' | 'urgent_escalation';
  reply: string;
  followUpQuestion: string;
  suggestedReplies: string[];
  isUrgent: boolean;
  urgentReason: string;
  isMinorContext: boolean;
  readyForRecommendations: boolean;
  hasConcernSummary: boolean;
  primaryConcern: string;
  durationNote: string;
  routineImpact: string;
  suggestedConsultationType: string;
  keyObservations: string[];
  preferredDisciplines: string[];
  focusKeywords: string[];
  consultationFormat: 'online' | 'in_person' | 'both' | 'any';
  maxBudget: number;
  preferredLanguage: string;
  preferredLocation: string;
}

// Sliding-window per-user rate limiter (max 15 requests per 5 minutes)
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX_REQUESTS = 15;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = (rateBuckets.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (existing.length >= RATE_MAX_REQUESTS) {
    const oldest = existing[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    rateBuckets.set(key, existing);
    return { allowed: false, retryAfterSeconds };
  }
  existing.push(now);
  rateBuckets.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

function sanitizePractitioners(raw: unknown): Practitioner[] {
  if (!Array.isArray(raw)) return [];
  const validDisciplines = new Set<AYUSHDiscipline>([
    'Ayurveda',
    'Yoga & Naturopathy',
    'Unani',
    'Siddha',
    'Homeopathy',
  ]);
  const sanitized: Practitioner[] = [];
  for (const item of raw.slice(0, 30)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id.trim().slice(0, 128) : '';
    const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 100) : '';
    if (!id || !name) continue;
    const rawDisc = typeof obj.discipline === 'string' ? obj.discipline.trim() : 'Ayurveda';
    const discipline: AYUSHDiscipline = validDisciplines.has(rawDisc as AYUSHDiscipline)
      ? (rawDisc as AYUSHDiscipline)
      : 'Ayurveda';

    sanitized.push({
      id,
      name,
      qualification:
        typeof obj.qualification === 'string' ? obj.qualification.trim().slice(0, 120) : '',
      discipline,
      specialization:
        typeof obj.specialization === 'string' ? obj.specialization.trim().slice(0, 150) : '',
      experienceYears:
        typeof obj.experienceYears === 'number' && Number.isFinite(obj.experienceYears)
          ? Math.max(0, Math.min(80, obj.experienceYears))
          : 0,
      councilRegistration:
        typeof obj.councilRegistration === 'string'
          ? obj.councilRegistration.trim().slice(0, 120)
          : '',
      activeClientsCount:
        typeof obj.activeClientsCount === 'number' ? Math.max(0, obj.activeClientsCount) : 0,
      rating: typeof obj.rating === 'number' ? Math.max(0, Math.min(5, obj.rating)) : 0,
      bio: typeof obj.bio === 'string' ? obj.bio.trim().slice(0, 800) : '',
      nextAvailableSlot:
        typeof obj.nextAvailableSlot === 'string'
          ? obj.nextAvailableSlot.trim().slice(0, 100)
          : '',
      consultationFee:
        typeof obj.consultationFee === 'number' &&
        Number.isFinite(obj.consultationFee) &&
        obj.consultationFee >= 0
          ? obj.consultationFee
          : null,
      consultationCurrency:
        typeof obj.consultationCurrency === 'string'
          ? obj.consultationCurrency.trim().slice(0, 10)
          : null,
      consultationFormat:
        obj.consultationFormat === 'online' ||
        obj.consultationFormat === 'in_person' ||
        obj.consultationFormat === 'both'
          ? obj.consultationFormat
          : null,
      location:
        typeof obj.location === 'string' ? obj.location.trim().slice(0, 120) : null,
      languages: Array.isArray(obj.languages)
        ? obj.languages
            .filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
            .map((l) => l.trim().slice(0, 40))
            .slice(0, 12)
        : null,
      photoUrl:
        typeof obj.photoUrl === 'string' ? obj.photoUrl.trim().slice(0, 500) : null,
    });
  }
  return sanitized;
}

function buildSystemInstruction(
  consentedContext: SanitizedContextPayload | null,
  practitioners: Practitioner[],
  isMinorContext: boolean
): string {
  const contextBlock = consentedContext
    ? `SEEKER CONSENTED WELLNESS CONTEXT (NO PII — DO NOT REPEAT QUESTIONS ALREADY ANSWERED HERE):
- Assessment status: ${consentedContext.answeredCount ?? 0} of ${consentedContext.totalQuestions ?? 20} answered (${consentedContext.assessmentCompleted ? 'Complete' : 'Partial'})${consentedContext.assessmentVersion ? `, Version ${consentedContext.assessmentVersion}` : ''}
- Circadian rhythm: ${consentedContext.circadianBalance || 'Not recorded'}
- Digestive Agni: ${consentedContext.digestiveAgni || 'Not recorded'}
- Daily movement: ${consentedContext.dailyMovement || 'Not recorded'}
- Stress resilience: ${consentedContext.stressResilience || 'Not recorded'}
- Constitutional tendency: ${consentedContext.constitutionTendency || 'Not recorded'}
- Active wellness plan: ${consentedContext.activePlanTitle || 'None yet'}${consentedContext.activePlanFocus ? ` (Focus: ${consentedContext.activePlanFocus})` : ''}
- Today's Dinacharya rituals: ${consentedContext.dinacharyaCompletedCount ?? 0}/${consentedContext.dinacharyaTotalCount ?? 0} completed (${consentedContext.dinacharyaAdherencePercent ?? 0}%)${consentedContext.pendingDinacharyaTitles && consentedContext.pendingDinacharyaTitles.length > 0 ? `; pending: ${consentedContext.pendingDinacharyaTitles.join(', ')}` : ''}`
    : `SEEKER WELLNESS CONTEXT: Seeker has NOT shared their lifestyle assessment context (or has not completed one). Respect privacy; if helpful and natural once, mention they can optionally share or take their Lifestyle Assessment, or continue directly.`;

  const practitionerPoolSummary =
    practitioners.length > 0
      ? practitioners
          .map(
            (p) =>
              `- [${p.id}] ${p.name} | Discipline: ${p.discipline} | Specialization: ${p.specialization} | Format: ${p.consultationFormat || 'unspecified'} | Fee: ${typeof p.consultationFee === 'number' ? `${p.consultationCurrency || 'INR'} ${p.consultationFee}` : 'Not listed'} | Location: ${p.location || 'Unspecified'} | Languages: ${p.languages?.join(', ') || 'Unspecified'}`
          )
          .join('\n')
      : 'NONE CURRENTLY AVAILABLE IN DIRECTORY.';

  return `You are the "AYUSH AI Wellness Companion" inside AYUSH Wellness Connect.

ROLE & PERSONALITY:
- Empathetic, respectful, calm, conversational non-diagnostic wellness navigation assistant.
- Explain concepts in simple, plain language without overwhelming the seeker.
- Traditional systems covered: Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy.

STRICT SAFETY & HEALTHCARE BOUNDARIES:
1. NEVER diagnose any medical condition, disease, or disorder.
2. NEVER claim any AYUSH practice or practitioner cures a disease.
3. NEVER prescribe medicines, herbal formulations, dosages, supplements, or clinical diets.
4. If the seeker mentions red-flag/urgent symptoms (chest pain, breathing difficulty, fainting, severe bleeding, sudden weakness/numbness, high persistent fever, severe acute pain, self-harm/crisis), set isUrgent=true, phase="urgent_escalation", and advise immediate in-person emergency medical care without asking follow-up questions.
5. ${isMinorContext ? 'The seeker appears to be under 18 or asking for a minor. Explicitly and kindly advise involving a parent, legal guardian, or pediatrician before acting on wellness options or booking consultations.' : 'If the user mentions being under 18 or asking for a child/minor, set isMinorContext=true and remind them to involve a parent, guardian, or pediatrician.'}

CONVERSATIONAL WORKFLOW:
- Phase B (contextual_understanding) & Phase C (follow_up): Acknowledge what the seeker shared (and any consented assessment/plan/habit patterns naturally without repeating questions already answered in consented context). Ask AT MOST ONE clear, relevant follow-up question in "followUpQuestion" (e.g., how long it has been going on, how it affects sleep/digestion/daily routine, whether they have consulted a doctor before, online vs in-person preference, or consultation budget). Keep "reply" concise (2-4 short sentences) and do not stack multiple questions inside "reply".
- Phase D (recommendation_ready): Once you have enough context (typically after 1–3 turns, OR immediately if the seeker explicitly asks for practitioner recommendations or gives clear preferences), set readyForRecommendations=true, phase="recommendation_ready", leave followUpQuestion="", populate hasConcernSummary=true with a neutral non-diagnostic summary (primaryConcern, durationNote, routineImpact, suggestedConsultationType, keyObservations), and populate matchingCriteria (preferredDisciplines from ['Ayurveda','Yoga & Naturopathy','Unani','Siddha','Homeopathy'], focusKeywords, consultationFormat, maxBudget if mentioned or 0 if not mentioned, preferredLanguage, preferredLocation).
- NEVER invent practitioners, prices, qualifications, or availability. Only reference practitioner capabilities consistent with the verified directory below.

${contextBlock}

VERIFIED PRACTITIONER DIRECTORY SUMMARY (FOR CONTEXT ONLY — SERVER DETERMINES FINAL RANKING):
${practitionerPoolSummary}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });

  app.post('/api/companion/chat', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | null;
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Invalid request body.', retryable: false });
        return;
      }

      const rawMessages = Array.isArray(body.messages) ? body.messages : [];
      const messages: IncomingMessage[] = rawMessages
        .slice(-24)
        .filter(
          (m): m is { role: 'user' | 'assistant'; text: string } =>
            Boolean(m) &&
            typeof m === 'object' &&
            ((m as { role?: unknown }).role === 'user' ||
              (m as { role?: unknown }).role === 'assistant') &&
            typeof (m as { text?: unknown }).text === 'string' &&
            (m as { text: string }).text.trim().length > 0
        )
        .map((m) => ({
          role: m.role,
          text: m.text.trim().slice(0, 1500),
        }));

      if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
        res.status(400).json({
          error: 'Please enter a message before sending.',
          retryable: false,
        });
        return;
      }

      const sessionKeyRaw =
        typeof body.sessionKey === 'string' ? body.sessionKey.trim().slice(0, 128) : '';
      const clientIp = req.ip || 'unknown';
      const rateLimitKey = sessionKeyRaw ? `${sessionKeyRaw}::${clientIp}` : clientIp;
      const rateCheck = checkRateLimit(rateLimitKey);
      if (!rateCheck.allowed) {
        res.status(429).json({
          error: `You have sent several requests quickly. Please wait ${rateCheck.retryAfterSeconds} seconds before sending another message.`,
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateCheck.retryAfterSeconds,
          retryable: true,
        });
        return;
      }

      const latestUserMessage = messages[messages.length - 1].text;
      const combinedUserText = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.text)
        .join('\n');

      const hasAssessmentConsent = body.hasAssessmentConsent === true;
      const consentedContext =
        hasAssessmentConsent && body.consentedContext && typeof body.consentedContext === 'object'
          ? (body.consentedContext as SanitizedContextPayload)
          : null;
      const practitioners = sanitizePractitioners(body.practitioners);
      const isLiveFirebaseMode = body.isLiveFirebaseMode === true;

      const isMinorContext = detectMinorOrGuardianContext(combinedUserText);

      // Deterministic red-flag escalation BEFORE calling LLM so urgent symptoms are never delayed
      const urgentCheck = detectUrgentSymptomSignal(latestUserMessage);
      if (urgentCheck.isUrgent) {
        res.json({
          phase: 'urgent_escalation' as CompanionPhase,
          reply:
            'Thank you for sharing what you are experiencing. Because those symptoms require prompt medical evaluation, please prioritize immediate in-person clinical care right away.',
          followUpQuestion: null,
          suggestedReplies: [],
          isUrgent: true,
          urgentGuidance: urgentCheck.urgentGuidance,
          isMinorContext,
          summary: null,
          recommendedPractitionerIds: [],
          matchReasonsByPractitionerId: {},
          matchingCriteria: null,
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        res.status(503).json({
          error:
            'AI Wellness Companion is unavailable because GEMINI_API_KEY is not configured on the server.',
          code: 'GEMINI_NOT_CONFIGURED',
          retryable: true,
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const conversationContents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      const geminiResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: conversationContents,
        config: {
          systemInstruction: buildSystemInstruction(
            consentedContext,
            practitioners,
            isMinorContext
          ),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              phase: {
                type: Type.STRING,
                description:
                  'One of: contextual_understanding, follow_up, recommendation_ready, urgent_escalation',
              },
              reply: {
                type: Type.STRING,
                description:
                  'Warm, non-diagnostic conversational response in plain language (2-4 sentences). Do not stack multiple questions.',
              },
              followUpQuestion: {
                type: Type.STRING,
                description:
                  'At most ONE clear follow-up question when still gathering context, or empty string when ready for recommendations or urgent.',
              },
              suggestedReplies: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to 4 short clickable quick-reply chips for the seeker.',
              },
              isUrgent: {
                type: Type.BOOLEAN,
                description: 'True only if red-flag symptoms warrant immediate medical care.',
              },
              urgentReason: {
                type: Type.STRING,
                description: 'Brief emergency escalation guidance if isUrgent is true, else empty.',
              },
              isMinorContext: {
                type: Type.BOOLEAN,
                description: 'True if seeker is under 18 or asking on behalf of a child/minor.',
              },
              readyForRecommendations: {
                type: Type.BOOLEAN,
                description: 'True when ready to present concern summary and practitioner matches.',
              },
              hasConcernSummary: {
                type: Type.BOOLEAN,
                description: 'True when summary fields are populated.',
              },
              primaryConcern: { type: Type.STRING },
              durationNote: { type: Type.STRING },
              routineImpact: { type: Type.STRING },
              suggestedConsultationType: { type: Type.STRING },
              keyObservations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              preferredDisciplines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              focusKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              consultationFormat: {
                type: Type.STRING,
                description: 'online, in_person, both, or any',
              },
              maxBudget: {
                type: Type.NUMBER,
                description: 'Maximum budget number if stated by user, otherwise 0.',
              },
              preferredLanguage: { type: Type.STRING },
              preferredLocation: { type: Type.STRING },
            },
            required: [
              'phase',
              'reply',
              'followUpQuestion',
              'suggestedReplies',
              'isUrgent',
              'isMinorContext',
              'readyForRecommendations',
              'hasConcernSummary',
              'preferredDisciplines',
              'focusKeywords',
            ],
          },
        },
      });

      const rawText = (geminiResponse.text || '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsed = JSON.parse(rawText) as Partial<GeminiCompanionStructuredOutput>;

      const finalMinor = isMinorContext || parsed.isMinorContext === true;

      if (parsed.isUrgent === true || parsed.phase === 'urgent_escalation') {
        res.json({
          phase: 'urgent_escalation' as CompanionPhase,
          reply:
            parsed.reply ||
            'Please seek prompt in-person medical evaluation for the symptoms you described.',
          followUpQuestion: null,
          suggestedReplies: [],
          isUrgent: true,
          urgentGuidance:
            parsed.urgentReason ||
            'Please contact local emergency services or visit your nearest urgent care clinic right away instead of continuing wellness chat.',
          isMinorContext: finalMinor,
          summary: null,
          recommendedPractitionerIds: [],
          matchReasonsByPractitionerId: {},
          matchingCriteria: null,
        });
        return;
      }

      const preferredDisciplines = normalizeAYUSHDisciplines(
        Array.isArray(parsed.preferredDisciplines) ? parsed.preferredDisciplines : []
      );
      const formatNormalized =
        parsed.consultationFormat === 'online' ||
        parsed.consultationFormat === 'in_person' ||
        parsed.consultationFormat === 'both'
          ? parsed.consultationFormat
          : null;

      const matchingCriteria: CompanionMatchingCriteria = {
        preferredDisciplines,
        focusKeywords: Array.isArray(parsed.focusKeywords)
          ? parsed.focusKeywords.slice(0, 8).map((k) => String(k).trim())
          : [],
        consultationFormat: formatNormalized,
        maxBudget:
          typeof parsed.maxBudget === 'number' && parsed.maxBudget > 0
            ? parsed.maxBudget
            : null,
        preferredLanguage: parsed.preferredLanguage?.trim() || null,
        preferredLocation: parsed.preferredLocation?.trim() || null,
      };

      const shouldRecommend =
        parsed.readyForRecommendations === true || parsed.phase === 'recommendation_ready';

      const summary: CompanionConcernSummary | null =
        shouldRecommend || parsed.hasConcernSummary
          ? {
              primaryConcern:
                parsed.primaryConcern?.trim() || latestUserMessage.slice(0, 140),
              durationNote: parsed.durationNote?.trim() || undefined,
              routineImpact: parsed.routineImpact?.trim() || undefined,
              suggestedConsultationType:
                parsed.suggestedConsultationType?.trim() ||
                (preferredDisciplines.length > 0
                  ? `${preferredDisciplines[0]} lifestyle consultation`
                  : 'AYUSH wellness consultation'),
              keyObservations: Array.isArray(parsed.keyObservations)
                ? parsed.keyObservations
                    .map((k) => String(k).trim())
                    .filter(Boolean)
                    .slice(0, 4)
                : [],
            }
          : null;

      let recommendedPractitionerIds: string[] = [];
      const matchReasonsByPractitionerId: Record<string, string[]> = {};

      if (shouldRecommend) {
        const matchResult = matchVerifiedPractitioners({
          practitioners,
          criteria: matchingCriteria,
          concernText: combinedUserText,
          isLiveFirebaseMode,
          limit: 4,
        });
        recommendedPractitionerIds = matchResult.matches.map((m) => m.practitioner.id);
        for (const match of matchResult.matches) {
          matchReasonsByPractitionerId[match.practitioner.id] = match.matchReasons;
        }
      }

      const finalPhase: CompanionPhase = shouldRecommend
        ? 'recommendation_ready'
        : parsed.phase === 'contextual_understanding'
        ? 'contextual_understanding'
        : 'follow_up';

      res.json({
        phase: finalPhase,
        reply:
          parsed.reply?.trim() ||
          'Thank you for sharing that. I can help you explore supportive AYUSH wellness options and find an appropriate verified practitioner.',
        followUpQuestion: shouldRecommend
          ? null
          : parsed.followUpQuestion?.trim() || null,
        suggestedReplies: Array.isArray(parsed.suggestedReplies)
          ? parsed.suggestedReplies
              .map((s) => String(s).trim())
              .filter(Boolean)
              .slice(0, 4)
          : [],
        isUrgent: false,
        urgentGuidance: null,
        isMinorContext: finalMinor,
        summary,
        recommendedPractitionerIds,
        matchReasonsByPractitionerId,
        matchingCriteria,
      });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; code?: string; message?: string };
      const status =
        typeof errorObj?.status === 'number' && errorObj.status >= 400 && errorObj.status < 600
          ? errorObj.status
          : 502;
      const message =
        errorObj?.message || 'Unable to reach AYUSH AI Wellness Companion right now.';
      const isRateOrQuota = status === 429 || message.includes('RESOURCE_EXHAUSTED');

      res.status(isRateOrQuota ? 429 : status).json({
        error: isRateOrQuota
          ? 'The AI service is momentarily busy (rate or quota limit reached). Please wait a moment and tap Retry.'
          : message,
        code: errorObj?.code || 'GEMINI_API_ERROR',
        retryable: true,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AYUSH Wellness Connect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AYUSH Wellness Connect server:', err);
  process.exit(1);
});
