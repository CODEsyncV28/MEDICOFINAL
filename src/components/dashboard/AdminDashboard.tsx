import React, { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  Stethoscope,
  Activity,
  CheckCircle2,
  XCircle,
  FileCheck,
  TrendingUp,
  Award,
  AlertCircle,
  Info,
  Clock,
  Search,
  Filter,
  Check,
  X,
  Eye,
  FileText,
  Calendar,
  Lock,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Loader2,
  Send,
} from 'lucide-react';
import {
  ContentApprovalItem,
  WellnessProgram,
  EducationalArticle,
  AYUSHDiscipline,
  RoleType,
} from '../../types';
import {
  EducationalArticleDocument,
  WellnessProgramDocument,
  ArticleApprovalStatus,
  ProgramApprovalStatus,
} from '../../types/firebase';
import {
  fetchArticlesForAdminModeration,
  reviewArticleDecision,
} from '../../services/contentService';
import {
  fetchProgramsForAdminApproval,
  reviewProgramDecision,
} from '../../services/programService';
import {
  GovernanceAuditEntry,
  appendGovernanceAuditLog,
  fetchGovernanceAuditLog,
} from '../../services/adminService';
import { SafetyBanner } from '../common/SafetyBanner';

export interface AdminDashboardProps {
  approvalItems?: ContentApprovalItem[];
  onApproveItem?: (id: string) => void;
  onRequestRevision?: (id: string) => void;
  onSwitchRole: () => void;
  programs?: WellnessProgram[];
  articles?: EducationalArticle[];
  reviewerId?: string;
  reviewerName?: string;
  reviewerRole?: RoleType | null;
  isDemoMode?: boolean;
}

interface PractitionerApplication {
  id: string;
  name: string;
  qualification: string;
  discipline: AYUSHDiscipline;
  councilRegistration: string;
  university: string;
  experienceYears: number;
  submittedDate: string;
  status: 'Pending Verification' | 'Verified' | 'Rejected';
  documents: string[];
  reviewNotes?: string;
  isSimulated: boolean;
}

