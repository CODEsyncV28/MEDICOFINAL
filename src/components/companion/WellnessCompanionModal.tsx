import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
  X,
} from 'lucide-react';
import { DailyActivity, Practitioner } from '../../types';
import { AssessmentVersionRecord, WellnessPlan } from '../../types/assessment';
import {
  AIConversationDocument,
  CompanionChatMessage,
} from '../../types/firebase';
import {
  clearCompanionConversation,
  loadCompanionConversation,
  saveCompanionConversation,
  sendCompanionChatTurn,
} from '../../services/companionService';
import {
  buildConsultationNotesFromSummary,
  buildSanitizedCompanionContext,
  COMPANION_DISCLOSURE_TEXT,
  formatConsultationCharge,
  formatConsultationMode,
  matchVerifiedPractitioners,
} from '../../utils/companionLogic';
import { countCanonicalAnsweredQuestions } from '../../utils/assessmentValidation';

interface WellnessCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isLoggedIn: boolean;
  isConfigured: boolean;
  assessmentAnswers: Record<string, string>;
  totalAssessmentQuestions: number;
  activePlan?: WellnessPlan | null;
  assessmentHistory?: AssessmentVersionRecord[];
  activities: DailyActivity[];
  availablePractitioners: Practitioner[];
  practitionersLoading?: boolean;
  onOpenAssessment: () => void;
  onSelectPractitionerForConsultation: (
    practitioner: Practitioner,
    prefillNotes?: string
  ) => void;
}

