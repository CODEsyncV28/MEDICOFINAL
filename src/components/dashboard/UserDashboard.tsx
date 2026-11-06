import React, { useState, useMemo } from 'react';
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
import { UserProfileDocument } from '../../types/firebase';
import {
  EXPANDED_ASSESSMENT_QUESTIONS,
  ASSESSMENT_CATEGORIES,
} from '../../data/assessmentQuestions';
import { SafetyBanner } from '../common/SafetyBanner';

interface UserDashboardProps {
  activities: DailyActivity[];
  onToggleActivity: (id: string) => void;
  programs: WellnessProgram[];
  articles: EducationalArticle[];
  practitioner: Practitioner;
  assessmentAnswers: Record<string, string>;
  totalAssessmentQuestions: number;
  onOpenAssessment: () => void;
  onCompleteAssessment?: (answers: Record<string, string>, categoryNotes?: Record<string, string>) => void;
  onReadArticle: (article: EducationalArticle) => void;
  onConnectPractitioner: () => void;
  onSwitchRole: () => void;
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
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  activities,
  onToggleActivity,
  programs,
  articles,
  practitioner,
  assessmentAnswers,
  totalAssessmentQuestions,
  onOpenAssessment,
  onCompleteAssessment,
  onReadArticle,
  onConnectPractitioner,
  onSwitchRole,
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
}) => {
  // Activity filter state
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening'>('All');
  
  // Profile card details toggle
  const [showProfileDetails, setShowProfileDetails] = useState<boolean>(true);

  // Question preview accordion state
  const [showQuestionsPreview, setShowQuestionsPreview] = useState<boolean>(false);
  const [selectedPreviewCategory, setSelectedPreviewCategory] = useState<string>('circadian_rhythm');
  
  // Plan section active tab
  const [activePlanTab, setActivePlanTab] = useState<'routine' | 'habits' | 'sleep' | 'food' | 'movement' | 'stress' | 'goals'>('routine');

  // History inspection modal/drawer state
  const [inspectingVersion, setInspectingVersion] = useState<number | null>(null);

  // Adherence and greetings
  const adherence = calculateActivityAdherence(activities);
  const statusInfo = getAdherenceStatus(adherence);
  const greeting = getGreetingByTime();

  // Assessment calculation
  const answeredCount = Object.keys(assessmentAnswers).filter((k) => !!assessmentAnswers[k]).length;
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
      <div className="p-3.5 rounded-xl bg-[#F4F7F4] border border-[#D5E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#224A34]">
        <div className="flex flex-wrap items-center gap-2">
          {isLoggedIn ? (
            <>
              <ShieldCheck className="w-4 h-4 text-[#2D5A43] shrink-0" />
              <span>
                <strong>Authenticated Seeker:</strong> Connected as{' '}
                <span className="font-semibold text-[#183625]">{userEmail || displayName}</span>.
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E2EBE4] text-[#1E3F2E] border border-[#C8D7CD]">
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                {isConfigured ? 'Active Storage: Firebase Cloud Firestore' : 'Active Storage: Local Persistent Demo Storage'}
              </span>
              {assessmentHistory.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4E4D8] text-[#1D3B2A]">
                  <Layers className="w-3 h-3" />
                  <span>Version {assessmentHistory[0].version} Active</span>
                </span>
              )}
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-[#2D5A43] shrink-0" />
              <span>
                <strong>Demonstration Preview Mode:</strong> Sign in to synchronize your lifestyle assessment, multi-version history, and habit records permanently.
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8EFEA] text-[#224A34] border border-[#CCDCD2]">
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                {isConfigured ? 'Cloud Firestore Ready' : 'Local Persistent Storage'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!isLoggedIn && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 font-bold text-[#2D5A43] hover:text-[#183626] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
          <button
            onClick={onSwitchRole}
            className="text-[#2D5A43] font-bold hover:text-[#183626] underline underline-offset-2 whitespace-nowrap self-start sm:self-auto transition-colors"
          >
            Switch to Practitioner Portal →
          </button>
        </div>
      </div>

      {/* 1. WELCOME HEADER */}
      <section className="bg-gradient-to-br from-[#FAFAF7] via-[#F6F8F5] to-[#EEF4F0] rounded-2xl p-6 sm:p-8 border border-[#E0E7E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#2D5A43]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span>{formattedDate}</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-[#4E6457]">
              <Leaf className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span>{greeting}</span>
            </span>
            {activePlan && (
              <>
                <span>·</span>
                <span className="bg-[#E2ECE5] px-2 py-0.5 rounded text-[11px] font-bold text-[#1C3A29]">
                  Plan v{activePlan.version} Active
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#142A1E] tracking-tight">
            Welcome to your daily rhythm, {displayName}.
          </h1>

          <p className="text-xs sm:text-sm text-[#4E6457] leading-relaxed">
            {activePlan
              ? `${activePlan.primaryFocus} — ${activePlan.summary}`
              : 'Aligning personal lifestyle with seasonal transitions. Complete your expanded 20-question assessment to generate your personalized AYUSH Wellness Plan.'}
          </p>
        </div>

        {/* Compact Right Header Adherence Card */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#D9E4DC] shadow-xs shrink-0">
          <div className="text-center min-w-[70px]">
            <span className="text-3xl font-serif font-bold text-[#2D5A43] tabular-nums">
              {adherence}%
            </span>
            <p className="text-[10px] font-semibold text-[#526B5C] uppercase tracking-wider mt-0.5">
              Today's Rhythm
            </p>
          </div>
          <div className="h-10 w-[1px] bg-[#E3EBE5]" />
          <div className="space-y-1">
            <span className="inline-block text-xs font-bold text-[#1E3F2E]">
              {statusInfo.label}
            </span>
            <p className="text-[11px] text-[#637C6D]">
              {completedActivitiesCount} of {activities.length} rituals completed
            </p>
          </div>
        </div>
      </section>

      {/* 1B. SEEKER PROFILE OVERVIEW SECTION */}
      <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#D5E1D8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEF2EC] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#2D5A43] text-white flex items-center justify-center font-serif font-bold text-lg shadow-xs">
              {(userProfile?.displayName || displayName || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#142A1E]">
                  {userProfile?.displayName || displayName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2ED] text-[#224A34] border border-[#CCDCD2] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#2D5A43]" />
                  <span>Verified Seeker</span>
                </span>
              </div>
              <p className="text-xs text-[#526B5C]">
                {userProfile?.email || userEmail || 'Demonstration Mode Guest Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowProfileDetails(!showProfileDetails)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CCD5CB] text-[#1E3F2E] hover:bg-[#F4F6F2] transition-colors"
            >
              <span>{showProfileDetails ? 'Hide Profile Details' : 'View Full Profile Details'}</span>
              {showProfileDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showProfileDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-[#FAFBF9] rounded-xl border border-[#E4EAE4] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#557160] tracking-wider block">
                Account Role & Status
              </span>
              <p className="font-semibold text-sm text-[#1E3F2E]">
                {userProfile?.role === 'admin' ? 'Administrator' : userProfile?.role === 'practitioner' ? 'AYUSH Practitioner' : 'Wellness Seeker'}
              </p>
              <p className="text-[11px] text-[#637C6D]">
                Role: <span className="font-mono text-[#2D5A43] font-semibold">{userProfile?.role || 'user'}</span> · Active
              </p>
            </div>

            <div className="p-3 bg-[#FAFBF9] rounded-xl border border-[#E4EAE4] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#557160] tracking-wider block">
                Authenticated Identifier (UID)
              </span>
              <p className="font-mono text-xs text-[#1E3F2E] truncate font-semibold" title={userProfile?.uid || userUid || 'guest_seeker'}>
                {userProfile?.uid || userUid || 'guest_seeker'}
              </p>
              <p className="text-[11px] text-[#637C6D]">
                Account ownership UID
              </p>
            </div>

            <div className="p-3 bg-[#FAFBF9] rounded-xl border border-[#E4EAE4] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#557160] tracking-wider block">
                Assessment & Prakriti
              </span>
              <p className="font-semibold text-sm text-[#1E3F2E] truncate">
                {activePlan?.constitutionTendency || (assessmentHistory.length > 0 ? assessmentHistory[0].analysis.constitutionTendency : 'Pending Initial Assessment')}
              </p>
              <p className="text-[11px] text-[#637C6D]">
                {assessmentHistory.length > 0 ? `Version ${assessmentHistory[0].version} Active Plan` : '20-Question Baseline Pending'}
              </p>
            </div>

            <div className="p-3 bg-[#FAFBF9] rounded-xl border border-[#E4EAE4] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#557160] tracking-wider block">
                Storage Engine
              </span>
              <p className="font-semibold text-sm text-[#1E3F2E] flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                <span>{isConfigured ? 'Cloud Firestore' : 'Local Persistent Storage'}</span>
              </p>
              <p className="text-[11px] text-[#637C6D]">
                {userProfile?.createdAt ? `Member since ${new Date(userProfile.createdAt).toLocaleDateString()}` : 'Active session'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 2. WELLNESS OVERVIEW (Compact Statistic Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Habit Adherence */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
              Dinacharya Adherence
            </span>
            <Activity className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
              {adherence}%
            </span>
            <span className="text-xs text-[#526B5C]">
              ({completedActivitiesCount}/{activities.length})
            </span>
          </div>
          <div className="w-full bg-[#EBF0EC] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#2D5A43] h-full transition-all duration-300"
              style={{ width: `${adherence}%` }}
            />
          </div>
          <p className="text-[11px] text-[#5E7869] pt-0.5">
            {completedActivitiesCount === activities.length
              ? 'All daily rituals fulfilled today'
              : `${activities.length - completedActivitiesCount} rituals pending today`}
          </p>
        </div>

        {/* Card 2: Consistency Streak */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#A64B2A]">
              Consistency Rhythm
            </span>
            <Flame className="w-4 h-4 text-[#A64B2A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-serif font-bold text-[#1E3F2E]">
              {streakLabel}
            </span>
          </div>
          <div className="text-[11px] text-[#6E544B] leading-tight">
            Consistent timing stabilizes natural digestive fire (Agni) and neuroendocrine rhythm.
          </div>
        </div>

        {/* Card 3: Assessment Profile Status */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
              Assessment & Version
            </span>
            <Compass className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-[#1E3F2E]">
              {assessmentHistory.length > 0
                ? `Version ${assessmentHistory[0].version}`
                : answeredCount === 0
                ? 'Pending'
                : `${answeredCount}/${totalAssessmentQuestions} Logged`}
            </span>
          </div>
          <p className="text-[11px] text-[#526B5C] truncate">
            {assessmentHistory.length > 0
              ? `${assessmentHistory[0].analysis.constitutionTendency}`
              : answeredCount === 0
              ? 'Take 20-question self-assessment'
              : summary.constitutionTendency}
          </p>
          <button
            onClick={onOpenAssessment}
            className="text-[11px] font-semibold text-[#2D5A43] hover:underline inline-flex items-center gap-1"
          >
            <span>{assessmentHistory.length === 0 ? 'Start Assessment' : 'Retake Assessment (v' + (assessmentHistory[0]?.version + 1 || 2) + ')'}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 4: Seasonal Ritucharya Guidance */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
              Active Plan Status
            </span>
            <Award className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-serif font-bold text-[#1E3F2E]">
              {activePlan ? `Plan v${activePlan.version}` : 'Baseline Ready'}
            </span>
          </div>
          <p className="text-[11px] text-[#526B5C] leading-snug">
            {activePlan
              ? `Generated ${new Date(activePlan.generatedAt).toLocaleDateString()}. Includes 7 daily rituals & ${activePlan.weeklyGoals.length} weekly goals.`
              : 'Complete assessment to generate your personalized Dinacharya routine with "Why" explanations.'}
          </p>
        </div>
      </section>

      {/* 2B. LIFESTYLE ASSESSMENT INTRODUCTION & QUESTION SECTION */}
      <section className="bg-gradient-to-r from-[#FAFBF9] via-[#F4F8F5] to-[#EAF2EC] rounded-2xl p-6 sm:p-8 border border-[#CCDCD2] shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#2D5A43] text-white">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {assessmentHistory.length === 0
                  ? 'Step 1: Baseline Lifestyle Assessment Introduction'
                  : `Version ${assessmentHistory[0].version} Assessment Active`}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#142A1E]">
              {assessmentHistory.length === 0
                ? 'Discover Your Baseline Rhythm Across 8 Dimensions'
                : 'Comprehensive Lifestyle Assessment & Dinacharya Profile'}
            </h2>
            <p className="text-xs sm:text-sm text-[#465E4F] leading-relaxed">
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
                      ? 'bg-[#E0EBE2] border-[#2D5A43] shadow-xs'
                      : 'bg-white/85 border-[#D5E1D8] text-[#244634] hover:bg-white'
                  }`}
                >
                  <span className="font-bold block text-[11px] text-[#2D5A43]">
                    {cat.order}. {cat.name.split(' ')[0]}
                  </span>
                  <span className="text-[11px] text-[#557060] line-clamp-1">{cat.traditionalPillar}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center sm:items-start lg:items-end justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAssessment}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] active:bg-[#1A3728] rounded-xl shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A43] cursor-pointer"
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D5A43] hover:underline"
            >
              <span>{showQuestionsPreview ? 'Hide Questions Preview' : 'Explore All 20 Questions by Dimension'}</span>
              {showQuestionsPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[11px] text-[#5A7364]">
              20 Questions · Non-diagnostic · Instant personalized plan
            </span>
          </div>
        </div>

        {/* INTERACTIVE QUESTION PREVIEW DRAWER */}
        {showQuestionsPreview && (
          <div className="pt-4 border-t border-[#D0DEC7] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                  Questions in Dimension: {ASSESSMENT_CATEGORIES.find((c) => c.id === selectedPreviewCategory)?.name}
                </h3>
                <p className="text-xs text-[#526B5C]">
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
                        ? 'bg-[#2D5A43] text-white shadow-xs'
                        : 'bg-white text-[#4A6455] hover:bg-[#EEF4F0] border border-[#CCD8CF]'
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
                  <div key={q.id} className="p-4 rounded-xl bg-white border border-[#D5E1D8] space-y-2.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#2D5A43] uppercase tracking-wider">
                        Question #{EXPANDED_ASSESSMENT_QUESTIONS.findIndex((item) => item.id === q.id) + 1} of 20
                      </span>
                      {selectedVal && (
                        <span className="text-[10px] bg-[#EBF2ED] text-[#224A34] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Logged</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-sm text-[#142A1E] leading-snug">
                      {q.question}
                    </h4>
                    {q.subtitle && (
                      <p className="text-[11px] text-[#526B5C] leading-relaxed">
                        {q.subtitle}
                      </p>
                    )}

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt) => (
                        <div
                          key={opt.value}
                          className={`p-2 rounded-lg text-xs border flex items-center justify-between ${
                            selectedVal === opt.value
                              ? 'border-[#2D5A43] bg-[#EBF2ED] text-[#1E3F2E] font-medium'
                              : 'border-[#E4EAE4] bg-[#FAFBF9] text-[#405448]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className="text-[10px] text-[#637C6D] max-w-[50%] text-right truncate">
                            {opt.description}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={onOpenAssessment}
                        className="text-[11px] font-semibold text-[#2D5A43] hover:underline inline-flex items-center gap-1"
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
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D5E1D8] shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EEF2EC] pb-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-white bg-[#2D5A43] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Active Personalized Plan · Version {activePlan.version}
                </span>
                <span className="text-xs text-[#526B5C]">
                  Generated on {new Date(activePlan.generatedAt).toLocaleDateString()}
                </span>
                <span className="text-xs bg-[#F0F5F2] text-[#284E38] px-2 py-0.5 rounded font-semibold border border-[#D5E3D8]">
                  {activePlan.constitutionTendency}
                </span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#142A1E]">
                {activePlan.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#4E6758] max-w-3xl leading-relaxed">
                {activePlan.summary}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenAssessment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#2D5A43] bg-[#EBF2ED] hover:bg-[#DEEBE1] rounded-lg transition-colors border border-[#CADDCF]"
              >
                <span>Re-assess & Update Plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Plan Section Nav Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#F0F4F1] pb-3 text-xs">
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
                    ? 'bg-[#2D5A43] text-white shadow-xs'
                    : 'bg-[#F4F7F4] text-[#4E6758] hover:bg-[#E7EFEA]'
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
                <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                  Complete Daily Dinacharya Schedule
                </h3>
                <span className="text-xs text-[#526B5C]">
                  Classical Circadian Timing (Muhurta)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.dailyRoutine.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-2 hover:border-[#CAD8CC] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#2D5A43] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.time}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#668070] bg-[#EEF4F0] px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-[#1E3F2E]">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#3E5646] leading-relaxed">
                      {item.action}
                    </p>
                    <div className="pt-2 border-t border-[#E8EEE9] text-[11px] text-[#587362] bg-[#F3F7F4] p-2.5 rounded-lg">
                      <strong className="text-[#2D5A43]">Why: </strong>
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
                <div className="flex items-center gap-2 border-b border-[#EEF2EC] pb-2">
                  <Sun className="w-4 h-4 text-[#D97706]" />
                  <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                    Morning Anchoring Habits
                  </h3>
                </div>
                {activePlan.morningHabits.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-1.5">
                    <h4 className="font-semibold text-sm text-[#1E3F2E]">{h.title}</h4>
                    <p className="text-xs text-[#3E5646]">{h.instruction}</p>
                    <p className="text-[11px] text-[#587362] pt-1 border-t border-[#E8EEE9]">
                      <strong className="text-[#2D5A43]">Why: </strong>{h.why}
                    </p>
                  </div>
                ))}
              </div>

              {/* Evening Habits */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EEF2EC] pb-2">
                  <Clock className="w-4 h-4 text-[#2D5A43]" />
                  <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                    Evening Wind-Down Habits
                  </h3>
                </div>
                {activePlan.eveningHabits.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-1.5">
                    <h4 className="font-semibold text-sm text-[#1E3F2E]">{h.title}</h4>
                    <p className="text-xs text-[#3E5646]">{h.instruction}</p>
                    <p className="text-[11px] text-[#587362] pt-1 border-t border-[#E8EEE9]">
                      <strong className="text-[#2D5A43]">Why: </strong>{h.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Sleep Suggestions */}
          {activePlanTab === 'sleep' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                Restorative Nidra & Sleep Architecture Guidelines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activePlan.sleepSuggestions.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-2">
                    <span className="text-xs font-bold text-[#2D5A43] uppercase tracking-wider">
                      {s.title}
                    </span>
                    <p className="text-xs text-[#3E5646] leading-relaxed">
                      {s.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E8EEE9] text-[11px] text-[#587362]">
                      <strong className="text-[#2D5A43]">Why: </strong>{s.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Food & Nutrition */}
          {activePlanTab === 'food' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                Food Timing & Balanced Eating (Aahar Niyama)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activePlan.foodAndNutrition.map((f, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-2">
                    <span className="text-xs font-bold text-[#A64B2A] bg-[#FAF2EF] px-2 py-0.5 rounded">
                      {f.timingWindow}
                    </span>
                    <p className="text-xs text-[#3E5646] leading-relaxed">
                      {f.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E8EEE9] text-[11px] text-[#587362]">
                      <strong className="text-[#2D5A43]">Why: </strong>{f.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Physical Activity */}
          {activePlanTab === 'movement' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                Daily Movement & Vyayama Recommendations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.physicalActivity.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1E3F2E]">{m.type}</span>
                      <span className="text-[11px] text-[#526B5C]">{m.frequency}</span>
                    </div>
                    <p className="text-xs text-[#3E5646] leading-relaxed">
                      {m.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E8EEE9] text-[11px] text-[#587362]">
                      <strong className="text-[#2D5A43]">Why: </strong>{m.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Stress & Breathing */}
          {activePlanTab === 'stress' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                Stress Management & Pranayama (Pranic Equilibrium)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.stressAndBreathing.map((st, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1E3F2E]">{st.practice}</span>
                      <span className="text-[11px] font-semibold text-[#2D5A43] bg-[#EEF4F0] px-2 py-0.5 rounded">
                        {st.duration}
                      </span>
                    </div>
                    <p className="text-xs text-[#3E5646] leading-relaxed">
                      {st.guideline}
                    </p>
                    <div className="pt-2 border-t border-[#E8EEE9] text-[11px] text-[#587362]">
                      <strong className="text-[#2D5A43]">Why: </strong>{st.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 7: Weekly Habit Goals */}
          {activePlanTab === 'goals' && (
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                Weekly Milestone Goals
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activePlan.weeklyGoals.map((g) => (
                  <div key={g.id} className="p-4 rounded-xl border border-[#E3EAE4] bg-[#FAFBF9] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#2D5A43] flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        <span>{g.targetDays} Days / Week</span>
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-[#1E3F2E]">
                      {g.goal}
                    </h4>
                    <p className="text-[11px] text-[#587362]">
                      <strong className="text-[#2D5A43]">Why: </strong>{g.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Educational Disclaimer */}
          <div className="p-3.5 bg-[#FAFBF9] rounded-xl border border-[#DCE6DE] text-[11px] text-[#486352] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
            <span>{activePlan.educationalDisclaimer}</span>
          </div>
        </section>
      )}

      {/* ASSESSMENT COMPARISON & PROGRESS DIFF (If Version > 1) */}
      {comparison && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#D9E3DC] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-3">
            <div>
              <span className="text-[11px] font-bold text-[#2D5A43] uppercase tracking-wider">
                Longitudinal Assessment Progress Diff
              </span>
              <h3 className="text-lg font-serif font-bold text-[#1E3F2E]">
                Comparison: Version {latestAssessmentRecord?.version} vs. Version {comparison.previousVersion}
              </h3>
              <p className="text-xs text-[#526B5C]">
                {comparison.summaryNote}
              </p>
            </div>
            <span className="text-xs text-[#6B8576]">
              Previous: {new Date(comparison.previousDate).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Improvements */}
            <div className="p-4 rounded-xl bg-[#F4F9F5] border border-[#CFE2D4] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#1C4E2D]">
                <TrendingUp className="w-4 h-4 text-[#2D5A43]" />
                <span>Improvements Identified ({comparison.improvements.length})</span>
              </div>
              {comparison.improvements.length > 0 ? (
                <ul className="space-y-1.5 text-[#355840]">
                  {comparison.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#688572] italic">Baseline recorded. Further improvements will emerge across check-ins.</p>
              )}
            </div>

            {/* Unchanged Habits */}
            <div className="p-4 rounded-xl bg-[#FAFBF9] border border-[#E4EAE4] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#455E4E]">
                <Minus className="w-4 h-4 text-[#526B5C]" />
                <span>Unchanged Baseline Habits ({comparison.unchangedHabits.length})</span>
              </div>
              {comparison.unchangedHabits.length > 0 ? (
                <ul className="space-y-1.5 text-[#4A6453]">
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
                <p className="text-[#688572] italic">All responses refreshed in this cycle.</p>
              )}
            </div>

            {/* Areas to Work On */}
            <div className="p-4 rounded-xl bg-[#FAF4EF] border border-[#EADBD3] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#A64B2A]">
                <Target className="w-4 h-4 text-[#A64B2A]" />
                <span>Focus Areas for this Cycle ({comparison.areasToFocus.length})</span>
              </div>
              {comparison.areasToFocus.length > 0 ? (
                <ul className="space-y-1.5 text-[#6D4738]">
                  {comparison.areasToFocus.map((foc, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-[#A64B2A] shrink-0 mt-0.5" />
                      <span>{foc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#845E50] italic">No urgent imbalances noted; maintain steady Dinacharya consistency.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ASSESSMENT HISTORY & HISTORICAL PLAN ARCHIVE */}
      {assessmentHistory.length > 0 && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#2D5A43]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                  Assessment History & Plan Archive
                </h3>
                <p className="text-xs text-[#526B5C]">
                  All past assessments and generated plans are preserved immutably. Never overwritten.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#2D5A43] bg-[#EBF2ED] px-2.5 py-1 rounded-md">
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
                      ? 'bg-[#F6FAF7] border-[#CADDCF]'
                      : 'bg-[#FAFBF9] border-[#E4E8E3] hover:border-[#CCD5CB]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-[#1E3F2E]">
                        Version {rec.version} Assessment
                      </span>
                      {isActive && (
                        <span className="text-[10px] bg-[#2D5A43] text-white px-2 py-0.5 rounded-full font-bold">
                          Active Version
                        </span>
                      )}
                      <span className="text-xs text-[#6B8576]">
                        {new Date(rec.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#526B5C]">
                      <strong>Tendency:</strong> {rec.analysis.constitutionTendency} · {rec.analysis.circadianRhythmCategory} · {rec.analysis.digestiveAgniCategory}
                    </p>
                    {matchingPlan && (
                      <p className="text-[11px] text-[#3D5E49]">
                        <strong>Generated Plan:</strong> "{matchingPlan.title}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInspectingVersion(rec.version)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CCD5CB] text-[#1E3F2E] hover:bg-white transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#2D5A43]" />
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
          <div className="bg-[#FAFAF7] w-full max-w-3xl rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Historical Record Archive
                </span>
                <h3 className="text-lg font-serif font-bold text-[#1E3F2E]">
                  Assessment & Plan — Version {selectedHistoryRecord.version}
                </h3>
                <p className="text-xs text-[#6B8576]">
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
              <div className="p-4 rounded-xl bg-white border border-[#E3EAE4] space-y-2">
                <h4 className="font-serif font-bold text-sm text-[#1E3F2E]">
                  Constitutional & Lifestyle Analysis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500">Tendency: </span>
                    <strong className="text-[#1E3F2E]">{selectedHistoryRecord.analysis.constitutionTendency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Circadian: </span>
                    <strong className="text-[#1E3F2E]">{selectedHistoryRecord.analysis.circadianRhythmCategory}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Digestive Agni: </span>
                    <strong className="text-[#1E3F2E]">{selectedHistoryRecord.analysis.digestiveAgniCategory}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sleep Schedule: </span>
                    <strong className="text-[#1E3F2E]">{selectedHistoryRecord.analysis.sleepArchitectureCategory}</strong>
                  </div>
                </div>
              </div>

              {/* Historical Generated Plan */}
              {selectedHistoryPlan ? (
                <div className="p-4 rounded-xl bg-white border border-[#E3EAE4] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#EEF2EC] pb-2">
                    <h4 className="font-serif font-bold text-sm text-[#1E3F2E]">
                      Plan: {selectedHistoryPlan.title}
                    </h4>
                    <span className="text-[11px] text-[#2D5A43] font-semibold">
                      v{selectedHistoryPlan.version}
                    </span>
                  </div>
                  <p className="text-xs text-[#4F6858]">
                    {selectedHistoryPlan.summary}
                  </p>

                  <div className="space-y-2 pt-2">
                    <span className="font-semibold text-[#1E3F2E]">Daily Dinacharya Preserved:</span>
                    <div className="space-y-1.5">
                      {selectedHistoryPlan.dailyRoutine.map((r, i) => (
                        <div key={i} className="p-2 rounded bg-[#FAFBF9] border border-[#EAEFEA] flex justify-between">
                          <span className="font-medium text-[#2D5A43]">{r.time} — {r.title}</span>
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

            <div className="px-6 py-3 border-t border-[#E4E8E3] bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingVersion(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors"
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
          <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Today's Self-Care Routine
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                  Today's Dinacharya & Habit Checklist
                </h2>
                <p className="text-xs text-[#526B5C] mt-0.5">
                  Classical daily rituals aligned with circadian cycles. Click each ritual to record completion.
                </p>
              </div>

              {/* Progress Summary */}
              <div className="text-xs text-[#526B5C] self-start sm:self-auto text-right">
                <span className="font-semibold text-[#1E3F2E]">
                  {completedActivitiesCount} of {activities.length} completed
                </span>
                <div className="w-28 bg-[#E6ECE7] h-1.5 rounded-full overflow-hidden mt-1 ml-auto">
                  <div
                    className="bg-[#2D5A43] h-full transition-all duration-300"
                    style={{ width: `${adherence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Time Filter Controls */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-b border-[#F0F4F1] pb-3 text-xs">
              {(['All', 'Morning', 'Afternoon', 'Evening'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    selectedTimeFilter === filter
                      ? 'bg-[#2D5A43] text-white shadow-xs'
                      : 'bg-[#F2F6F3] text-[#486353] hover:bg-[#E5ECE7]'
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
                      ? 'bg-[#F4F8F5] border-[#CADDCF]'
                      : 'bg-white border-[#E2E8E2] hover:border-[#CAD7CC] hover:bg-[#FAFBF9]'
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
                    className="mt-0.5 shrink-0 text-[#2D5A43] focus:outline-none"
                    aria-label={`Toggle ${act.title}`}
                  >
                    {act.completed ? (
                      <CheckCircle2 className="w-5 h-5 fill-[#2D5A43] text-white" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-300 hover:text-[#2D5A43] transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold transition-colors ${
                          act.completed
                            ? 'text-[#2D503B] line-through opacity-75'
                            : 'text-[#142A1E]'
                        }`}
                      >
                        {act.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#526B5C]">
                        <span className="font-medium text-[#2D5A43]">{act.timeOfDay}</span>
                        <span>·</span>
                        <span>{act.durationMinutes} mins</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#526B5C] leading-relaxed">
                      {act.benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* MY WELLNESS ASSESSMENT SUMMARY CARD */}
          <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-4">
              <div>
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Baseline Profile & Prakriti
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                  My Wellness Assessment Profile
                </h2>
                <p className="text-xs text-[#526B5C] mt-0.5">
                  Educational self-observation across circadian rhythm, digestive fire, daily movement, and breath resilience.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenAssessment}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto shadow-xs"
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
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#526B5C]">
                <Loader2 className="w-5 h-5 animate-spin text-[#2D5A43]" />
                <span>Loading your saved assessment from Firestore...</span>
              </div>
            ) : answeredCount === 0 && assessmentHistory.length === 0 ? (
              <div className="p-8 bg-[#FAFBF9] rounded-xl border border-dashed border-[#CFDCD3] text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#EBF2ED] text-[#2D5A43] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                    No Assessment Recorded Yet
                  </h3>
                  <p className="text-xs text-[#526B5C] leading-relaxed">
                    Answer 20 questions across 8 lifestyle categories to calculate your baseline rhythm and generate an educational Dinacharya plan.
                  </p>
                </div>
                <button
                  onClick={onOpenAssessment}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
                >
                  Start Assessment (20 Questions)
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-4 rounded-xl bg-[#FAFBF9] border border-[#E3E8E3] space-y-1.5">
                    <div className="flex items-center gap-2 text-[#2D5A43]">
                      <Clock className="w-4 h-4 text-[#2D5A43]" />
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-[#526B5C]">
                        Circadian Rhythm & Awakening
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-[#1E3F2E]">
                      {summary.circadianBalanceCategory}
                    </p>
                    <p className="text-[11px] text-[#5E7969] leading-relaxed">
                      Observes natural awakening patterns and transition from night sleep to morning wakefulness.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAFBF9] border border-[#E3E8E3] space-y-1.5">
                    <div className="flex items-center gap-2 text-[#2D5A43]">
                      <Flame className="w-4 h-4 text-[#D97706]" />
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-[#526B5C]">
                        Digestive Fire (Agni)
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-[#1E3F2E]">
                      {summary.digestiveAgniCategory}
                    </p>
                    <p className="text-[11px] text-[#5E7969] leading-relaxed">
                      Observes natural digestive rhythm and hunger stability across daytime cycles.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#FBFDFB] rounded-lg border border-[#E4ECE5] text-[11px] text-[#4E6657] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
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
          <section className="bg-white rounded-2xl p-6 border border-[#E0E7E1] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Consistency
                </span>
                <h3 className="text-base font-serif font-bold text-[#1E3F2E]">
                  Weekly Habit Rhythm
                </h3>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-[#A64B2A] bg-[#FAF2EF] px-2.5 py-1 rounded-md border border-[#F0DCD5]">
                <Flame className="w-3.5 h-3.5 fill-[#A64B2A]" />
                <span>{streakLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {weeklyRecord.map((item, idx) => (
                <div key={idx} className="text-center space-y-1.5">
                  <span
                    className={`text-[11px] font-semibold block ${
                      item.isToday
                        ? 'text-[#2D5A43] underline decoration-[#2D5A43] decoration-2 underline-offset-4 font-bold'
                        : 'text-[#637C6D]'
                    }`}
                  >
                    {item.day}
                  </span>
                  <div
                    className={`h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      item.isToday
                        ? 'ring-2 ring-[#2D5A43] ring-offset-1 bg-[#2D5A43] text-white shadow-xs'
                        : item.status === 'unrecorded'
                        ? 'bg-[#F2F5F2] text-[#8DA094]'
                        : 'bg-[#EBF2ED] text-[#2D5A43]'
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

            <p className="text-[11px] text-[#526B5C] leading-relaxed pt-1 border-t border-[#EEF2EC]">
              Check-ins reflect genuine habit tracking without fabricated past records.
            </p>
          </section>

          {/* SUPERVISING PRACTITIONER CARD */}
          <section className="bg-white rounded-2xl p-6 border border-[#E0E7E1] shadow-xs space-y-4">
            <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
              Care Guidance
            </span>
            <h3 className="text-base font-serif font-bold text-[#1E3F2E]">
              Supervising AYUSH Practitioner
            </h3>

            <div className="p-4 bg-[#FAFBF9] rounded-xl border border-[#E3E8E3] space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[#E5EDE7] text-[#2D5A43] font-serif font-bold flex items-center justify-center shrink-0">
                  AS
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-[#1E3F2E]">{practitioner.name}</p>
                  <p className="text-xs text-[#526B5C]">{practitioner.qualification}</p>
                  <p className="text-[11px] text-[#2D5A43] font-medium">{practitioner.specialization}</p>
                </div>
              </div>

              <div className="pt-2 text-xs text-[#405648] border-t border-[#E8ECE6] space-y-1">
                <p><strong>Next Virtual Review Window:</strong></p>
                <p className="text-[#526B5C]">{practitioner.nextAvailableSlot}</p>
              </div>

              <button
                type="button"
                onClick={onConnectPractitioner}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Message or Request Consultation</span>
              </button>
            </div>
          </section>

          {/* ENROLLED WELLNESS PROGRAMMES */}
          <section className="bg-white rounded-2xl p-6 border border-[#E0E7E1] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Active Courses
                </span>
                <h3 className="text-base font-serif font-bold text-[#1E3F2E]">
                  Enrolled Regimens
                </h3>
              </div>
              <span className="text-xs text-[#526B5C]">
                {programs.length} Regimens
              </span>
            </div>

            <div className="space-y-3">
              {programs.slice(0, 2).map((prog) => {
                const progPct = Math.round((prog.completedSessions / prog.totalSessions) * 100);

                return (
                  <div
                    key={prog.id}
                    className="p-4 rounded-xl border border-[#E4E8E3] bg-[#FAFBF9] space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-[#526B5C]">
                      <span className="font-semibold text-[#2D5A43]">{prog.discipline}</span>
                      <span className="tabular-nums font-semibold text-[#1E3F2E]">{progPct}%</span>
                    </div>

                    <h4 className="font-serif font-bold text-sm text-[#1E3F2E] leading-snug">
                      {prog.title}
                    </h4>

                    <div className="w-full bg-[#E5ECE7] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#2D5A43] h-full transition-all duration-300"
                        style={{ width: `${progPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#526B5C]">
                      <span>{prog.completedSessions} of {prog.totalSessions} sessions</span>
                      <span>{prog.durationWeeks} Weeks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* LEARNING CORNER */}
          <section className="bg-white rounded-2xl p-6 border border-[#E0E7E1] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Educational Catalog
                </span>
                <h3 className="text-base font-serif font-bold text-[#1E3F2E]">
                  Learning Corner
                </h3>
              </div>
              <BookOpen className="w-4 h-4 text-[#2D5A43]" />
            </div>

            <p className="text-xs text-[#526B5C]">
              Peer-reviewed, evidence-informed traditional wisdom for daily reading.
            </p>

            <div className="space-y-3">
              {articles.slice(0, 3).map((art) => (
                <div
                  key={art.id}
                  onClick={() => onReadArticle(art)}
                  className="p-3.5 rounded-xl border border-[#E3E8E3] hover:border-[#CAD7CC] bg-[#FAFBF9] hover:bg-white transition-colors cursor-pointer space-y-1.5 group select-none"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#526B5C]">
                    <span className="font-semibold text-[#2D5A43]">{art.discipline}</span>
                    <span>{art.readTime}</span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#1E3F2E] group-hover:text-[#2D5A43] transition-colors leading-snug">
                    {art.title}
                  </h4>

                  <p className="text-[11px] text-[#526B5C] line-clamp-2">
                    {art.summary}
                  </p>

                  <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-[#2D5A43]">
                    <span>Read educational article</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Safety Notice in Dashboard */}
      <SafetyBanner compact />
    </div>
  );
};