function formatGovernanceDate(iso?: string | null): string {
  if (!iso) return 'Just now';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function getArticleModerationLabel(status: ArticleApprovalStatus): 'Pending Review' | 'Approved' | 'Revision Requested' | 'Draft' {
  if (status === 'published') return 'Approved';
  if (status === 'revision_requested') return 'Revision Requested';
  if (status === 'pending_approval') return 'Pending Review';
  return 'Draft';
}

function getProgramModerationLabel(status: ProgramApprovalStatus): 'Pending Approval' | 'Published in Catalog' | 'Revision Requested' | 'Draft' {
  if (status === 'published') return 'Published in Catalog';
  if (status === 'revision_requested') return 'Revision Requested';
  if (status === 'pending_approval') return 'Pending Approval';
  return 'Draft';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSwitchRole,
  programs = [],
  articles = [],
  reviewerId = 'admin_demo_governance',
  reviewerName = 'Platform Governance Admin',
  reviewerRole = 'admin',
  isDemoMode = false,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'practitioners' | 'content' | 'programs' | 'activity'>('overview');

  // 1. Practitioner Management State
  const [practitioners, setPractitioners] = useState<PractitionerApplication[]>([
    {
      id: 'prac-app-1',
      name: 'Dr. Vikramaditya Joshi',
      qualification: 'BAMS, MD (Panchakarma)',
      discipline: 'Ayurveda',
      councilRegistration: 'CCIM Reg #AY-92144 (Kerala State Board)',
      university: 'Kerala University of Health Sciences',
      experienceYears: 10,
      submittedDate: 'Nov 04, 2026',
      status: 'Pending Verification',
      documents: ['BAMS Degree Certificate', 'CCIM State Registration Certificate', 'Hospital Affiliation Letter'],
      isSimulated: true,
    },
    {
      id: 'prac-app-2',
      name: 'Dr. Hina Fatima',
      qualification: 'BUMS, MD (Ilaj-bil-Tadbeer)',
      discipline: 'Unani',
      councilRegistration: 'Central Council of Indian Medicine (CCIM) / Unani Board Reg #UN-44018',
      university: 'Aligarh Muslim University (Ajmal Khan Tibbiya College)',
      experienceYears: 8,
      submittedDate: 'Nov 03, 2026',
      status: 'Pending Verification',
      documents: ['BUMS Degree Certificate', 'Central Unani Registration', 'Clinical Practice Verification'],
      isSimulated: true,
    },
    {
      id: 'prac-app-3',
      name: 'Dr. K. Senthil Kumar',
      qualification: 'BSMS, MD (Siddha Varmam)',
      discipline: 'Siddha',
      councilRegistration: 'Tamil Nadu Siddha Medical Council Reg #SD-10923',
      university: 'Government Siddha Medical College, Palayamkottai',
      experienceYears: 14,
      submittedDate: 'Oct 28, 2026',
      status: 'Verified',
      documents: ['BSMS Degree Certificate', 'Statutory State Council License'],
      reviewNotes: 'Verified against Tamil Nadu Medical Register on Oct 29, 2026.',
      isSimulated: true,
    },
    {
      id: 'prac-app-4',
      name: 'Dr. Aris Thorne',
      qualification: 'BHMS (Homeopathic Medicine)',
      discipline: 'Homeopathy',
      councilRegistration: 'Unverified Practitioner Listing #HM-99120',
      university: 'Unaccredited Distance Institute',
      experienceYears: 3,
      submittedDate: 'Oct 22, 2026',
      status: 'Rejected',
      documents: ['Unattested Diploma'],
      reviewNotes: 'Rejected: Institution lacks Central Council of Homeopathy accreditation.',
      isSimulated: true,
    },
  ]);

  const [selectedPractitioner, setSelectedPractitioner] = useState<PractitionerApplication | null>(null);

  // 2. Persistent Educational Content Moderation State
  const [submittedArticles, setSubmittedArticles] = useState<EducationalArticleDocument[]>([]);
  const [articlesLoading, setArticlesLoading] = useState<boolean>(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [inspectedArticle, setInspectedArticle] = useState<EducationalArticleDocument | null>(null);
  const [articleReviewNotes, setArticleReviewNotes] = useState<string>('');
  const [articleActionError, setArticleActionError] = useState<string | null>(null);
  const [isModeratingArticle, setIsModeratingArticle] = useState<boolean>(false);
  const [articleActionBanner, setArticleActionBanner] = useState<string | null>(null);

  // 3. Persistent Wellness Programme Approvals State
  const [programApprovalList, setProgramApprovalList] = useState<WellnessProgramDocument[]>([]);
  const [programsLoading, setProgramsLoading] = useState<boolean>(true);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<WellnessProgramDocument | null>(null);
  const [programReviewNotes, setProgramReviewNotes] = useState<string>('');
  const [programActionError, setProgramActionError] = useState<string | null>(null);
  const [isModeratingProgram, setIsModeratingProgram] = useState<boolean>(false);
  const [programActionBanner, setProgramActionBanner] = useState<string | null>(null);

  // 4. Persistent Governance Audit Trail
  const [auditLog, setAuditLog] = useState<GovernanceAuditEntry[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    async function hydrateGovernanceQueues() {
      setArticlesLoading(true);
      setProgramsLoading(true);
      setArticlesError(null);
      setProgramsError(null);

      try {
        const [loadedArticles, loadedPrograms, loadedLogs] = await Promise.all([
          fetchArticlesForAdminModeration(),
          fetchProgramsForAdminApproval(),
          fetchGovernanceAuditLog(),
        ]);
        if (!isMounted) return;
        setSubmittedArticles(loadedArticles);
        setProgramApprovalList(loadedPrograms);
        setAuditLog(loadedLogs);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load governance queues.';
        setArticlesError(msg);
        setProgramsError(msg);
      } finally {
        if (isMounted) {
          setArticlesLoading(false);
          setProgramsLoading(false);
        }
      }
    }

    hydrateGovernanceQueues();
    return () => {
      isMounted = false;
    };
  }, []);

  // Discipline distribution data (Simulated Demo Metrics)
  const disciplineStats = [
    { name: 'Ayurveda', pct: 42, count: '596 seekers' },
    { name: 'Yoga & Naturopathy', pct: 28, count: '398 seekers' },
    { name: 'Unani', pct: 14, count: '198 seekers' },
    { name: 'Siddha', pct: 9, count: '128 seekers' },
    { name: 'Homeopathy', pct: 7, count: '100 seekers' },
  ];

  // Search & Filter for Content Approvals
  const [contentSearch, setContentSearch] = useState('');
  const [contentStatusFilter, setContentStatusFilter] = useState<'All' | 'Pending Review' | 'Approved' | 'Revision Requested'>('All');

  const filteredContentItems = useMemo(() => {
    return submittedArticles.filter((item) => {
      const displayLabel = getArticleModerationLabel(item.status);
      const matchesSearch =
        item.title.toLowerCase().includes(contentSearch.toLowerCase()) ||
        item.authorName.toLowerCase().includes(contentSearch.toLowerCase()) ||
        item.discipline.toLowerCase().includes(contentSearch.toLowerCase());
      const matchesStatus = contentStatusFilter === 'All' || displayLabel === contentStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [submittedArticles, contentSearch, contentStatusFilter]);

  // Counts
  const pendingArticlesCount = submittedArticles.filter((i) => i.status === 'pending_approval').length;
  const pendingPractitionersCount = practitioners.filter((p) => p.status === 'Pending Verification').length;
  const pendingProgramsCount = programApprovalList.filter((p) => p.status === 'pending_approval').length;
  const totalPendingActionItems = pendingArticlesCount + pendingPractitionersCount + pendingProgramsCount;

  // Practitioner Verification Handlers
  const handleApprovePractitioner = async (id: string) => {
    const target = practitioners.find((p) => p.id === id);
    if (!target) return;

    setPractitioners((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: 'Verified', reviewNotes: 'Verified against statutory medical council database by Admin' }
          : p
      )
    );
    setSelectedPractitioner(null);

    const newLog = await appendGovernanceAuditLog({
      action: 'Verified Statutory Practitioner License',
      target: `${target.name} (${target.qualification})`,
      adminId: reviewerId,
      adminName: reviewerName,
      type: 'credential',
      status: 'Approved',
    });
    setAuditLog((prev) => [newLog, ...prev]);
  };

  const handleRejectPractitioner = async (
    id: string,
    reason: string = 'Credentials failed statutory verification check'
  ) => {
    const target = practitioners.find((p) => p.id === id);
    if (!target) return;

    setPractitioners((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: 'Rejected', reviewNotes: reason }
          : p
      )
    );
    setSelectedPractitioner(null);

    const newLog = await appendGovernanceAuditLog({
      action: 'Rejected Practitioner Licensure Application',
      target: `${target.name} (${target.qualification})`,
      adminId: reviewerId,
      adminName: reviewerName,
      type: 'credential',
      status: 'Rejected',
    });
    setAuditLog((prev) => [newLog, ...prev]);
  };

  // Persistent Educational Article Moderation Handlers
  const handleOpenArticleInspection = (article: EducationalArticleDocument) => {
    setInspectedArticle(article);
    setArticleReviewNotes(article.reviewNotes || '');
    setArticleActionError(null);
  };

  const handleModerateArticle = async (
    articleId: string,
    decision: 'published' | 'revision_requested',
    notesOverride?: string
  ) => {
    setArticleActionError(null);
    setIsModeratingArticle(true);
    try {
      const updated = await reviewArticleDecision({
        articleId,
        decision,
        reviewerId,
        reviewerRole,
        reviewNotes: notesOverride !== undefined ? notesOverride : articleReviewNotes,
      });

      setSubmittedArticles((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setInspectedArticle(null);
      setArticleReviewNotes('');
      setArticleActionBanner(
        decision === 'published'
          ? `Approved "${updated.title}" (recorded reviewer ${reviewerId}).`
          : `Revision requested for "${updated.title}" with practitioner feedback.`
      );
      setTimeout(() => setArticleActionBanner(null), 4000);

      const logEntry = await appendGovernanceAuditLog({
        action:
          decision === 'published'
            ? 'Approved Educational Article for Public Catalog'
            : 'Requested Revision on Educational Article',
        target: updated.title,
        adminId: reviewerId,
        adminName: reviewerName,
        type: 'content',
        status: decision === 'published' ? 'Approved' : 'Revision',
        notes: updated.reviewNotes || undefined,
      });
      setAuditLog((prev) => [logEntry, ...prev]);
    } catch (err) {
      setArticleActionError(
        err instanceof Error ? err.message : 'Unable to record article moderation decision.'
      );
    } finally {
      setIsModeratingArticle(false);
    }
  };

  // Persistent Wellness Programme Approval Handlers
  const handleOpenProgramInspection = (program: WellnessProgramDocument) => {
    setSelectedProgram(program);
    setProgramReviewNotes(program.reviewNotes || '');
    setProgramActionError(null);
  };

  const handleModerateProgram = async (
    programId: string,
    decision: 'published' | 'revision_requested',
    notesOverride?: string
  ) => {
    setProgramActionError(null);
    setIsModeratingProgram(true);
    try {
      const updated = await reviewProgramDecision({
        programId,
        decision,
        reviewerId,
        reviewerRole,
        reviewNotes: notesOverride !== undefined ? notesOverride : programReviewNotes,
      });

      setProgramApprovalList((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setSelectedProgram(null);
      setProgramReviewNotes('');
      setProgramActionBanner(
        decision === 'published'
          ? `Approved & published "${updated.title}" (recorded reviewer ${reviewerId}).`
          : `Revision requested for "${updated.title}" with practitioner feedback.`
      );
      setTimeout(() => setProgramActionBanner(null), 4000);

      const logEntry = await appendGovernanceAuditLog({
        action:
          decision === 'published'
            ? 'Approved & Published Wellness Programme'
            : 'Requested Revision for Wellness Programme',
        target: updated.title,
        adminId: reviewerId,
        adminName: reviewerName,
        type: 'program',
        status: decision === 'published' ? 'Approved' : 'Revision',
        notes: updated.reviewNotes || undefined,
      });
      setAuditLog((prev) => [logEntry, ...prev]);
    } catch (err) {
      setProgramActionError(
        err instanceof Error ? err.message : 'Unable to record programme approval decision.'
      );
    } finally {
      setIsModeratingProgram(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Governance Notice */}
      <div className="p-3.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#0F172A]">
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="w-4 h-4 text-[#0284C7] shrink-0" />
          <span>
            <strong>Platform Governance Workspace:</strong> Super Admin access for Statutory Quality Assurance & Verification.
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Full Administrative Privileges
          </span>
          {isDemoMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              DEMO MODE · UI Preview Only
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSwitchRole}
            className="text-[#0284C7] font-bold hover:text-[#0369A1] underline underline-offset-2 whitespace-nowrap transition-colors"
          >
            Return to Seeker Portal →
          </button>
        </div>
      </div>

      {/* 1. PLATFORM OVERVIEW HEADER */}
      <section className="bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#CCFBF1]/35 rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0284C7]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>AYUSH Statutory Governance & Safety Console</span>
            </span>
            <span>·</span>
            <span className="text-amber-700 font-bold">
              {totalPendingActionItems} Action Items Pending Review
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#0F172A] tracking-tight">
            Platform Administration Console
          </h1>

          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            Supervising traditional health standards, statutory doctor credentials (CCIM/State Councils), and educational article publishing to maintain rigorous non-diagnostic compliance.
          </p>
        </div>

        {/* Action summary badge */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs shrink-0">
          <div className="text-center min-w-[70px]">
            <span className="text-3xl font-serif font-bold text-amber-700 tabular-nums">
              {totalPendingActionItems}
            </span>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider mt-0.5">
              Review Queue
            </p>
          </div>
          <div className="h-10 w-[1px] bg-[#E2E8F0]" />
          <div className="space-y-0.5 text-xs">
            <p className="text-[#0F172A] font-bold">
              {pendingArticlesCount} Articles · {pendingPractitionersCount} Licenses
            </p>
            <p className="text-[#64748B]">
              {pendingProgramsCount} Regimen Templates
            </p>
          </div>
        </div>
      </section>

      {/* 1. PLATFORM OVERVIEW METRIC CARDS (Clearly Labeled as Demo Data) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0284C7]">
            System Scale Indicators
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            DEMO DATA · Simulated Platform Scale Metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Users */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#475569]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#0284C7]">
                Total Registered Seekers
              </span>
              <Users className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#0F172A] tabular-nums">
                1,420
              </span>
              <span className="text-xs text-[#0D9488] font-semibold">+18% MoM</span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Simulated metric · Active lifestyle self-trackers
            </p>
          </div>

          {/* Card 2: Verified Practitioners */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#475569]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#0284C7]">
                Verified AYUSH Physicians
              </span>
              <Stethoscope className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#0F172A] tabular-nums">
                84
              </span>
              <span className="text-xs text-[#475569]">Physicians</span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Simulated demo metric · Council registry preview
            </p>
          </div>

          {/* Card 3: Published Articles */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#475569]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#0284C7]">
                Published Wellness Guides
              </span>
              <FileCheck className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#0F172A] tabular-nums">
                {articles.length || 18}
              </span>
              <span className="text-xs text-[#475569]">Guides</span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              {pendingArticlesCount} in moderation queue
            </p>
          </div>

          {/* Card 4: Active Programmes */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#475569]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#0284C7]">
                Active Wellness Regimens
              </span>
              <Award className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#0F172A] tabular-nums">
                {programs.length || 32}
              </span>
              <span className="text-xs text-[#475569]">Regimens</span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Across all 5 statutory AYUSH systems
            </p>
          </div>
        </div>
      </section>

      {/* 6. ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-3 text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
              : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Overview & System Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('practitioners')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'practitioners'
              ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
              : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Practitioner Verifications ({practitioners.length})</span>
          {pendingPractitionersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
              {pendingPractitionersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'content'
              ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
              : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Educational Content Approvals ({submittedArticles.length})</span>
          {pendingArticlesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
              {pendingArticlesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'programs'
              ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
              : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Wellness Programmes ({programApprovalList.length})</span>
          {pendingProgramsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
              {pendingProgramsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'activity'
              ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
              : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Governance Audit Log</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & SYSTEM ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Discipline Breakdown */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
            <div>
              <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                System Distribution
              </span>
              <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                AYUSH Discipline Participation
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Relative seeker enrollment and habit engagement across the 5 traditional systems.
              </p>
            </div>

            <div className="space-y-4">
              {disciplineStats.map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A]">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#475569]">{item.count}</span>
                      <span className="font-bold text-[#0284C7] tabular-nums">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0284C7] h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] text-xs text-[#475569] leading-relaxed">
              Ayurveda and Yoga & Naturopathy represent over 70% of initial seeker engagement, with strong growth in Unani lifestyle temperament tracking and Siddha herbal education.
            </div>
          </div>

          {/* Compliance & Quality Safeguards Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-4">
            <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
              Governance Standard
            </span>
            <h2 className="text-lg font-serif font-bold text-[#0F172A]">
              Safety & Regulatory Guardrails
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0284C7]" />
                  <span>Non-Diagnostic Strict Rule</span>
                </div>
                <p className="text-[#475569]">
                  All educational content and assessment recommendations are programmatically and editorially enforced to remain educational and non-prescriptive.
                </p>
              </div>

              <div className="p-3.5 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                  <Lock className="w-4 h-4 text-[#0284C7]" />
                  <span>Practitioner Publishing Isolation</span>
                </div>
                <p className="text-[#475569]">
                  Practitioners cannot publish articles or regimens directly. Firestore security rules restrict status transitions to Administrator accounts.
                </p>
              </div>

              <div className="p-3.5 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                  <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
                  <span>Statutory CCIM Verification</span>
                </div>
                <p className="text-[#475569]">
                  Only doctors holding valid registration with the Central Council of Indian Medicine or respective State Medical Councils are approved for consultation review.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRACTITIONER MANAGEMENT */}
      {activeTab === 'practitioners' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                  Credentialing Oversight
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Simulated Applications (Demo Queue)
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#0F172A] mt-0.5">
                Practitioner Verification Requests
              </h2>
              <p className="text-xs text-[#475569]">
                Verify medical qualifications and statutory council credentials before granting consultation permissions.
              </p>
            </div>
            <span className="text-xs text-[#475569]">
              {pendingPractitionersCount} Applications Awaiting Decision
            </span>
          </div>

          <div className="space-y-4">
            {practitioners.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-3 hover:border-[#CBD5E1] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-serif font-bold text-base text-[#0F172A]">{app.name}</h4>
                      <span className="text-xs font-semibold text-[#0284C7]">{app.qualification}</span>
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">
                      {app.university} · {app.experienceYears} Years Clinical Experience
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-md font-semibold self-start sm:self-auto ${
                      app.status === 'Verified'
                        ? 'bg-[#CCFBF1] text-[#0F766E]'
                        : app.status === 'Pending Verification'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#FFDAD6] text-[#93000A]'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#E2E8F0] text-xs text-[#475569] space-y-1">
                  <p>
                    <strong>Statutory Registration:</strong> {app.councilRegistration}
                  </p>
                  <p>
                    <strong>Discipline:</strong> {app.discipline} · <strong>Submitted:</strong> {app.submittedDate}
                  </p>
                  {app.reviewNotes && (
                    <p className="text-[#475569] italic">
                      Admin Notes: {app.reviewNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#475569]">
                    <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Documents: {app.documents.join(', ')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPractitioner(app)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#0284C7] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg transition-colors"
                    >
                      Inspect Credentials
                    </button>

                    {app.status === 'Pending Verification' && (
                      <>
                        <button
                          onClick={() => handleApprovePractitioner(app.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg shadow-xs transition-colors"
                        >
                          Verify & Approve
                        </button>
                        <button
                          onClick={() => handleRejectPractitioner(app.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/60 border border-[#BA1A1A]/35 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: CONTENT APPROVAL (Educational Articles) */}
      {activeTab === 'content' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                Editorial Review &amp; Compliance
              </span>
              <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                Educational Article Submissions
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Educational wellness articles submitted by authoring physicians. Private drafts remain hidden until submitted.
              </p>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search articles, authors..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[#CBD5E1] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7] w-full sm:w-60"
                />
              </div>

              <select
                value={contentStatusFilter}
                onChange={(e) => setContentStatusFilter(e.target.value as any)}
                aria-label="Filter content by status"
                className="text-xs p-2 rounded-lg border border-[#CBD5E1] bg-white text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Revision Requested">Revision Requested</option>
              </select>
            </div>
          </div>

          {articleActionBanner && (
            <div className="p-3.5 rounded-lg bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
              <span>{articleActionBanner}</span>
            </div>
          )}

          {articleActionError && !inspectedArticle && (
            <div role="alert" className="p-3.5 rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] font-medium">
              {articleActionError}
            </div>
          )}

          {/* Table */}
          {articlesLoading ? (
            <div className="p-8 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] flex items-center justify-center gap-2 text-xs text-[#475569]">
              <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
              <span>Loading submitted articles...</span>
            </div>
          ) : articlesError ? (
            <div className="p-4 rounded-xl border border-[#BA1A1A]/30 bg-[#FFDAD6] text-xs text-[#93000A]">
              {articlesError}
            </div>
          ) : filteredContentItems.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F1F5F9] text-center text-xs text-[#475569]">
              No submitted educational articles match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0] text-[#475569] font-semibold text-xs">
                  <tr>
                    <th className="py-3 px-4">Article Title</th>
                    <th className="py-3 px-4">Authoring Physician</th>
                    <th className="py-3 px-4">Discipline</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredContentItems.map((item) => {
                    const statusLabel = getArticleModerationLabel(item.status);
                    const isSelfSubmission = item.authorId === reviewerId;
                    return (
                      <tr key={item.id} className="hover:bg-[#F1F5F9] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#0F172A] max-w-xs sm:max-w-md">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{item.title}</span>
                              {item.isSimulated && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                  Demo Record
                                </span>
                              )}
                            </div>
                            {item.reviewNotes && (
                              <p className="text-[11px] text-[#64748B] font-normal">
                                Feedback: {item.reviewNotes}
                              </p>
                            )}
                            {item.reviewedByAdminId && (
                              <p className="text-[10px] text-[#64748B] font-normal">
                                Reviewed by {item.reviewedByAdminId} · {formatGovernanceDate(item.reviewedAt)}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[#475569]">
                          <div>
                            <p className="font-medium text-[#0F172A]">{item.authorName}</p>
                            <p className="text-[11px] text-[#64748B]">{item.authorQualification}</p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs text-[#0284C7] font-medium">
                            {item.discipline}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-[#475569]">
                          {formatGovernanceDate(item.submittedAt || item.updatedAt)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap ${
                              statusLabel === 'Approved'
                                ? 'bg-[#CCFBF1] text-[#0F766E]'
                                : statusLabel === 'Pending Review'
                                ? 'bg-[#FEF7EC] text-[#9A6218]'
                                : 'bg-[#FFDAD6] text-[#93000A]'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenArticleInspection(item)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-[#0284C7] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg transition-colors"
                            >
                              Inspect
                            </button>

                            {item.status === 'pending_approval' && !isSelfSubmission ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isModeratingArticle}
                                  onClick={() => handleModerateArticle(item.id, 'published')}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shadow-xs disabled:opacity-60"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={isModeratingArticle}
                                  onClick={() => handleOpenArticleInspection(item)}
                                  className="px-3 py-1.5 text-xs font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/60 border border-[#BA1A1A]/35 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                                >
                                  Request Revision
                                </button>
                              </>
                            ) : isSelfSubmission ? (
                              <span className="text-[11px] text-[#BA1A1A] font-semibold">Self-review blocked</span>
                            ) : (
                              <span className="text-xs text-[#475569]">Decision Logged</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: WELLNESS PROGRAMME APPROVAL */}
      {activeTab === 'programs' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                Regimen Architecture Governance
              </span>
              <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                Wellness Programme Submissions
              </h2>
              <p className="text-xs text-[#475569]">
                Practitioner-authored regimens must be vetted and approved by an Administrator before entering published catalog status.
              </p>
            </div>
            <span className="text-xs text-[#475569]">
              {pendingProgramsCount} Regimens Awaiting Approval
            </span>
          </div>

          {programActionBanner && (
            <div className="p-3.5 rounded-lg bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
              <span>{programActionBanner}</span>
            </div>
          )}

          {programActionError && !selectedProgram && (
            <div role="alert" className="p-3.5 rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] font-medium">
              {programActionError}
            </div>
          )}

          {programsLoading ? (
            <div className="p-8 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] flex items-center justify-center gap-2 text-xs text-[#475569]">
              <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" />
              <span>Loading submitted wellness programmes...</span>
            </div>
          ) : programsError ? (
            <div className="p-4 rounded-xl border border-[#BA1A1A]/30 bg-[#FFDAD6] text-xs text-[#93000A]">
              {programsError}
            </div>
          ) : programApprovalList.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F1F5F9] text-center text-xs text-[#475569]">
              No wellness programmes have been submitted for Administrator review yet.
            </div>
          ) : (
            <div className="space-y-4">
              {programApprovalList.map((prog) => {
                const statusLabel = getProgramModerationLabel(prog.status);
                const isSelfSubmission = prog.creatorPractitionerId === reviewerId;
                return (
                  <div
                    key={prog.id}
                    className="p-5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] space-y-3 hover:border-[#CBD5E1] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-serif font-bold text-base text-[#0F172A]">{prog.title}</h4>
                          <span className="text-xs font-semibold text-[#0284C7]">{prog.discipline}</span>
                          {prog.isSimulated && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                              Demo Record
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#475569] mt-0.5">
                          Authored by <strong>{prog.practitionerName}</strong> ({prog.practitionerTitle}) · {prog.durationWeeks} Weeks ({prog.level})
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-semibold self-start sm:self-auto ${
                          statusLabel === 'Published in Catalog'
                            ? 'bg-[#CCFBF1] text-[#0F766E]'
                            : statusLabel === 'Pending Approval'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#FFDAD6] text-[#93000A]'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] leading-relaxed bg-white p-3.5 rounded-lg border border-[#E2E8F0]">
                      {prog.description}
                    </p>

                    {prog.reviewNotes && (
                      <div className="text-xs text-[#475569] bg-white p-3 rounded-lg border border-[#E2E8F0] space-y-0.5">
                        <p className="font-semibold text-[#0F172A]">
                          Admin Review Feedback
                          {prog.reviewedByAdminId ? ` (${prog.reviewedByAdminId})` : ''}:
                        </p>
                        <p>{prog.reviewNotes}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#E2E8F0]">
                      <span className="text-[11px] text-[#475569]">
                        Submitted: {formatGovernanceDate(prog.submittedAt || prog.updatedAt)} ·{' '}
                        {prog.isPublished ? 'Published Status (Admin Approved)' : 'Unpublished (Hidden from Seekers)'}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenProgramInspection(prog)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#0284C7] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg transition-colors"
                        >
                          Inspect
                        </button>
                        {prog.status === 'pending_approval' && !isSelfSubmission && (
                          <>
                            <button
                              type="button"
                              disabled={isModeratingProgram}
                              onClick={() => handleModerateProgram(prog.id, 'published')}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg shadow-xs transition-colors disabled:opacity-60"
                            >
                              Approve &amp; Publish
                            </button>
                            <button
                              type="button"
                              disabled={isModeratingProgram}
                              onClick={() => handleOpenProgramInspection(prog)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/60 border border-[#BA1A1A]/35 rounded-lg transition-colors disabled:opacity-60"
                            >
                              Request Revision
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 5: PLATFORM ACTIVITY (Governance Audit Log) */}
      {activeTab === 'activity' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider">
                  System Accountability
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Session Prototype Log (Browser-Local)
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#0F172A] mt-0.5">
                Platform Governance Audit Log
              </h2>
              <p className="text-xs text-[#475569]">
                Immutable administrative record tracking credential verification decisions, content publication approvals, and safety checks.
              </p>
            </div>
            <span className="text-xs text-[#475569]">
              {auditLog.length} Audit Events Logged
            </span>
          </div>

          <div className="space-y-3">
            {auditLog.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#CBD5E1] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      log.status === 'Approved'
                        ? 'bg-[#CCFBF1] text-[#0F766E]'
                        : log.status === 'Rejected'
                        ? 'bg-[#FFDAD6] text-[#93000A]'
                        : 'bg-[#FEF3C7] text-[#92400E]'
                    }`}
                  >
                    {log.status === 'Approved' ? (
                      <Check className="w-4 h-4" />
                    ) : log.status === 'Rejected' ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {log.action}
                      </p>
                      {log.isSimulated && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          Demo Record
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#475569]">
                      Target: <strong>{log.target}</strong>
                    </p>
                    {log.notes && (
                      <p className="text-[11px] text-[#475569] italic">
                        Feedback: {log.notes}
                      </p>
                    )}
                    <p className="text-[11px] text-[#64748B]">
                      Logged by {log.adminName} ({log.adminId})
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-xs shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                      log.status === 'Approved'
                        ? 'bg-[#CCFBF1] text-[#0F766E]'
                        : log.status === 'Rejected'
                        ? 'bg-[#FFDAD6] text-[#93000A]'
                        : 'bg-[#FEF3C7] text-[#92400E]'
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-[11px] text-[#475569]">{formatGovernanceDate(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1] text-xs text-[#475569]">
            <strong>Audit Storage Scope:</strong> Administrative moderation decisions (content articles and wellness programmes) persist across sessions in Cloud Firestore, while this Governance Audit Log timeline is stored in browser-local session storage as a prototype activity feed and is not synced across devices.
          </div>
        </section>
      )}

      {/* INSPECT PRACTITIONER MODAL */}
      {selectedPractitioner && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-prac-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#F8FAFC] w-full max-w-lg rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
                  Licensure Verification (Demo Preview)
                </span>
                <h3 id="inspect-prac-title" className="text-lg font-serif font-bold text-[#0F172A]">
                  {selectedPractitioner.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPractitioner(null)}
                aria-label="Close practitioner inspection dialog"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
              <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-1.5">
                <p><strong>Statutory Qualification:</strong> {selectedPractitioner.qualification}</p>
                <p><strong>Discipline:</strong> {selectedPractitioner.discipline}</p>
                <p><strong>Medical University:</strong> {selectedPractitioner.university}</p>
                <p><strong>Clinical Experience:</strong> {selectedPractitioner.experienceYears} Years</p>
                <p className="text-[#0284C7] font-semibold">
                  Registration Number: {selectedPractitioner.councilRegistration}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-[#0F172A]">Submitted Documentation:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-[#475569]">
                  {selectedPractitioner.documents.map((doc, idx) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-[#F1F5F9] rounded-lg border border-[#CBD5E1] text-xs text-[#0F172A]">
                <strong>Simulated Demo Registry Check:</strong> Illustrative AYUSH council preview data only; not connected to live statutory or government verification registries.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPractitioner(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                {selectedPractitioner.status === 'Pending Verification' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRejectPractitioner(selectedPractitioner.id)}
                      className="px-4 py-2 text-xs font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/60 border border-[#BA1A1A]/35 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePractitioner(selectedPractitioner.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors shadow-xs"
                    >
                      Verify & Approve License
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT ARTICLE CONTENT MODAL */}
      {inspectedArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-art-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#F8FAFC] w-full max-w-xl rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
                  Editorial Quality Inspection
                </span>
                <h3 id="inspect-art-title" className="text-lg font-serif font-bold text-[#0F172A]">
                  {inspectedArticle.title}
                </h3>
                <p className="text-xs text-[#475569]">
                  Authored by {inspectedArticle.authorName} ({inspectedArticle.authorQualification}) · {inspectedArticle.discipline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectedArticle(null);
                  setArticleActionError(null);
                }}
                aria-label="Close article inspection dialog"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {articleActionError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] font-medium"
                >
                  {articleActionError}
                </div>
              )}

              <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-2">
                <span className="text-xs font-semibold text-[#0284C7] uppercase">
                  Educational Summary &amp; Full Draft
                </span>
                <p className="text-xs font-medium text-[#0F172A] leading-relaxed">
                  {inspectedArticle.summary}
                </p>
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-line border-t border-[#E2E8F0] pt-2">
                  {inspectedArticle.fullContent}
                </p>
              </div>

              <div className="p-3 bg-[#CCFBF1]/45 rounded-lg border border-[#99F6E4] text-xs text-[#0F766E]">
                <strong>Compliance Check:</strong> Verify non-diagnostic framing and ensure culinary herbs are clearly distinguished from concentrated therapeutic preparations.
              </div>

              <div>
                <label
                  htmlFor="admin-article-feedback"
                  className="block text-xs font-semibold text-[#0F172A] mb-1"
                >
                  Admin Review &amp; Revision Feedback
                </label>
                <textarea
                  id="admin-article-feedback"
                  rows={3}
                  value={articleReviewNotes}
                  onChange={(e) => setArticleReviewNotes(e.target.value)}
                  placeholder="Enter approval remarks or specific revision instructions for the authoring practitioner..."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CBD5E1] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setInspectedArticle(null);
                    setArticleActionError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                {(inspectedArticle.status === 'pending_approval' ||
                  inspectedArticle.status === 'published') &&
                  inspectedArticle.authorId !== reviewerId && (
                    <button
                      type="button"
                      disabled={isModeratingArticle}
                      onClick={() =>
                        handleModerateArticle(inspectedArticle.id, 'revision_requested')
                      }
                      className="px-4 py-2 text-xs font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/60 border border-[#BA1A1A]/35 rounded-lg transition-colors disabled:opacity-60"
                    >
                      Request Revision
                    </button>
                  )}
                {inspectedArticle.status === 'pending_approval' &&
                  inspectedArticle.authorId !== reviewerId && (
                    <button
                      type="button"
                      disabled={isModeratingArticle}
                      onClick={() => handleModerateArticle(inspectedArticle.id, 'published')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors shadow-xs disabled:opacity-60"
                    >
                      Approve for Public Catalog
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT WELLNESS PROGRAMME MODAL */}
      {selectedProgram && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-prog-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#F8FAFC] w-full max-w-xl rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
                  Regimen Governance Inspection
                </span>
                <h3 id="inspect-prog-title" className="text-lg font-serif font-bold text-[#0F172A]">
                  {selectedProgram.title}
                </h3>
                <p className="text-xs text-[#475569]">
                  Authored by {selectedProgram.practitionerName} ({selectedProgram.practitionerTitle}) · {selectedProgram.discipline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProgram(null);
                  setProgramActionError(null);
                }}
                aria-label="Close programme inspection dialog"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {programActionError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 text-xs text-[#93000A] font-medium"
                >
                  {programActionError}
                </div>
              )}

              <div className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569]">
                  <span><strong>Duration:</strong> {selectedProgram.durationWeeks} Weeks</span>
                  <span>·</span>
                  <span><strong>Level:</strong> {selectedProgram.level}</span>
                  <span>·</span>
                  <span><strong>Sessions:</strong> {selectedProgram.totalSessions}</span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed border-t border-[#E2E8F0] pt-2">
                  {selectedProgram.description}
                </p>
              </div>

              <div>
                <label
                  htmlFor="admin-program-feedback"
                  className="block text-xs font-semibold text-[#0F172A] mb-1"
                >
                  Admin Review &amp; Revision Feedback
                </label>
                <textarea
                  id="admin-program-feedback"
                  rows={3}
                  value={programReviewNotes}
                  onChange={(e) => setProgramReviewNotes(e.target.value)}
                  placeholder="Enter approval remarks or revision instructions returned to the practitioner..."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CBD5E1] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProgram(null);
                    setProgramActionError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                {(selectedProgram.status === 'pending_approval' ||
                  selectedProgram.status === 'published') &&
                  selectedProgram.creatorPractitionerId !== reviewerId && (
                    <button
                      type="button"
                      disabled={isModeratingProgram}
                      onClick={() =>
                        handleModerateProgram(selectedProgram.id, 'revision_requested')
                      }
                      className="px-4 py-2 text-xs font-semibold text-[#BA1A1A] hover:bg-[#FFDAD6]/60 border border-[#BA1A1A]/35 rounded-lg transition-colors disabled:opacity-60"
                    >
                      Request Revision
                    </button>
                  )}
                {selectedProgram.status === 'pending_approval' &&
                  selectedProgram.creatorPractitionerId !== reviewerId && (
                    <button
                      type="button"
                      disabled={isModeratingProgram}
                      onClick={() => handleModerateProgram(selectedProgram.id, 'published')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors shadow-xs disabled:opacity-60"
                    >
                      Approve &amp; Publish
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Notice in Admin Dashboard */}
      <SafetyBanner compact />
    </div>
  );
};
