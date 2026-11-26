import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  Video,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Leaf,
  Info,
  ShieldCheck,
  Loader2,
  LogIn,
  Sun,
  Activity,
  HeartPulse,
  Compass,
  Check,
  History,
  TrendingUp,
  Minus,
  Target,
  ArrowRight,
  Eye,
  Award,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  DailyActivity,
  WellnessProgram,
  EducationalArticle,
  Practitioner,
} from '../../types';
import {
  calculateActivityAdherence,
  getGreetingByTime,
  getAdherenceStatus,
  calculateAssessmentSummary,
  AssessmentSummary,
} from '../../utils/lifestyleLogic';
import {
  WellnessPlan,
  AssessmentVersionRecord,
  AssessmentComparison,
} from '../../types/assessment';
import { UserProfileDocument, ConsultationDocument, ConsultationStatus } from '../../types/firebase';
import {
  EXPANDED_ASSESSMENT_QUESTIONS,
  ASSESSMENT_CATEGORIES,
} from '../../data/assessmentQuestions';
import { countCanonicalAnsweredQuestions } from '../../utils/assessmentValidation';
import {
  getConsultationTopicLabel,
  getPreferredSlotLabel,
} from '../../services/consultationService';
import { GUEST_DINACHARYA_USER_ID } from '../../services/dinacharyaService';
import {
  fetchPublishedArticlesForUser,
  formatPublicationDateLabel,
  PublishedUserArticle,
} from '../../services/contentService';
import {
  enrollInPublishedProgram,
  fetchPublishedProgramsForUser,
  fetchUserProgramEnrollments,
  ProgramEnrollmentRecord,
  PublishedUserProgram,
  seedDemoUserEnrollments,
} from '../../services/programService';
import { SafetyBanner } from '../common/SafetyBanner';

interface UserDashboardProps {
  activities: DailyActivity[];
  onToggleActivity: (id: string) => void;
  programs: WellnessProgram[];
  articles: EducationalArticle[];
  practitioner: Practitioner | null;
  practitionersLoading?: boolean;
  practitionersError?: string | null;
  assessmentAnswers: Record<string, string>;
  totalAssessmentQuestions: number;
  onOpenAssessment: () => void;
  onCompleteAssessment?: (answers: Record<string, string>, categoryNotes?: Record<string, string>) => void;
  onReadArticle: (article: EducationalArticle) => void;
  onConnectPractitioner: () => void;
  onSwitchRole?: () => void;
  demoPortalEnabled?: boolean;
  userProfile?: UserProfileDocument | null;
  userName?: string;
  userEmail?: string | null;
  userUid?: string | null;
  isLoggedIn?: boolean;
  isLoadingData?: boolean;
  isConfigured?: boolean;
  onOpenAuth?: () => void;
  // Enhanced Modular Assessment & Plan Props
  activePlan?: WellnessPlan | null;
  assessmentHistory?: AssessmentVersionRecord[];
  planHistory?: WellnessPlan[];
  // Consultation Requests Props
  consultations?: ConsultationDocument[];
  isLoadingConsultations?: boolean;
  consultationsError?: string | null;
  // Published Catalog Refresh Trigger
  catalogRefreshKey?: number;
}