function getPractitionerInitials(name: string): string {
  const cleaned = name.replace(/^Dr\.\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const WellnessCompanionModal: React.FC<WellnessCompanionModalProps> = ({
  isOpen,
  onClose,
  userId,
  isLoggedIn,
  isConfigured,
  assessmentAnswers,
  totalAssessmentQuestions,
  activePlan,
  assessmentHistory = [],
  activities,
  availablePractitioners,
  practitionersLoading = false,
  onOpenAssessment,
  onSelectPractitionerForConsultation,
}) => {
  const [session, setSession] = useState<AIConversationDocument | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [canRetryLastTurn, setCanRetryLastTurn] = useState(false);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<'all' | 'online' | 'in_person'>('all');
  const [includeSummaryInBooking, setIncludeSummaryInBooking] = useState(true);
  const [dismissedAssessmentPrompt, setDismissedAssessmentPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const answeredCount = useMemo(
    () => countCanonicalAnsweredQuestions(assessmentAnswers),
    [assessmentAnswers]
  );
  const hasAnyAssessmentData = answeredCount > 0 || Boolean(activePlan);

  const practitionerById = useMemo(() => {
    const map = new Map<string, Practitioner>();
    for (const p of availablePractitioners) {
      map.set(p.id, p);
    }
    return map;
  }, [availablePractitioners]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingSession(true);
    setApiError(null);
    setCanRetryLastTurn(false);

    loadCompanionConversation(userId, isLoggedIn)
      .then((loaded) => {
        if (!isMounted) return;
        setSession(loaded);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, isLoggedIn]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen, session?.messages.length, isSending, apiError]);

  const hasConsent = session?.hasAssessmentConsent ?? false;

  const sanitizedContext = useMemo(
    () =>
      buildSanitizedCompanionContext({
        hasConsent,
        assessmentAnswers,
        totalQuestions: totalAssessmentQuestions,
        activePlan,
        assessmentHistory,
        activities,
      }),
    [
      hasConsent,
      assessmentAnswers,
      totalAssessmentQuestions,
      activePlan,
      assessmentHistory,
      activities,
    ]
  );

  if (!isOpen) return null;

  const handleToggleConsent = async () => {
    if (!session) return;
    const updated: AIConversationDocument = {
      ...session,
      hasAssessmentConsent: !session.hasAssessmentConsent,
      updatedAt: new Date().toISOString(),
    };
    setSession(updated);
    await saveCompanionConversation(updated, isLoggedIn);
  };

  const executeChatTurn = async (messagesToSend: CompanionChatMessage[], currentSession: AIConversationDocument) => {
    setIsSending(true);
    setApiError(null);
    setCanRetryLastTurn(false);

    try {
      const contextPayload = buildSanitizedCompanionContext({
        hasConsent: currentSession.hasAssessmentConsent,
        assessmentAnswers,
        totalQuestions: totalAssessmentQuestions,
        activePlan,
        assessmentHistory,
        activities,
      });

      const response = await sendCompanionChatTurn({
        messages: messagesToSend,
        hasAssessmentConsent: currentSession.hasAssessmentConsent,
        consentedContext: contextPayload,
        practitioners: availablePractitioners,
        isLiveFirebaseMode: isConfigured,
        sessionKey: userId,
      });

      const assistantMessage: CompanionChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        text: response.reply,
        timestamp: new Date().toISOString(),
        phase: response.phase,
        followUpQuestion: response.followUpQuestion,
        suggestedReplies: response.suggestedReplies,
        isUrgent: response.isUrgent,
        urgentGuidance: response.urgentGuidance,
        isMinorContext: response.isMinorContext,
        summary: response.summary,
        recommendedPractitionerIds: response.recommendedPractitionerIds,
        matchReasonsByPractitionerId: response.matchReasonsByPractitionerId,
        matchingCriteria: response.matchingCriteria,
      };

      const nextSession: AIConversationDocument = {
        ...currentSession,
        minorGuardianFlag:
          Boolean(currentSession.minorGuardianFlag) || Boolean(response.isMinorContext),
        latestSummary: response.summary || currentSession.latestSummary || null,
        messages: [...messagesToSend, assistantMessage],
        updatedAt: new Date().toISOString(),
      };

      setSession(nextSession);
      await saveCompanionConversation(nextSession, isLoggedIn);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Unable to reach AYUSH AI Wellness Companion right now.'
      );
      setCanRetryLastTurn(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendText = async (overrideText?: string) => {
    if (!session || isSending) return;
    const text = (overrideText ?? inputValue).trim();
    if (!text) return;

    if (!overrideText) {
      setInputValue('');
    }

    const userMsg: CompanionChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
      phase: 'contextual_understanding',
    };

    const nextMessages = [...session.messages, userMsg];
    const optimisticSession: AIConversationDocument = {
      ...session,
      messages: nextMessages,
      updatedAt: new Date().toISOString(),
    };
    setSession(optimisticSession);
    await saveCompanionConversation(optimisticSession, isLoggedIn);
    await executeChatTurn(nextMessages, optimisticSession);
  };

  const handleRetryLastTurn = async () => {
    if (!session || isSending || session.messages.length === 0) return;
    const last = session.messages[session.messages.length - 1];
    if (last.role !== 'user') return;
    await executeChatTurn(session.messages, session);
  };

  const handleClearChat = async () => {
    if (!session || isSending) return;
    setApiError(null);
    setCanRetryLastTurn(false);
    setExpandedProfileId(null);
    setFormatFilter('all');
    const fresh = await clearCompanionConversation(
      userId,
      session.id,
      session.hasAssessmentConsent,
      isLoggedIn
    );
    setSession(fresh);
  };

  const hasUserMessages = Boolean(session?.messages.some((m) => m.role === 'user'));
  const latestMessage =
    session && session.messages.length > 0
      ? session.messages[session.messages.length - 1]
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ayush-companion-title"
      data-testid="wellness-companion-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-[#F8FAFC] w-full max-w-3xl rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[820px]">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0284C7] to-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="ayush-companion-title"
                  className="text-base sm:text-lg font-serif font-bold text-[#0F172A] truncate"
                >
                  AYUSH AI Wellness Companion
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]">
                  Non-Diagnostic Navigator
                </span>
              </div>
              <p className="text-[11px] text-[#475569] truncate">
                Guided lifestyle navigation &amp; verified practitioner matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClearChat}
              disabled={isSending || isLoadingSession}
              data-testid="companion-clear-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AYUSH AI Wellness Companion"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Disclosure & Assessment Consent Strip */}
        <div className="px-5 py-3 bg-[#F1F5F9] border-b border-[#E2E8F0] space-y-2.5 shrink-0">
          <div className="flex items-start gap-2 text-[11px] text-[#475569] leading-relaxed">
            <Info className="w-3.5 h-3.5 text-[#0284C7] shrink-0 mt-0.5" />
            <span>{COMPANION_DISCLOSURE_TEXT}</span>
          </div>

          {hasAnyAssessmentData ? (
            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#0F172A]">
                    Assessment &amp; Wellness Plan Context
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hasConsent
                        ? 'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {hasConsent ? 'Shared With Consent' : 'Not Shared (Private)'}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  {hasConsent && sanitizedContext
                    ? `Sharing ${sanitizedContext.answeredCount}/${sanitizedContext.totalQuestions} assessment pillars${
                        sanitizedContext.activePlanTitle
                          ? ` · Plan: ${sanitizedContext.activePlanTitle}`
                          : ''
                      } · Dinacharya ${sanitizedContext.dinacharyaCompletedCount}/${sanitizedContext.dinacharyaTotalCount} today (no email or IDs shared).`
                    : 'Allow the companion to read your saved lifestyle rhythm, active plan, and daily habits so it avoids repetitive questions.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hasConsent}
                onClick={handleToggleConsent}
                data-testid="companion-consent-toggle"
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  hasConsent
                    ? 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4] hover:bg-[#99F6E4]/60'
                    : 'bg-[#0284C7] text-white border-[#0284C7] hover:bg-[#0369A1]'
                }`}
              >
                {hasConsent ? 'Revoke Context Access' : 'Allow & Share Context'}
              </button>
            </div>
          ) : (
            !dismissedAssessmentPrompt && (
              <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-[11px] text-[#475569]">
                  <strong>No lifestyle assessment saved yet.</strong> Taking the 20-question assessment helps tailor your navigation, or you can continue directly below.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAssessment();
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg transition-colors"
                  >
                    Take Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedAssessmentPrompt(true)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Continue Without It
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Conversation Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {isLoadingSession ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#475569]">
              <Loader2 className="w-5 h-5 animate-spin text-[#0284C7]" />
              <span>Loading your conversation...</span>
            </div>
          ) : (
            session?.messages.map((msg, idx) => {
              const isLatestAssistant =
                msg.role === 'assistant' && idx === session.messages.length - 1;

              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-[#0284C7] text-white px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs">
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              }

              // Resolve recommended practitioners dynamically against current verified directory
              // and active format filter so displayed profiles are always live and accurate
              const showPractitionerSection =
                msg.phase === 'recommendation_ready' ||
                (msg.recommendedPractitionerIds && msg.recommendedPractitionerIds.length > 0);

              const dynamicMatches = showPractitionerSection
                ? matchVerifiedPractitioners({
                    practitioners: availablePractitioners,
                    criteria: {
                      ...(msg.matchingCriteria || {}),
                      consultationFormat:
                        formatFilter === 'all'
                          ? msg.matchingCriteria?.consultationFormat || null
                          : formatFilter,
                    },
                    isLiveFirebaseMode: isConfigured,
                    limit: 4,
                  })
                : null;

              const displayedMatches =
                dynamicMatches && dynamicMatches.matches.length > 0
                  ? dynamicMatches.matches
                  : (msg.recommendedPractitionerIds || [])
                      .map((id) => practitionerById.get(id))
                      .filter((p): p is Practitioner => Boolean(p))
                      .filter((p) => {
                        if (formatFilter === 'all') return true;
                        if (!p.consultationFormat) return true;
                        return p.consultationFormat === 'both' || p.consultationFormat === formatFilter;
                      })
                      .map((p) => ({
                        practitioner: p,
                        score: 100,
                        matchReasons:
                          msg.matchReasonsByPractitionerId?.[p.id] || [
                            `Specializes in ${p.discipline}`,
                          ],
                      }));

              return (
                <div key={msg.id} className="space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-[#E2E8F0] px-4 py-3.5 text-xs sm:text-sm text-[#0F172A] leading-relaxed shadow-xs space-y-2.5">
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {msg.isUrgent && msg.urgentGuidance && (
                        <div
                          role="alert"
                          data-testid="companion-urgent-banner"
                          className="p-3.5 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/40 text-xs text-[#93000A] space-y-1.5"
                        >
                          <div className="flex items-center gap-2 font-bold">
                            <ShieldAlert className="w-4 h-4 text-[#BA1A1A] shrink-0" />
                            <span>Immediate Medical Attention Recommended</span>
                          </div>
                          <p className="leading-relaxed">{msg.urgentGuidance}</p>
                        </div>
                      )}

                      {msg.isMinorContext && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <span>
                            <strong>Parent / Guardian Guidance:</strong> Because this involves someone under 18, please discuss these wellness options and any practitioner consultation with a parent, legal guardian, or pediatrician first.
                          </span>
                        </div>
                      )}

                      {msg.followUpQuestion && !msg.isUrgent && (
                        <div className="p-3 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-xs text-[#0F172A] font-medium">
                          {msg.followUpQuestion}
                        </div>
                      )}

                      {isLatestAssistant &&
                        !msg.isUrgent &&
                        msg.suggestedReplies &&
                        msg.suggestedReplies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.suggestedReplies.map((replyChip) => (
                              <button
                                key={replyChip}
                                type="button"
                                disabled={isSending}
                                onClick={() => handleSendText(replyChip)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#CCFBF1] border border-[#CBD5E1] hover:border-[#99F6E4] text-[11px] font-medium text-[#0F172A] hover:text-[#0F766E] transition-colors disabled:opacity-50 text-left"
                              >
                                {replyChip}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Neutral Concern Summary */}
                  {msg.summary && !msg.isUrgent && (
                    <div className="ml-1 sm:ml-2 p-4 rounded-xl bg-white border border-[#99F6E4] shadow-xs space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E]">
                          Non-Diagnostic Wellness Concern Summary
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-[#475569] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeSummaryInBooking}
                            onChange={(e) => setIncludeSummaryInBooking(e.target.checked)}
                            className="rounded border-[#CBD5E1] text-[#0284C7]"
                          />
                          <span>Include summary when requesting consultation</span>
                        </label>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-[#0F172A]">
                        {msg.summary.primaryConcern}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#475569]">
                        {msg.summary.durationNote && (
                          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                            <span className="font-semibold text-[#0F172A] block">Duration</span>
                            {msg.summary.durationNote}
                          </div>
                        )}
                        {msg.summary.routineImpact && (
                          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                            <span className="font-semibold text-[#0F172A] block">Routine Impact</span>
                            {msg.summary.routineImpact}
                          </div>
                        )}
                        <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="font-semibold text-[#0F172A] block">Suggested Review</span>
                          {msg.summary.suggestedConsultationType}
                        </div>
                      </div>
                      {msg.summary.keyObservations && msg.summary.keyObservations.length > 0 && (
                        <ul className="list-disc pl-4 text-[11px] text-[#475569] space-y-0.5">
                          {msg.summary.keyObservations.map((obs, obsIdx) => (
                            <li key={obsIdx}>{obs}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Verified Practitioner Recommendations */}
                  {showPractitionerSection && !msg.isUrgent && (
                    <div
                      data-testid="companion-practitioner-recommendations"
                      className="ml-1 sm:ml-2 p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7]">
                            Verified Practitioner Matches
                          </span>
                          <h3 className="text-sm font-serif font-bold text-[#0F172A]">
                            Recommended AYUSH Practitioners
                          </h3>
                        </div>

                        {availablePractitioners.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {(['all', 'online', 'in_person'] as const).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setFormatFilter(mode)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                  formatFilter === mode
                                    ? 'bg-[#0284C7] text-white'
                                    : 'bg-white text-[#475569] border border-[#CBD5E1] hover:bg-slate-50'
                                }`}
                              >
                                {mode === 'all'
                                  ? 'All Modes'
                                  : mode === 'online'
                                  ? 'Online'
                                  : 'In-Person'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {practitionersLoading ? (
                        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex items-center gap-2 text-xs text-[#475569]">
                          <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
                          <span>Checking verified AYUSH practitioner directory...</span>
                        </div>
                      ) : displayedMatches.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white border border-dashed border-[#CBD5E1] text-xs text-[#475569] space-y-2">
                          <p className="font-semibold text-[#0F172A]">
                            {dynamicMatches?.emptyReason ||
                              'No verified AYUSH practitioners match these filters right now.'}
                          </p>
                          {formatFilter !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setFormatFilter('all')}
                              className="px-3 py-1.5 rounded-lg bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1]"
                            >
                              Show All Verified Practitioners
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {displayedMatches.map(({ practitioner: p, matchReasons }) => {
                            const isExpanded = expandedProfileId === p.id;
                            const feeLabel = formatConsultationCharge(
                              p.consultationFee,
                              p.consultationCurrency
                            );

                            return (
                              <div
                                key={p.id}
                                data-testid={`companion-practitioner-card-${p.id}`}
                                className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    {p.photoUrl ? (
                                      <img
                                        src={p.photoUrl}
                                        alt={p.name}
                                        className="w-11 h-11 rounded-full object-cover border border-[#E2E8F0] shrink-0"
                                      />
                                    ) : (
                                      <div className="w-11 h-11 rounded-full bg-[#CCFBF1] text-[#0F766E] font-serif font-bold flex items-center justify-center shrink-0">
                                        {getPractitionerInitials(p.name)}
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-sm text-[#0F172A]">{p.name}</p>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]">
                                          <ShieldCheck className="w-3 h-3 text-[#0D9488]" />
                                          <span>Verified</span>
                                        </span>
                                      </div>
                                      <p className="text-xs text-[#475569]">{p.qualification}</p>
                                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                        <span className="font-semibold text-[#0284C7]">
                                          {p.discipline}
                                        </span>
                                        <span>·</span>
                                        <span className="text-[#475569]">{p.specialization}</span>
                                        {p.experienceYears > 0 && (
                                          <>
                                            <span>·</span>
                                            <span className="text-[#475569]">
                                              {p.experienceYears} yrs exp
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="sm:text-right shrink-0 bg-[#F8FAFC] sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-[#E2E8F0]">
                                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                                      Consultation Fee
                                    </span>
                                    <span className="text-sm font-serif font-bold text-[#0F172A]">
                                      {feeLabel}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#475569]">
                                  <span className="inline-flex items-center gap-1">
                                    <Stethoscope className="w-3.5 h-3.5 text-[#0284C7]" />
                                    {formatConsultationMode(p.consultationFormat)}
                                  </span>
                                  {p.location && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                                      {p.location}
                                    </span>
                                  )}
                                  {p.languages && p.languages.length > 0 && (
                                    <span className="inline-flex items-center gap-1">
                                      <Globe className="w-3.5 h-3.5 text-[#0284C7]" />
                                      {p.languages.join(', ')}
                                    </span>
                                  )}
                                  {p.nextAvailableSlot && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                                      {p.nextAvailableSlot}
                                    </span>
                                  )}
                                </div>

                                {matchReasons.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {matchReasons.map((reason) => (
                                      <span
                                        key={reason}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[10px] font-medium text-[#0F172A]"
                                      >
                                        <CheckCircle2 className="w-3 h-3 text-[#0D9488]" />
                                        {reason}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {isExpanded && (
                                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569] space-y-1.5">
                                    <p className="leading-relaxed">{p.bio}</p>
                                    <p className="text-[11px] font-mono text-[#64748B]">
                                      Registration: {p.councilRegistration}
                                    </p>
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E2E8F0]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedProfileId(isExpanded ? null : p.id)
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
                                  >
                                    <span>{isExpanded ? 'Hide Profile' : 'View Profile'}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const notesPrefill = includeSummaryInBooking
                                        ? buildConsultationNotesFromSummary(msg.summary)
                                        : undefined;
                                      onSelectPractitionerForConsultation(p, notesPrefill);
                                    }}
                                    data-testid={`companion-book-${p.id}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold transition-colors shadow-xs"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Request Consultation</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white border border-[#E2E8F0] px-4 py-3 text-xs text-[#475569] flex items-center gap-2 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
                <span>AYUSH Wellness Companion is reviewing your concern...</span>
              </div>
            </div>
          )}

          {apiError && (
            <div
              role="alert"
              data-testid="companion-error-alert"
              className="p-3.5 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#BA1A1A] shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
              {canRetryLastTurn && (
                <button
                  type="button"
                  onClick={handleRetryLastTurn}
                  disabled={isSending}
                  data-testid="companion-retry-btn"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#BA1A1A]/30 text-[#BA1A1A] font-semibold hover:bg-[#FFDAD6] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendText();
          }}
          className="px-4 sm:px-5 py-3.5 bg-white border-t border-[#E2E8F0] space-y-2 shrink-0"
        >
          {hasUserMessages &&
            latestMessage &&
            !latestMessage.isUrgent &&
            latestMessage.phase !== 'recommendation_ready' && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() =>
                    handleSendText(
                      'Please summarize my concern and show me suitable verified AYUSH practitioners now.'
                    )
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0284C7] hover:text-[#0369A1] disabled:opacity-50"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Skip ahead &amp; match verified practitioners now</span>
                </button>
              </div>
            )}

          <div className="flex items-end gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder="Describe how you have been feeling, your sleep/digestion/stress concerns, or preferences..."
              rows={2}
              maxLength={1500}
              disabled={isSending || isLoadingSession}
              data-testid="companion-input"
              className="flex-1 resize-none text-xs sm:text-sm p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending || isLoadingSession}
              data-testid="companion-send-btn"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