function getPractitionerInitials(name: string): string {
  const cleaned = name.replace(/^Dr\.\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  activities,
  onToggleActivity,
  programs,
  articles,
  practitioner,
  practitionersLoading = false,
  practitionersError = null,
  assessmentAnswers,
  totalAssessmentQuestions,
  onOpenAssessment,
  onCompleteAssessment,
  onReadArticle,
  onConnectPractitioner,
  onSwitchRole,
  demoPortalEnabled = false,
  userProfile,
  userName,
  userEmail,
  userUid,
  isLoggedIn = false,
  isLoadingData = false,
  isConfigured = false,
  onOpenAuth,
  activePlan,
  assessmentHistory = [],
  planHistory = [],
  consultations = [],
  isLoadingConsultations = false,
  consultationsError = null,
  catalogRefreshKey = 0,
}) => {
  // Activity filter state
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening'>('All');
  
  // Profile card details toggle
  const [showProfileDetails, setShowProfileDetails] = useState<boolean>(true);

  // Question preview accordion state (matches ASSESSMENT_CATEGORIES[0].id = 'circadian')
  const [showQuestionsPreview, setShowQuestionsPreview] = useState<boolean>(false);
  const [selectedPreviewCategory, setSelectedPreviewCategory] = useState<string>(
    ASSESSMENT_CATEGORIES[0]?.id || 'circadian'
  );
  
  // Plan section active tab
  const [activePlanTab, setActivePlanTab] = useState<'routine' | 'habits' | 'sleep' | 'food' | 'movement' | 'stress' | 'goals'>('routine');

  // History inspection modal/drawer state
  const [inspectingVersion, setInspectingVersion] = useState<number | null>(null);

  // Published Learning Corner & Wellness Programmes State (hydrated from contentService & programService)
  const effectiveSeekerUid = userUid || GUEST_DINACHARYA_USER_ID;
  const [publishedArticles, setPublishedArticles] = useState<PublishedUserArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState<boolean>(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  const [publishedPrograms, setPublishedPrograms] = useState<PublishedUserProgram[]>([]);
  const [programEnrollments, setProgramEnrollments] = useState<ProgramEnrollmentRecord[]>([]);
  const [programsLoading, setProgramsLoading] = useState<boolean>(true);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [enrollingProgramId, setEnrollingProgramId] = useState<string | null>(null);
  const [programEnrollNotice, setProgramEnrollNotice] = useState<string | null>(null);
  const [programEnrollError, setProgramEnrollError] = useState<string | null>(null);

  const loadPublishedArticles = useCallback(async () => {
    setArticlesLoading(true);
    setArticlesError(null);
    try {
      const result = await fetchPublishedArticlesForUser({
        demoCatalog: isConfigured ? undefined : articles,
      });
      setPublishedArticles(result);
    } catch (err) {
      setArticlesError(
        err instanceof Error ? err.message : 'Unable to load published educational articles.'
      );
    } finally {
      setArticlesLoading(false);
    }
  }, [articles, isConfigured]);

  const loadPublishedProgramsAndEnrollments = useCallback(async () => {
    setProgramsLoading(true);
    setProgramsError(null);
    try {
      if (!isConfigured && !isLoggedIn && effectiveSeekerUid === GUEST_DINACHARYA_USER_ID) {
        seedDemoUserEnrollments(effectiveSeekerUid);
      }
      const [loadedPrograms, loadedEnrollments] = await Promise.all([
        fetchPublishedProgramsForUser({
          demoCatalog: isConfigured ? undefined : programs,
        }),
        fetchUserProgramEnrollments(effectiveSeekerUid),
      ]);
      setPublishedPrograms(loadedPrograms);
      setProgramEnrollments(loadedEnrollments);
    } catch (err) {
      setProgramsError(
        err instanceof Error ? err.message : 'Unable to load published wellness programmes.'
      );
    } finally {
      setProgramsLoading(false);
    }
  }, [effectiveSeekerUid, isConfigured, isLoggedIn, programs]);

  useEffect(() => {
    loadPublishedArticles();
    loadPublishedProgramsAndEnrollments();
  }, [loadPublishedArticles, loadPublishedProgramsAndEnrollments, catalogRefreshKey]);

  const { enrolledPrograms, availablePrograms } = useMemo(() => {
    const enrollmentByProgramId = new Map<string, ProgramEnrollmentRecord>(
      programEnrollments.map((item) => [item.programId, item])
    );

    const enrolled: Array<PublishedUserProgram & { completedSessions: number }> = [];
    const available: PublishedUserProgram[] = [];

    for (const prog of publishedPrograms) {
      const enrollment = enrollmentByProgramId.get(prog.id);
      if (enrollment) {
        enrolled.push({
          ...prog,
          completedSessions: Math.min(prog.totalSessions, Math.max(0, enrollment.completedSessions)),
        });
      } else {
        available.push(prog);
      }
    }

    return { enrolledPrograms: enrolled, availablePrograms: available };
  }, [publishedPrograms, programEnrollments]);

  const handleEnrollProgram = async (program: PublishedUserProgram) => {
    setProgramEnrollError(null);
    setProgramEnrollNotice(null);
    setEnrollingProgramId(program.id);
    try {
      const record = await enrollInPublishedProgram(effectiveSeekerUid, program.id, programs);
      setProgramEnrollments((prev) => [
        record,
        ...prev.filter((item) => item.programId !== record.programId),
      ]);
      setProgramEnrollNotice(`Enrolled in "${program.title}".`);
      setTimeout(() => setProgramEnrollNotice(null), 4000);
    } catch (err) {
      setProgramEnrollError(
        err instanceof Error ? err.message : 'Unable to enroll in this wellness programme.'
      );
    } finally {
      setEnrollingProgramId(null);
    }
  };

  // Adherence and greetings
  const adherence = calculateActivityAdherence(activities);
  const statusInfo = getAdherenceStatus(adherence);
  const greeting = getGreetingByTime();

  // Assessment calculation (count canonical 20-question IDs)
  const answeredCount = countCanonicalAnsweredQuestions(assessmentAnswers);
  const isAssessmentComplete = answeredCount >= totalAssessmentQuestions && totalAssessmentQuestions > 0;
  const assessmentPercentage = totalAssessmentQuestions > 0
    ? Math.min(100, Math.round((answeredCount / totalAssessmentQuestions) * 100))
    : 0;
  const summary: AssessmentSummary = calculateAssessmentSummary(assessmentAnswers);

  const displayName = userName || (isLoggedIn ? userEmail?.split('@')[0] : 'Seeker');

  // Formatted date
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return 'Today';
    }
  }, []);

  const streakLabel = !isLoggedIn
    ? '4-Day Streak (Demo)'
    : adherence > 0
    ? adherence >= 60
      ? 'Optimal Rhythm Today'
      : '1-Day Active Today'
    : 'Start Today\'s Streak';

  // Weekly consistency
  const todayDayNum = new Date().getDay();
  const normalizedToday = (todayDayNum + 6) % 7;
  const daysLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weeklyRecord = useMemo(() => {
    return daysLabels.map((day, idx) => {
      const isToday = idx === normalizedToday;
      return {
        day,
        isToday,
        status: isToday
          ? adherence >= 40
            ? 'completed'
            : adherence > 0
            ? 'in-progress'
            : 'pending'
          : 'unrecorded',
      };
    });
  }, [normalizedToday, adherence]);

  // Filtered daily activities
  const filteredActivities = useMemo(() => {
    if (selectedTimeFilter === 'All') return activities;
    return activities.filter((a) => a.timeOfDay === selectedTimeFilter);
  }, [activities, selectedTimeFilter]);

  const completedActivitiesCount = activities.filter((a) => a.completed).length;

  // Selected history record & plan for inspection
  const selectedHistoryRecord = useMemo(() => {
    if (!inspectingVersion) return null;
    return assessmentHistory.find((r) => r.version === inspectingVersion) || null;
  }, [inspectingVersion, assessmentHistory]);

  const selectedHistoryPlan = useMemo(() => {
    if (!inspectingVersion) return null;
    return planHistory.find((p) => p.version === inspectingVersion) || null;
  }, [inspectingVersion, planHistory]);

  // Latest comparison if available
  const latestAssessmentRecord = assessmentHistory.length > 0 ? assessmentHistory[0] : null;
  const comparison: AssessmentComparison | null = latestAssessmentRecord?.comparisonWithPrevious || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Account / Storage Status Top Bar */}
      <div className="p-3.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#0F172A]">
        <div className="flex flex-wrap items-center gap-2">
          {isLoggedIn ? (
            <>
              <ShieldCheck className="w-4 h-4 text-[#0284C7] shrink-0" />
              <span>
                <strong>Authenticated Seeker:</strong> Connected as{' '}
                <span className="font-semibold text-[#0F172A]">{userEmail || displayName}</span>.
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isConfigured ? 'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-[#0D9488]' : 'bg-amber-600'}`} />
                {isConfigured ? 'Active Storage: Firebase Cloud Firestore' : 'Active Storage: Local Persistent Demo Storage'}
              </span>
              {assessmentHistory.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CCFBF1] text-[#0F766E]">
                  <Layers className="w-3 h-3" />
                  <span>Version {assessmentHistory[0].version} Active</span>
                </span>
              )}
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-[#0284C7] shrink-0" />
              <span>
                <strong>Demonstration Preview Mode:</strong> Sign in to synchronize your lifestyle assessment, multi-version history, and habit records permanently.
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isConfigured ? 'bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-[#0D9488]' : 'bg-amber-600'}`} />
                {isConfigured ? 'Cloud Firestore Ready' : 'Local Persistent Storage'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!isLoggedIn && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 font-bold text-[#0284C7] hover:text-[#0369A1] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
          {demoPortalEnabled && onSwitchRole && (
            <button
              type="button"
              onClick={onSwitchRole}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 whitespace-nowrap self-start sm:self-auto transition-colors"
            >
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
                DEMO MODE
              </span>
              <span>Switch to Practitioner Portal →</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. WELCOME HEADER */}
      <section className="bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#CCFBF1]/35 rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0284C7]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>{formattedDate}</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-[#475569]">
              <Leaf className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>{greeting}</span>
            </span>
            {activePlan && (
              <>
                <span>·</span>
                <span className="bg-[#CCFBF1] px-2 py-0.5 rounded text-[11px] font-bold text-[#0F766E]">
                  Plan v{activePlan.version} Active
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#0F172A] tracking-tight">
            Welcome to your daily rhythm, {displayName}.
          </h1>

          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            {activePlan
              ? `${activePlan.primaryFocus} — ${activePlan.summary}`
              : 'Aligning personal lifestyle with seasonal transitions. Complete your expanded 20-question assessment to generate your personalized AYUSH Wellness Plan.'}
          </p>
        </div>

        {/* Compact Right Header Adherence Card */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs shrink-0">
          <div className="text-center min-w-[70px]">
            <span className="text-3xl font-serif font-bold text-[#0284C7] tabular-nums">
              {adherence}%
            </span>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mt-0.5">
              Today's Rhythm
            </p>
          </div>
          <div className="h-10 w-[1px] bg-[#E2E8F0]" />
          <div className="space-y-1">
            <span className="inline-block text-xs font-bold text-[#0F172A]">
              {statusInfo.label}
            </span>
            <p className="text-[11px] text-[#64748B]">
              {completedActivitiesCount} of {activities.length} rituals completed
            </p>
          </div>
        </div>
      </section>

      {/* 1B. SEEKER PROFILE OVERVIEW SECTION */}
      <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-serif font-bold text-lg shadow-xs">
              {(userProfile?.displayName || displayName || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#0F172A]">
                  {userProfile?.displayName || displayName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#0D9488]" />
                  <span>Verified Seeker</span>
                </span>
              </div>
              <p className="text-xs text-[#475569]">
                {userProfile?.email || userEmail || 'Demonstration Mode Guest Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowProfileDetails(!showProfileDetails)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <span>{showProfileDetails ? 'Hide Profile Details' : 'View Full Profile Details'}</span>
              {showProfileDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showProfileDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Account Role & Status
              </span>
              <p className="font-semibold text-sm text-[#0F172A]">
                {userProfile?.role === 'admin' ? 'Administrator' : userProfile?.role === 'practitioner' ? 'AYUSH Practitioner' : 'Wellness Seeker'}
              </p>
              <p className="text-[11px] text-[#64748B]">
                Role: <span className="font-mono text-[#0284C7] font-semibold">{userProfile?.role || 'user'}</span> · Active
              </p>
            </div>

            <div className="p-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Authenticated Identifier (UID)
              </span>
              <p className="font-mono text-xs text-[#0F172A] truncate font-semibold" title={userProfile?.uid || userUid || 'guest_seeker'}>
                {userProfile?.uid || userUid || 'guest_seeker'}
              </p>
              <p className="text-[11px] text-[#64748B]">
                Account ownership UID
              </p>
            </div>

            <div className="p-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Assessment & Prakriti
              </span>
              <p className="font-semibold text-sm text-[#0F172A] truncate">
                {activePlan?.constitutionTendency || (assessmentHistory.length > 0 ? assessmentHistory[0].analysis.constitutionTendency : 'Pending Initial Assessment')}
              </p>
              <p className="text-[11px] text-[#64748B]">
                {assessmentHistory.length > 0 ? `Version ${assessmentHistory[0].version} Active Plan` : '20-Question Baseline Pending'}
              </p>
            </div>

            <div className="p-3 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Storage Engine
              </span>
              <p className="font-semibold text-sm text-[#0F172A] flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-[#0D9488]' : 'bg-amber-600'}`} />
                <span>{isConfigured ? 'Cloud Firestore' : 'Local Persistent Storage'}</span>
              </p>
              <p className="text-[11px] text-[#64748B]">
                {userProfile?.createdAt ? `Member since ${new Date(userProfile.createdAt).toLocaleDateString()}` : 'Active session'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 2. WELLNESS OVERVIEW (Compact Statistic Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Habit Adherence */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#0284C7]">
              Dinacharya Adherence
            </span>
            <Activity className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#0F172A] tabular-nums">
              {adherence}%
            </span>
            <span className="text-xs text-[#475569]">
              ({completedActivitiesCount}/{activities.length})
            </span>
          </div>
          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#0284C7] h-full transition-all duration-300"
              style={{ width: `${adherence}%` }}
            />
          </div>
          <p className="text-[11px] text-[#64748B] pt-0.5">
            {completedActivitiesCount === activities.length
              ? 'All daily rituals fulfilled today'
              : `${activities.length - completedActivitiesCount} rituals pending today`}
          </p>
        </div>

        {/* Card 2: Consistency Streak */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-700">
              Consistency Rhythm
            </span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-serif font-bold text-[#0F172A]">
              {streakLabel}
            </span>
          </div>
          <div className="text-[11px] text-[#475569] leading-tight">
            Consistent timing stabilizes natural digestive fire (Agni) and neuroendocrine rhythm.
          </div>
        </div>

        {/* Card 3: Assessment Profile Status */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#0284C7]">
              Assessment & Version
            </span>
            <Compass className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-[#0F172A]">
              {assessmentHistory.length > 0
                ? `Version ${assessmentHistory[0].version}`
                : answeredCount === 0
                ? 'Pending'
                : `${answeredCount}/${totalAssessmentQuestions} Logged`}
            </span>
          </div>
          <p className="text-[11px] text-[#475569] truncate">
            {assessmentHistory.length > 0
              ? `${assessmentHistory[0].analysis.constitutionTendency}`
              : answeredCount === 0
              ? 'Take 20-question self-assessment'
              : summary.constitutionTendency}
          </p>
          <button
            onClick={onOpenAssessment}
            className="text-[11px] font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1"
          >
            <span>{assessmentHistory.length === 0 ? 'Start Assessment' : 'Retake Assessment (v' + (assessmentHistory[0]?.version + 1 || 2) + ')'}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 4: Seasonal Ritucharya Guidance */}
        <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#0284C7]">
              Active Plan Status
            </span>
            <Award className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-serif font-bold text-[#0F172A]">
              {activePlan ? `Plan v${activePlan.version}` : 'Baseline Ready'}
            </span>
          </div>
          <p className="text-[11px] text-[#475569] leading-snug">
            {activePlan
              ? `Generated ${new Date(activePlan.generatedAt).toLocaleDateString()}. Includes 7 daily rituals & ${activePlan.weeklyGoals.length} weekly goals.`
              : 'Complete assessment to generate your personalized Dinacharya routine with "Why" explanations.'}
          </p>
        </div>
      </section>

      {/* 2B. LIFESTYLE ASSESSMENT INTRODUCTION & QUESTION SECTION */}
      <section className="bg-gradient-to-r from-[#F8FAFC] via-[#F1F5F9] to-[#CCFBF1]/35 rounded-2xl p-6 sm:p-8 border border-[#CBD5E1] shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#0284C7] text-white">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {assessmentHistory.length === 0
                  ? 'Step 1: Baseline Lifestyle Assessment Introduction'
                  : `Version ${assessmentHistory[0].version} Assessment Active`}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F172A]">
              {assessmentHistory.length === 0
                ? 'Discover Your Baseline Rhythm Across 8 Dimensions'
                : 'Comprehensive Lifestyle Assessment & Dinacharya Profile'}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              {assessmentHistory.length === 0
                ? `Welcome to AYUSH Wellness Connect, ${displayName}! Our 20-question self-observation evaluates your circadian habits, digestive fire, sleep architecture, movement, stress, hydration, nutrition, and screen exposure to calculate your constitutional tendency and immediately generate your personalized AYUSH Wellness Plan v1.`
                : `Your active plan is calibrated based on Version ${assessmentHistory[0].version} assessment completed on ${new Date(assessmentHistory[0].completedAt).toLocaleDateString()}. You can re-assess anytime as seasons or habits shift to generate an updated plan and compare longitudinal progress.`}
            </p>

            {/* 8 Health Dimensions Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              {ASSESSMENT_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedPreviewCategory(cat.id);
                    setShowQuestionsPreview(true);
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedPreviewCategory === cat.id && showQuestionsPreview
                      ? 'bg-[#CCFBF1]/50 border-[#0284C7] shadow-xs'
                      : 'bg-white/85 border-[#E2E8F0] text-[#0F172A] hover:bg-white'
                  }`}
                >
                  <span className="font-bold block text-[11px] text-[#0284C7]">
                    {cat.order}. {cat.name.split(' ')[0]}
                  </span>
                  <span className="text-[11px] text-[#64748B] line-clamp-1">{cat.traditionalPillar}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center sm:items-start lg:items-end justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAssessment}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] rounded-xl shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0284C7] cursor-pointer"
            >
              <span>
                {assessmentHistory.length === 0
                  ? 'Start 20-Question Assessment'
                  : `Retake Assessment (v${(assessmentHistory[0]?.version || 1) + 1})`}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowQuestionsPreview(!showQuestionsPreview)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] hover:underline"
            >
              <span>{showQuestionsPreview ? 'Hide Questions Preview' : 'Explore All 20 Questions by Dimension'}</span>
              {showQuestionsPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[11px] text-[#64748B]">
              20 Questions · Non-diagnostic · Instant personalized plan
            </span>
          </div>
        </div>

        {/* INTERACTIVE QUESTION PREVIEW DRAWER */}
        {showQuestionsPreview && (
          <div className="pt-4 border-t border-[#CBD5E1] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="font-serif font-bold text-base text-[#0F172A]">
                  Questions in Dimension: {ASSESSMENT_CATEGORIES.find((c) => c.id === selectedPreviewCategory)?.name}
                </h3>
                <p className="text-xs text-[#475569]">
                  {ASSESSMENT_CATEGORIES.find((c) => c.id === selectedPreviewCategory)?.description} · <span className="italic">{ASSESSMENT_CATEGORIES.find((c) => c.id === selectedPreviewCategory)?.traditionalPillar}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {ASSESSMENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedPreviewCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      selectedPreviewCategory === cat.id
                        ? 'bg-[#0284C7] text-white shadow-xs'
                        : 'bg-white text-[#475569] hover:bg-[#F1F5F9] border border-[#CBD5E1]'
                    }`}
                  >
                    {cat.order}. {cat.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {EXPANDED_ASSESSMENT_QUESTIONS.filter((q) => q.category === selectedPreviewCategory).map((q) => {
                const selectedVal = assessmentAnswers[q.id];
                return (
                  <div key={q.id} className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#0284C7] uppercase tracking-wider">
                        Question #{EXPANDED_ASSESSMENT_QUESTIONS.findIndex((item) => item.id === q.id) + 1} of 20
                      </span>
                      {selectedVal && (
                        <span className="text-[10px] bg-[#CCFBF1] text-[#0F766E] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#0D9488]" />
                          <span>Logged</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-sm text-[#0F172A] leading-snug">
                      {q.question}
                    </h4>
                    {q.subtitle && (
                      <p className="text-[11px] text-[#475569] leading-relaxed">
                        {q.subtitle}
                      </p>
                    )}

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt) => (
                        <div
                          key={opt.value}
                          className={`p-2 rounded-lg text-xs border flex items-center justify-between ${
                            selectedVal === opt.value
                              ? 'border-[#0284C7] bg-[#CCFBF1]/40 text-[#0F172A] font-medium'
                              : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-[#64748B] max-w-[50%] text-right truncate">
                            {opt.description}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={onOpenAssessment}
                        className="text-[11px] font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open & Answer in Assessment Modal</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* CORE FEATURE: ACTIVE PERSONALIZED WELLNESS PLAN DISPLAY */}
      {activePlan && (
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-white bg-[#0284C7] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active Personalized Plan · Version {activePlan.version}
                </span>
                <span className="text-xs text-[#475569]">
                  Generated on {new Date(activePlan.generatedAt).toLocaleDateString()}
                </span>
                <span className="text-xs bg-[#CCFBF1] text-[#0F766E] px-2 py-0.5 rounded font-semibold border border-[#99F6E4]">
                  {activePlan.constitutionTendency}
                </span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#0F172A]">
                {activePlan.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#475569] max-w-3xl leading-relaxed">
                {activePlan.summary}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenAssessment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0284C7] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors border border-[#CBD5E1]"
              >
                <span>Re-assess & Update Plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Plan Section Nav Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E2E8F0] pb-3 text-xs">
            {[
              { id: 'routine', label: `Daily Dinacharya (${activePlan.dailyRoutine.length})` },
              { id: 'habits', label: 'Morning & Evening Rituals' },
              { id: 'sleep', label: 'Sleep Suggestions' },
              { id: 'food', label: 'Food Timing & Eating' },
              { id: 'movement', label: 'Physical Activity' },
              { id: 'stress', label: 'Stress & Breathing' },
              { id: 'goals', label: `Weekly Habit Goals (${activePlan.weeklyGoals.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePlanTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activePlanTab === tab.id
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Daily Routine with "Why" */}
          {activePlanTab === 'routine' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-[#0F172A]">
                  Complete Daily Dinacharya Schedule
                </h3>
                <span className="text-xs text-[#475569]">
                  Classical Circadian Timing (Muhurta)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.dailyRoutine.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-2 hover:border-[#CBD5E1] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0284C7] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.time}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#0F766E] bg-[#CCFBF1] px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-[#0F172A]">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {item.action}
                    </p>
                    <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#475569] bg-white p-2.5 rounded-lg">
                      <strong className="text-[#0284C7]">Why: </strong>
                      <span>{item.why}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Morning & Evening Habits */}
          {activePlanTab === 'habits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Morning Habits */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
                  <Sun className="w-4 h-4 text-[#D97706]" />
                  <h3 className="font-serif font-bold text-base text-[#0F172A]">
                    Morning Anchoring Habits
                  </h3>
                </div>
                {activePlan.morningHabits.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-1.5">
                    <h4 className="font-semibold text-sm text-[#0F172A]">{h.title}</h4>
                    <p className="text-xs text-[#475569]">{h.instruction}</p>
                    <p className="text-[11px] text-[#475569] pt-1 border-t border-[#E2E8F0]">
                      <strong className="text-[#0284C7]">Why: </strong>{h.why}
                    </p>
                  </div>
                ))}
              </div>

              {/* Evening Habits */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
                  <Clock className="w-4 h-4 text-[#0284C7]" />
                  <h3 className="font-serif font-bold text-base text-[#0F172A]">
                    Evening Wind-Down Habits
                  </h3>
                </div>
                {activePlan.eveningHabits.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-1.5">
                    <h4 className="font-semibold text-sm text-[#0F172A]">{h.title}</h4>
                    <p className="text-xs text-[#475569]">{h.instruction}</p>
                    <p className="text-[11px] text-[#475569] pt-1 border-t border-[#E2E8F0]">
                      <strong className="text-[#0284C7]">Why: </strong>{h.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Sleep Suggestions */}
          {activePlanTab === 'sleep' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Restorative Nidra & Sleep Architecture Guidelines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activePlan.sleepSuggestions.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-2">
                    <span className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">
                      {s.title}
                    </span>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {s.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#475569]">
                      <strong className="text-[#0284C7]">Why: </strong>{s.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Food & Nutrition */}
          {activePlanTab === 'food' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Food Timing & Balanced Eating (Aahar Niyama)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activePlan.foodAndNutrition.map((f, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-2">
                    <span className="text-xs font-bold text-[#0F766E] bg-[#CCFBF1] px-2 py-0.5 rounded">
                      {f.timingWindow}
                    </span>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {f.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#475569]">
                      <strong className="text-[#0284C7]">Why: </strong>{f.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Physical Activity */}
          {activePlanTab === 'movement' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Daily Movement & Vyayama Recommendations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.physicalActivity.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0F172A]">{m.type}</span>
                      <span className="text-[11px] text-[#475569]">{m.frequency}</span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {m.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#475569]">
                      <strong className="text-[#0284C7]">Why: </strong>{m.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Stress & Breathing */}
          {activePlanTab === 'stress' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Stress Management & Pranayama (Pranic Equilibrium)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.stressAndBreathing.map((st, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0F172A]">{st.practice}</span>
                      <span className="text-[11px] font-semibold text-[#0F766E] bg-[#CCFBF1] px-2 py-0.5 rounded">
                        {st.duration}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {st.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#475569]">
                      <strong className="text-[#0284C7]">Why: </strong>{st.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 7: Weekly Habit Goals */}
          {activePlanTab === 'goals' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Weekly Milestone Goals
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activePlan.weeklyGoals.map((g) => (
                  <div key={g.id} className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0284C7] flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        <span>{g.targetDays} Days / Week</span>
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-[#0F172A]">
                      {g.goal}
                    </h4>
                    <p className="text-[11px] text-[#475569]">
                      <strong className="text-[#0284C7]">Why: </strong>{g.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educational Disclaimer */}
          <div className="p-3.5 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1] text-[11px] text-[#475569] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
            <span>{activePlan.educationalDisclaimer}</span>
          </div>
        </section>
      )}

      {/* ASSESSMENT COMPARISON & PROGRESS DIFF (If Version > 1) */}
      {comparison && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[11px] font-bold text-[#0284C7] uppercase tracking-wider">
                Longitudinal Assessment Progress Diff
              </span>
              <h3 className="text-lg font-serif font-bold text-[#0F172A]">
                Comparison: Version {latestAssessmentRecord?.version} vs. Version {comparison.previousVersion}
              </h3>
              <p className="text-xs text-[#475569]">
                {comparison.summaryNote}
              </p>
            </div>
            <span className="text-xs text-[#64748B]">
              Previous: {new Date(comparison.previousDate).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Improvements */}
            <div className="p-4 rounded-xl bg-[#CCFBF1]/50 border border-[#99F6E4] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#0F766E]">
                <TrendingUp className="w-4 h-4 text-[#0D9488]" />
                <span>Improvements Identified ({comparison.improvements.length})</span>
              </div>
              {comparison.improvements.length > 0 ? (
                <ul className="space-y-1.5 text-[#0F172A]">
                  {comparison.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#64748B] italic">Baseline recorded. Further improvements will emerge across check-ins.</p>
              )}
            </div>

            {/* Unchanged Habits */}
            <div className="p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#475569]">
                <Minus className="w-4 h-4 text-[#64748B]" />
                <span>Unchanged Baseline Habits ({comparison.unchangedHabits.length})</span>
              </div>
              {comparison.unchangedHabits.length > 0 ? (
                <ul className="space-y-1.5 text-[#475569]">
                  {comparison.unchangedHabits.slice(0, 4).map((unc, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                      <span>{unc}</span>
                    </li>
                  ))}
                  {comparison.unchangedHabits.length > 4 && (
                    <li className="text-[11px] text-slate-500 italic">
                      + {comparison.unchangedHabits.length - 4} more steady routines
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-[#64748B] italic">All responses refreshed in this cycle.</p>
              )}
            </div>

            {/* Areas to Work On */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Target className="w-4 h-4 text-amber-700" />
                <span>Focus Areas for this Cycle ({comparison.areasToFocus.length})</span>
              </div>
              {comparison.areasToFocus.length > 0 ? (
                <ul className="space-y-1.5 text-amber-900">
                  {comparison.areasToFocus.map((foc, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>{foc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-amber-800 italic">No urgent imbalances noted; maintain steady Dinacharya consistency.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ASSESSMENT HISTORY & HISTORICAL PLAN ARCHIVE */}
      {assessmentHistory.length > 0 && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#0284C7]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#0F172A]">
                  Assessment History & Plan Archive
                </h3>
                <p className="text-xs text-[#475569]">
                  All past assessments and generated plans are preserved immutably. Never overwritten.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#0284C7] bg-[#F1F5F9] px-2.5 py-1 rounded-md">
              {assessmentHistory.length} Version{assessmentHistory.length > 1 ? 's' : ''} Stored
            </span>
          </div>

          <div className="space-y-3">
            {assessmentHistory.map((rec) => {
              const isActive = rec.version === (latestAssessmentRecord?.version || 1);
              const matchingPlan = planHistory.find((p) => p.version === rec.version);

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-[#CCFBF1]/35 border-[#99F6E4]'
                      : 'bg-[#F1F5F9] border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-[#0F172A]">
                        Version {rec.version} Assessment
                      </span>
                      {isActive && (
                        <span className="text-[10px] bg-[#0284C7] text-white px-2 py-0.5 rounded-full font-bold">
                          Active Version
                        </span>
                      )}
                      <span className="text-xs text-[#64748B]">
                        {new Date(rec.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569]">
                      <strong>Tendency:</strong> {rec.analysis.constitutionTendency} · {rec.analysis.circadianRhythmCategory} · {rec.analysis.digestiveAgniCategory}
                    </p>
                    {matchingPlan && (
                      <p className="text-[11px] text-[#0F766E]">
                        <strong>Generated Plan:</strong> "{matchingPlan.title}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInspectingVersion(rec.version)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] text-[#0F172A] hover:bg-white transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Inspect Version & Plan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* HISTORICAL VERSION INSPECTOR MODAL */}
      {inspectingVersion && selectedHistoryRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#F8FAFC] w-full max-w-3xl rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
                  Historical Record Archive
                </span>
                <h3 className="text-lg font-serif font-bold text-[#0F172A]">
                  Assessment & Plan — Version {selectedHistoryRecord.version}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Completed on {new Date(selectedHistoryRecord.completedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectingVersion(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Analysis Summary */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                <h4 className="font-serif font-bold text-sm text-[#0F172A]">
                  Constitutional & Lifestyle Analysis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500">Tendency: </span>
                    <strong className="text-[#0F172A]">{selectedHistoryRecord.analysis.constitutionTendency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Circadian: </span>
                    <strong className="text-[#0F172A]">{selectedHistoryRecord.analysis.circadianRhythmCategory}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Digestive Agni: </span>
                    <strong className="text-[#0F172A]">{selectedHistoryRecord.analysis.digestiveAgniCategory}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sleep Schedule: </span>
                    <strong className="text-[#0F172A]">{selectedHistoryRecord.analysis.sleepArchitectureCategory}</strong>
                  </div>
                </div>
              </div>

              {/* Historical Generated Plan */}
              {selectedHistoryPlan ? (
                <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <h4 className="font-serif font-bold text-sm text-[#0F172A]">
                      Plan: {selectedHistoryPlan.title}
                    </h4>
                    <span className="text-[11px] text-[#0284C7] font-semibold">
                      v{selectedHistoryPlan.version}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569]">
                    {selectedHistoryPlan.summary}
                  </p>

                  <div className="space-y-2 pt-2">
                    <span className="font-semibold text-[#0F172A]">Daily Dinacharya Preserved:</span>
                    <div className="space-y-1.5">
                      {selectedHistoryPlan.dailyRoutine.map((r, i) => (
                        <div key={i} className="p-2 rounded bg-[#F1F5F9] border border-[#E2E8F0] flex justify-between">
                          <span className="font-medium text-[#0284C7]">{r.time} — {r.title}</span>
                          <span className="text-slate-500 italic">{r.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">No separate plan snapshot stored for this version.</p>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[#E2E8F0] bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingVersion(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (8 cols): Daily Dinacharya + Baseline Summary */}
        <div className="lg:col-span-8 space-y-8">
          {/* TODAY'S DINACHARYA (Daily Habit Checklist) */}
          <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                  Today's Self-Care Routine
                </span>
                <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                  Today's Dinacharya & Habit Checklist
                </h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  Classical daily rituals aligned with circadian cycles. Click each ritual to record completion.
                </p>
              </div>

              {/* Progress Summary */}
              <div className="text-xs text-[#475569] self-start sm:self-auto text-right">
                <span className="font-semibold text-[#0F172A]">
                  {completedActivitiesCount} of {activities.length} completed
                </span>
                <div className="w-28 bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden mt-1 ml-auto">
                  <div
                    className="bg-[#0284C7] h-full transition-all duration-300"
                    style={{ width: `${adherence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Time Filter Controls */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-b border-[#E2E8F0] pb-3 text-xs">
              {(['All', 'Morning', 'Afternoon', 'Evening'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    selectedTimeFilter === filter
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {filter === 'All' ? `All (${activities.length})` : filter}
                </button>
              ))}
            </div>

            {/* Interactive Activities List */}
            <div className="space-y-3">
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onToggleActivity(act.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 select-none ${
                    act.completed
                      ? 'bg-[#CCFBF1]/35 border-[#99F6E4]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  }`}
                  role="checkbox"
                  aria-checked={act.completed}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onToggleActivity(act.id);
                    }
                  }}
                >
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 text-[#0284C7] focus:outline-none"
                    aria-label={`Toggle ${act.title}`}
                  >
                    {act.completed ? (
                      <CheckCircle2 className="w-5 h-5 fill-[#0284C7] text-white" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-[#0284C7] transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold transition-colors ${
                          act.completed
                            ? 'text-[#0F766E] line-through opacity-75'
                            : 'text-[#0F172A]'
                        }`}
                      >
                        {act.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#475569]">
                        <span className="font-medium text-[#0284C7]">{act.timeOfDay}</span>
                        <span>·</span>
                        <span>{act.durationMinutes} mins</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {act.benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* MY WELLNESS ASSESSMENT SUMMARY CARD */}
          <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                  Baseline Profile & Prakriti
                </span>
                <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                  My Wellness Assessment Profile
                </h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  Educational self-observation across circadian rhythm, digestive fire, daily movement, and breath resilience.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenAssessment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto shadow-xs"
              >
                <span>
                  {assessmentHistory.length === 0
                    ? 'Take 20-Question Assessment'
                    : 'Re-assess Lifestyle (New Plan)'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingData ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#475569]">
                <Loader2 className="w-5 h-5 animate-spin text-[#0284C7]" />
                <span>Loading your saved assessment from Firestore...</span>
              </div>
            ) : answeredCount === 0 && assessmentHistory.length === 0 ? (
              <div className="p-8 bg-[#F1F5F9] rounded-xl border border-dashed border-[#CBD5E1] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="font-serif font-bold text-base text-[#0F172A]">
                    No Assessment Recorded Yet
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    Answer 20 questions across 8 lifestyle categories to calculate your baseline rhythm and generate an educational Dinacharya plan.
                  </p>
                </div>
                <button
                  onClick={onOpenAssessment}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors shadow-xs"
                >
                  Start Assessment (20 Questions)
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] space-y-1.5">
                    <div className="flex items-center gap-2 text-[#0284C7]">
                      <Clock className="w-4 h-4 text-[#0284C7]" />
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-[#475569]">
                        Circadian Rhythm & Awakening
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-[#0F172A]">
                      {summary.circadianBalanceCategory}
                    </p>
                    <p className="text-[11px] text-[#64748B] leading-relaxed">
                      Observes natural awakening patterns and transition from night sleep to morning wakefulness.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] space-y-1.5">
                    <div className="flex items-center gap-2 text-[#0284C7]">
                      <Flame className="w-4 h-4 text-[#D97706]" />
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-[#475569]">
                        Digestive Fire (Agni)
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-[#0F172A]">
                      {summary.digestiveAgniCategory}
                    </p>
                    <p className="text-[11px] text-[#64748B] leading-relaxed">
                      Observes natural digestive rhythm and hunger stability across daytime cycles.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[11px] text-[#475569] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                  <span>
                    <strong>Educational Observation:</strong> {summary.guidanceNote}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (4 cols): Consistency + Practitioner + Programs + Learning */}
        <div className="lg:col-span-4 space-y-8">
          {/* WEEKLY CONSISTENCY */}
          <section className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                  Consistency
                </span>
                <h3 className="text-base font-serif font-bold text-[#0F172A]">
                  Weekly Habit Rhythm
                </h3>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                <span>{streakLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {weeklyRecord.map((item, idx) => (
                <div key={idx} className="text-center space-y-1.5">
                  <span
                    className={`text-[11px] font-semibold block ${
                      item.isToday
                        ? 'text-[#0284C7] underline decoration-[#0284C7] decoration-2 underline-offset-4 font-bold'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {item.day}
                  </span>
                  <div
                    className={`h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      item.isToday
                        ? 'ring-2 ring-[#0284C7] ring-offset-1 bg-[#0284C7] text-white shadow-xs'
                        : item.status === 'unrecorded'
                        ? 'bg-[#F1F5F9] text-[#64748B]'
                        : 'bg-[#CCFBF1] text-[#0F766E]'
                    }`}
                  >
                    {item.isToday ? (
                      item.status === 'completed' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        `${adherence}%`
                      )
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[#475569] leading-relaxed pt-1 border-t border-[#E2E8F0]">
              Check-ins reflect genuine habit tracking without fabricated past records.
            </p>
          </section>

          {/* SUPERVISING PRACTITIONER CARD */}
          <section className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
            <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
              Care Guidance
            </span>
            <h3 className="text-base font-serif font-bold text-[#0F172A]">
              Supervising AYUSH Practitioner
            </h3>

            {practitionersLoading ? (
              <div className="p-4 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] flex items-center gap-2 text-xs text-[#475569]">
                <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
                <span>Loading verified AYUSH practitioners...</span>
              </div>
            ) : practitionersError ? (
              <div
                role="alert"
                className="p-4 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#BA1A1A]" />
                <span>{practitionersError}</span>
              </div>
            ) : !practitioner ? (
              <div className="p-4 bg-[#F1F5F9] rounded-xl border border-dashed border-[#CBD5E1] space-y-1.5 text-xs text-[#475569]">
                <p className="font-semibold text-[#0F172A]">
                  No verified AYUSH practitioner is currently available for consultation.
                </p>
                <p className="leading-relaxed">
                  Verified physicians appear here once approved and assigned by a platform administrator.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#CCFBF1] text-[#0F766E] font-serif font-bold flex items-center justify-center shrink-0">
                    {getPractitionerInitials(practitioner.name)}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-[#0F172A]">{practitioner.name}</p>
                    <p className="text-xs text-[#475569]">{practitioner.qualification}</p>
                    <p className="text-[11px] text-[#0284C7] font-medium">{practitioner.specialization}</p>
                  </div>
                </div>

                <div className="pt-2 text-xs text-[#475569] border-t border-[#E2E8F0] space-y-1">
                  <p><strong>Next Virtual Review Window:</strong></p>
                  <p className="text-[#475569]">{practitioner.nextAvailableSlot}</p>
                </div>

                <button
                  type="button"
                  onClick={onConnectPractitioner}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Message or Request Consultation</span>
                </button>
              </div>
            )}

            {/* Persisted Consultation Requests for Current Seeker */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">
                  My Consultation Requests
                </h4>
                <span className="text-[11px] text-[#475569]">
                  {consultations.length} {consultations.length === 1 ? 'Request' : 'Requests'}
                </span>
              </div>

              {isLoadingConsultations ? (
                <div className="p-3 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#475569] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0284C7]" />
                  <span>Loading your consultation requests...</span>
                </div>
              ) : consultationsError ? (
                <div className="p-3 rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A]">
                  {consultationsError}
                </div>
              ) : consultations.length === 0 ? (
                <p className="text-xs text-[#64748B] bg-[#F1F5F9] p-3 rounded-lg border border-dashed border-[#CBD5E1]">
                  No consultation requests submitted yet. Use the button above to schedule a lifestyle review.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {consultations.map((consult) => {
                    const statusBadgeMap: Record<
                      ConsultationStatus,
                      { label: string; className: string }
                    > = {
                      pending: {
                        label: 'Pending Review',
                        className: 'bg-[#FEF3C7] text-[#92400E]',
                      },
                      confirmed: {
                        label: 'Confirmed',
                        className: 'bg-[#CCFBF1] text-[#0F766E]',
                      },
                      rescheduled: {
                        label: 'Rescheduled',
                        className: 'bg-[#F1F5F9] text-[#075985]',
                      },
                      rejected: {
                        label: 'Declined',
                        className: 'bg-[#FFDAD6] text-[#93000A]',
                      },
                      completed: {
                        label: 'Completed',
                        className: 'bg-[#CCFBF1] text-[#0F766E]',
                      },
                      cancelled: {
                        label: 'Cancelled',
                        className: 'bg-slate-100 text-slate-600',
                      },
                    };
                    const badge = statusBadgeMap[consult.status] || statusBadgeMap.pending;

                    return (
                      <div
                        key={consult.id}
                        className="p-3 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] space-y-1.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-[#0F172A] leading-snug">
                            {consult.topicLabel || getConsultationTopicLabel(consult.topic)}
                          </span>
                          <span
                            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#475569]">
                          {consult.practitionerName} ·{' '}
                          {consult.preferredDate ? `${consult.preferredDate} · ` : ''}
                          {getPreferredSlotLabel(consult.preferredSlot)}
                        </p>
                        {consult.scheduledTime && (
                          <p className="text-[11px] font-semibold text-[#0284C7]">
                            Scheduled Appointment: {consult.scheduledTime}
                          </p>
                        )}
                        {consult.practitionerNotes && (
                          <p className="text-[11px] text-[#475569] bg-white p-2 rounded-lg border border-[#E2E8F0]">
                            <strong>Practitioner Note:</strong> {consult.practitionerNotes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ENROLLED & AVAILABLE PUBLISHED WELLNESS PROGRAMMES */}
          <section
            data-testid="user-programmes-section"
            className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                  Active Courses &amp; Catalog
                </span>
                <h3 className="text-base font-serif font-bold text-[#0F172A]">
                  Wellness Programmes
                </h3>
              </div>
              <span className="text-xs text-[#475569]">
                {enrolledPrograms.length} Enrolled · {availablePrograms.length} Available
              </span>
            </div>

            {programEnrollNotice && (
              <div
                role="status"
                className="p-3 rounded-xl bg-[#CCFBF1] border border-[#99F6E4] text-xs font-semibold text-[#0F766E] flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                <span>{programEnrollNotice}</span>
              </div>
            )}

            {programEnrollError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs font-medium text-[#93000A] flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#BA1A1A]" />
                <span>{programEnrollError}</span>
              </div>
            )}

            {programsLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#475569]">
                <Loader2 className="w-5 h-5 animate-spin text-[#0284C7]" />
                <span>Loading published wellness programmes...</span>
              </div>
            ) : programsError ? (
              <div
                role="alert"
                className="p-4 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] space-y-2"
              >
                <p className="font-semibold">{programsError}</p>
                <button
                  type="button"
                  onClick={loadPublishedProgramsAndEnrollments}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#BA1A1A]/30 text-[#BA1A1A] font-semibold hover:bg-[#FFDAD6]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Sub-section 1: Enrolled Regimens */}
                <div data-testid="enrolled-regimens-list" className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">
                      Enrolled Regimens
                    </h4>
                    <span className="text-[11px] text-[#475569]">
                      {enrolledPrograms.length} Enrolled
                    </span>
                  </div>

                  {enrolledPrograms.length === 0 ? (
                    <p className="text-xs text-[#64748B] bg-[#F1F5F9] p-3.5 rounded-xl border border-dashed border-[#CBD5E1]">
                      You have not enrolled in any published programmes yet. Select an approved programme below to start tracking sessions.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {enrolledPrograms.map((prog) => {
                        const progPct =
                          prog.totalSessions > 0
                            ? Math.round((prog.completedSessions / prog.totalSessions) * 100)
                            : 0;

                        return (
                          <div
                            key={prog.id}
                            className="p-4 rounded-xl border border-[#99F6E4] bg-[#CCFBF1]/35 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[#0284C7]">{prog.discipline}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] font-semibold">
                                  Enrolled
                                </span>
                                {prog.isSimulated && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                    Demo Record
                                  </span>
                                )}
                              </div>
                              <span className="tabular-nums font-semibold text-[#0F172A]">{progPct}%</span>
                            </div>

                            <h5 className="font-serif font-bold text-sm text-[#0F172A] leading-snug">
                              {prog.title}
                            </h5>

                            <p className="text-[11px] text-[#475569]">
                              Led by <strong>{prog.practitionerName}</strong> ({prog.practitionerTitle})
                            </p>

                            <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#0284C7] h-full transition-all duration-300"
                                style={{ width: `${progPct}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[#475569]">
                              <span>{prog.completedSessions} of {prog.totalSessions} sessions</span>
                              <span>{prog.durationWeeks} Weeks</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-[#64748B]">
                    Enrollment status and session counts are stored locally in this browser session.
                  </p>
                </div>

                {/* Sub-section 2: Available Published Programmes */}
                <div
                  data-testid="available-programmes-list"
                  className="pt-4 border-t border-[#E2E8F0] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">
                      Available Published Programmes
                    </h4>
                    <span className="text-[11px] text-[#475569]">
                      {availablePrograms.length} Available
                    </span>
                  </div>

                  {availablePrograms.length === 0 ? (
                    <p className="text-xs text-[#64748B] bg-[#F1F5F9] p-3.5 rounded-xl border border-dashed border-[#CBD5E1]">
                      {publishedPrograms.length === 0
                        ? 'No Admin-published wellness programmes are available right now.'
                        : 'You are enrolled in all currently published wellness programmes.'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {availablePrograms.map((prog) => (
                        <div
                          key={prog.id}
                          className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[#475569]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-[#0284C7]">{prog.discipline}</span>
                              <span>·</span>
                              <span>{prog.level}</span>
                            </div>
                            {prog.isSimulated ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                Demo Record
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] font-semibold">
                                Admin Published
                              </span>
                            )}
                          </div>

                          <h5 className="font-serif font-bold text-sm text-[#0F172A] leading-snug">
                            {prog.title}
                          </h5>

                          <p className="text-[11px] text-[#475569] leading-relaxed line-clamp-2">
                            {prog.description}
                          </p>

                          <div className="text-[11px] text-[#475569] space-y-0.5">
                            <p>
                              By <strong>{prog.practitionerName}</strong> · {prog.practitionerTitle}
                            </p>
                            <p>
                              {prog.durationWeeks} Weeks · {prog.totalSessions} sessions
                              {prog.publishedAt ? ` · ${formatPublicationDateLabel(prog.publishedAt)}` : ''}
                            </p>
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              disabled={enrollingProgramId === prog.id}
                              onClick={() => handleEnrollProgram(prog)}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0284C7] bg-white hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-lg transition-colors disabled:opacity-60"
                            >
                              {enrollingProgramId === prog.id ? 'Enrolling...' : 'Enroll in Programme'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* LEARNING CORNER */}
          <section
            data-testid="user-learning-corner"
            className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                  Educational Catalog
                </span>
                <h3 className="text-base font-serif font-bold text-[#0F172A]">
                  Learning Corner
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <span>{publishedArticles.length} Published</span>
                <BookOpen className="w-4 h-4 text-[#0284C7]" />
              </div>
            </div>

            <p className="text-xs text-[#475569]">
              Peer-reviewed, evidence-informed traditional wisdom for daily reading.
            </p>

            {articlesLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-[#475569]">
                <Loader2 className="w-5 h-5 animate-spin text-[#0284C7]" />
                <span>Loading published educational articles...</span>
              </div>
            ) : articlesError ? (
              <div
                role="alert"
                className="p-4 rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] space-y-2"
              >
                <p className="font-semibold">{articlesError}</p>
                <button
                  type="button"
                  onClick={loadPublishedArticles}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#BA1A1A]/30 text-[#BA1A1A] font-semibold hover:bg-[#FFDAD6]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : publishedArticles.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#F1F5F9] border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
                No published educational articles are available right now.
              </div>
            ) : (
              <div className="space-y-3">
                {publishedArticles.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => onReadArticle(art)}
                    className="w-full text-left p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] bg-[#F1F5F9] hover:bg-white transition-colors cursor-pointer space-y-1.5 group block"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#475569]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[#0284C7]">{art.discipline}</span>
                        <span>·</span>
                        <span>{art.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span>{art.readTime}</span>
                        {art.isSimulated ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            Demo Record
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] font-semibold">
                            Published
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs font-semibold text-[#0F172A] group-hover:text-[#0284C7] transition-colors leading-snug">
                      {art.title}
                    </h4>

                    <p className="text-[11px] text-[#475569]">
                      By <strong>{art.author}</strong> ({art.authorQualification}) · {art.reviewedDate}
                    </p>

                    <p className="text-[11px] text-[#475569] line-clamp-2">
                      {art.summary}
                    </p>

                    <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-[#0284C7]">
                      <span>Read educational article</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Safety Notice in Dashboard */}
      <SafetyBanner compact />
    </div>
  );
};
