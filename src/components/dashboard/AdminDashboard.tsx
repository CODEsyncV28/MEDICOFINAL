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
} from 'lucide-react';
import {
  ContentApprovalItem,
  WellnessProgram,
  EducationalArticle,
  AYUSHDiscipline,
} from '../../types';
import { SafetyBanner } from '../common/SafetyBanner';

export interface AdminDashboardProps {
  approvalItems: ContentApprovalItem[];
  onApproveItem: (id: string) => void;
  onRequestRevision: (id: string) => void;
  onSwitchRole: () => void;
  programs?: WellnessProgram[];
  articles?: EducationalArticle[];
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

interface ProgramApprovalItem {
  id: string;
  title: string;
  authorName: string;
  authorTitle: string;
  discipline: AYUSHDiscipline;
  durationWeeks: number;
  level: 'Beginner' | 'Intermediate' | 'Deepening';
  description: string;
  submittedDate: string;
  status: 'Pending Approval' | 'Approved' | 'Revision Requested';
  reviewNotes?: string;
}

interface GovernanceLogEntry {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  adminName: string;
  type: 'content' | 'credential' | 'program' | 'system';
  status: 'Approved' | 'Rejected' | 'Revision' | 'Enforced';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  approvalItems,
  onApproveItem,
  onRequestRevision,
  onSwitchRole,
  programs = [],
  articles = [],
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

  // 2. Program Approvals State
  const [programApprovalList, setProgramApprovalList] = useState<ProgramApprovalItem[]>([
    {
      id: 'prog-app-1',
      title: 'Post-Pandemic Respiratory Pranayama & Herbal Steam',
      authorName: 'Dr. Ananya Sharma',
      authorTitle: 'BAMS, MD (Ayurveda)',
      discipline: 'Ayurveda',
      durationWeeks: 4,
      level: 'Beginner',
      description: 'Progressive diaphragmatic and herbal inhalation protocol focusing on respiratory comfort, natural mucus expulsion, and bronchial calming.',
      submittedDate: 'Nov 04, 2026',
      status: 'Pending Approval',
    },
    {
      id: 'prog-app-2',
      title: 'Dravidian Varmam & Joint Rejuvenation Protocol',
      authorName: 'Dr. K. Senthil Kumar',
      authorTitle: 'BSMS, MD (Siddha)',
      discipline: 'Siddha',
      durationWeeks: 3,
      level: 'Intermediate',
      description: 'Classical Siddha joint lubrication exercises, herbal poultice recommendations, and pressure point awareness for stiffness.',
      submittedDate: 'Nov 03, 2026',
      status: 'Pending Approval',
    },
    {
      id: 'prog-app-3',
      title: 'Dinacharya: 21-Day Circadian Alignment',
      authorName: 'Dr. Ananya Sharma',
      authorTitle: 'BAMS, MD (Ayurveda)',
      discipline: 'Ayurveda',
      durationWeeks: 3,
      level: 'Beginner',
      description: 'Comprehensive guided daily routine covering wake-up hydration, tongue scraping, mindful meals, and evening digital curfew.',
      submittedDate: 'Oct 20, 2026',
      status: 'Approved',
      reviewNotes: 'Meets non-diagnostic educational wellness guidelines.',
    },
  ]);

  const [selectedProgram, setSelectedProgram] = useState<ProgramApprovalItem | null>(null);

  // 3. Content Inspection Modal
  const [inspectedArticle, setInspectedArticle] = useState<ContentApprovalItem | null>(null);

  // 4. Governance Audit Trail
  const [auditLog, setAuditLog] = useState<GovernanceLogEntry[]>([
    {
      id: 'log-1',
      timestamp: 'Today at 08:30 AM',
      action: 'Verified Statutory Practitioner License',
      target: 'Dr. K. Senthil Kumar (BSMS, Tamil Nadu Siddha Council)',
      adminName: 'Platform Governance Admin',
      type: 'credential',
      status: 'Approved',
    },
    {
      id: 'log-2',
      timestamp: 'Yesterday at 04:15 PM',
      action: 'Approved Educational Article for Public Catalog',
      target: 'Understanding Prakriti: Your Unique Constitutional Blueprint',
      adminName: 'Platform Governance Admin',
      type: 'content',
      status: 'Approved',
    },
    {
      id: 'log-3',
      timestamp: 'Nov 03, 2026 at 02:40 PM',
      action: 'Rejected Non-Compliant Licensure Application',
      target: 'Dr. Aris Thorne (Unaccredited Distance Diploma)',
      adminName: 'Platform Governance Admin',
      type: 'credential',
      status: 'Rejected',
    },
    {
      id: 'log-4',
      timestamp: 'Nov 02, 2026 at 11:10 AM',
      action: 'Requested Revision for Medicinal Dosage Disclaimer',
      target: 'Guidance on Seasonal Herbal Teas for Autumn Transition',
      adminName: 'Platform Governance Admin',
      type: 'content',
      status: 'Revision',
    },
  ]);

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
    return approvalItems.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(contentSearch.toLowerCase()) ||
        item.author.toLowerCase().includes(contentSearch.toLowerCase()) ||
        item.discipline.toLowerCase().includes(contentSearch.toLowerCase());
      const matchesStatus = contentStatusFilter === 'All' || item.status === contentStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [approvalItems, contentSearch, contentStatusFilter]);

  // Counts
  const pendingArticlesCount = approvalItems.filter((i) => i.status === 'Pending Review').length;
  const pendingPractitionersCount = practitioners.filter((p) => p.status === 'Pending Verification').length;
  const pendingProgramsCount = programApprovalList.filter((p) => p.status === 'Pending Approval').length;
  const totalPendingActionItems = pendingArticlesCount + pendingPractitionersCount + pendingProgramsCount;

  // Practitioner Verification Handlers
  const handleApprovePractitioner = (id: string) => {
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

    // Append to audit log
    const newLog: GovernanceLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      action: 'Verified Statutory Practitioner License',
      target: `${target.name} (${target.qualification})`,
      adminName: 'Platform Governance Admin',
      type: 'credential',
      status: 'Approved',
    };
    setAuditLog((prev) => [newLog, ...prev]);
  };

  const handleRejectPractitioner = (id: string, reason: string = 'Credentials failed statutory verification check') => {
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

    // Append to audit log
    const newLog: GovernanceLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      action: 'Rejected Practitioner Licensure Application',
      target: `${target.name} (${target.qualification})`,
      adminName: 'Platform Governance Admin',
      type: 'credential',
      status: 'Rejected',
    };
    setAuditLog((prev) => [newLog, ...prev]);
  };

  // Program Approval Handlers
  const handleApproveProgram = (id: string) => {
    const target = programApprovalList.find((p) => p.id === id);
    if (!target) return;

    setProgramApprovalList((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: 'Approved', reviewNotes: 'Approved for public seeker catalog' }
          : p
      )
    );
    setSelectedProgram(null);

    const newLog: GovernanceLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      action: 'Approved Wellness Programme for Public Catalog',
      target: target.title,
      adminName: 'Platform Governance Admin',
      type: 'program',
      status: 'Approved',
    };
    setAuditLog((prev) => [newLog, ...prev]);
  };

  const handleRejectProgram = (id: string, note: string = 'Ensure safety disclaimers specify non-diagnostic scope') => {
    const target = programApprovalList.find((p) => p.id === id);
    if (!target) return;

    setProgramApprovalList((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: 'Revision Requested', reviewNotes: note }
          : p
      )
    );
    setSelectedProgram(null);

    const newLog: GovernanceLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      action: 'Requested Revision for Wellness Programme',
      target: target.title,
      adminName: 'Platform Governance Admin',
      type: 'program',
      status: 'Revision',
    };
    setAuditLog((prev) => [newLog, ...prev]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Governance Notice */}
      <div className="p-3.5 rounded-xl bg-[#F4F7F4] border border-[#D5E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#224A34]">
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="w-4 h-4 text-[#2D5A43] shrink-0" />
          <span>
            <strong>Platform Governance Workspace:</strong> Super Admin access for Statutory Quality Assurance & Verification.
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E2EBE4] text-[#1E3F2E] border border-[#C8D7CD]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Full Administrative Privileges
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchRole}
            className="text-[#2D5A43] font-bold hover:text-[#183626] underline underline-offset-2 whitespace-nowrap transition-colors"
          >
            Switch to Seeker Portal →
          </button>
        </div>
      </div>

      {/* 1. PLATFORM OVERVIEW HEADER */}
      <section className="bg-gradient-to-br from-[#FAFAF7] via-[#F6F8F5] to-[#EEF4F0] rounded-2xl p-6 sm:p-8 border border-[#E0E7E1] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#2D5A43]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
              <span>AYUSH Statutory Governance & Safety Console</span>
            </span>
            <span>·</span>
            <span className="text-[#A64B2A] font-bold">
              {totalPendingActionItems} Action Items Pending Review
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#142A1E] tracking-tight">
            Platform Administration Console
          </h1>

          <p className="text-xs sm:text-sm text-[#4E6457] leading-relaxed">
            Supervising traditional health standards, statutory doctor credentials (CCIM/State Councils), and educational article publishing to maintain rigorous non-diagnostic compliance.
          </p>
        </div>

        {/* Action summary badge */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#D9E4DC] shadow-xs shrink-0">
          <div className="text-center min-w-[70px]">
            <span className="text-3xl font-serif font-bold text-[#A64B2A] tabular-nums">
              {totalPendingActionItems}
            </span>
            <p className="text-[10px] font-semibold text-[#526B5C] uppercase tracking-wider mt-0.5">
              Review Queue
            </p>
          </div>
          <div className="h-10 w-[1px] bg-[#E3EBE5]" />
          <div className="space-y-0.5 text-xs">
            <p className="text-[#1E3F2E] font-bold">
              {pendingArticlesCount} Articles · {pendingPractitionersCount} Licenses
            </p>
            <p className="text-[#637C6D]">
              {pendingProgramsCount} Regimen Templates
            </p>
          </div>
        </div>
      </section>

      {/* 1. PLATFORM OVERVIEW METRIC CARDS (Clearly Labeled as Demo Data) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2D5A43]">
            System Scale Indicators
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5]">
            DEMO DATA · Simulated Platform Scale Metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Users */}
          <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#526B5C]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
                Total Registered Seekers
              </span>
              <Users className="w-4 h-4 text-[#2D5A43]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
                1,420
              </span>
              <span className="text-xs text-[#2D5A43] font-semibold">+18% MoM</span>
            </div>
            <p className="text-[11px] text-[#5E7869]">
              Simulated metric · Active lifestyle self-trackers
            </p>
          </div>

          {/* Card 2: Verified Practitioners */}
          <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#526B5C]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
                Verified AYUSH Physicians
              </span>
              <Stethoscope className="w-4 h-4 text-[#2D5A43]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
                84
              </span>
              <span className="text-xs text-[#526B5C]">Physicians</span>
            </div>
            <p className="text-[11px] text-[#5E7869]">
              100% Statutory CCIM/State Medical Board Verified
            </p>
          </div>

          {/* Card 3: Published Articles */}
          <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#526B5C]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
                Published Wellness Guides
              </span>
              <FileCheck className="w-4 h-4 text-[#2D5A43]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
                {articles.length || 18}
              </span>
              <span className="text-xs text-[#526B5C]">Guides</span>
            </div>
            <p className="text-[11px] text-[#5E7869]">
              {pendingArticlesCount} in moderation queue
            </p>
          </div>

          {/* Card 4: Active Programmes */}
          <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-[#526B5C]">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
                Active Wellness Regimens
              </span>
              <Award className="w-4 h-4 text-[#2D5A43]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
                {programs.length || 32}
              </span>
              <span className="text-xs text-[#526B5C]">Regimens</span>
            </div>
            <p className="text-[11px] text-[#5E7869]">
              Across all 5 statutory AYUSH systems
            </p>
          </div>
        </div>
      </section>

      {/* 6. ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E0E7E1] pb-3 text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Overview & System Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('practitioners')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'practitioners'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Practitioner Verifications ({practitioners.length})</span>
          {pendingPractitionersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A64B2A] text-white">
              {pendingPractitionersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'content'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Educational Content Approvals ({approvalItems.length})</span>
          {pendingArticlesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A64B2A] text-white">
              {pendingArticlesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'programs'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Wellness Programmes ({programApprovalList.length})</span>
          {pendingProgramsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A64B2A] text-white">
              {pendingProgramsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'activity'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
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
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
            <div>
              <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                System Distribution
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                AYUSH Discipline Participation
              </h2>
              <p className="text-xs text-[#526B5C] mt-0.5">
                Relative seeker enrollment and habit engagement across the 5 traditional systems.
              </p>
            </div>

            <div className="space-y-4">
              {disciplineStats.map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1E3F2E]">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#526B5C]">{item.count}</span>
                      <span className="font-bold text-[#2D5A43] tabular-nums">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#EBF2ED] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2D5A43] h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#FAFBF9] rounded-xl border border-[#E8EEE8] text-xs text-[#405648] leading-relaxed">
              Ayurveda and Yoga & Naturopathy represent over 70% of initial seeker engagement, with strong growth in Unani lifestyle temperament tracking and Siddha herbal education.
            </div>
          </div>

          {/* Compliance & Quality Safeguards Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-4">
            <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
              Governance Standard
            </span>
            <h2 className="text-lg font-serif font-bold text-[#1E3F2E]">
              Safety & Regulatory Guardrails
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-[#FAFBF9] rounded-xl border border-[#E0E7E1] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#1E3F2E]">
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
                  <span>Non-Diagnostic Strict Rule</span>
                </div>
                <p className="text-[#526B5C]">
                  All educational content and assessment recommendations are programmatically and editorially enforced to remain educational and non-prescriptive.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAFBF9] rounded-xl border border-[#E0E7E1] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#1E3F2E]">
                  <Lock className="w-4 h-4 text-[#2D5A43]" />
                  <span>Practitioner Publishing Isolation</span>
                </div>
                <p className="text-[#526B5C]">
                  Practitioners cannot publish articles or regimens directly. Firestore security rules restrict status transitions to Administrator accounts.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAFBF9] rounded-xl border border-[#E0E7E1] space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#1E3F2E]">
                  <ShieldCheck className="w-4 h-4 text-[#2D5A43]" />
                  <span>Statutory CCIM Verification</span>
                </div>
                <p className="text-[#526B5C]">
                  Only doctors holding valid registration with the Central Council of Indian Medicine or respective State Medical Councils are approved for consultation review.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRACTITIONER MANAGEMENT */}
      {activeTab === 'practitioners' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Credentialing Oversight
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5]">
                  Simulated Applications (Demo Queue)
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E] mt-0.5">
                Practitioner Verification Requests
              </h2>
              <p className="text-xs text-[#526B5C]">
                Verify medical qualifications and statutory council credentials before granting consultation permissions.
              </p>
            </div>
            <span className="text-xs text-[#526B5C]">
              {pendingPractitionersCount} Applications Awaiting Decision
            </span>
          </div>

          <div className="space-y-4">
            {practitioners.map((app) => (
              <div
                key={app.id}
                className="p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-3 hover:border-[#CAD7CC] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-serif font-bold text-base text-[#1E3F2E]">{app.name}</h4>
                      <span className="text-xs font-semibold text-[#2D5A43]">{app.qualification}</span>
                    </div>
                    <p className="text-xs text-[#526B5C] mt-0.5">
                      {app.university} · {app.experienceYears} Years Clinical Experience
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-md font-semibold self-start sm:self-auto ${
                      app.status === 'Verified'
                        ? 'bg-[#EBF2ED] text-[#244E38]'
                        : app.status === 'Pending Verification'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#FBF2EE] text-[#A64B2A]'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-[#E5ECE7] text-xs text-[#3C5345] space-y-1">
                  <p>
                    <strong>Statutory Registration:</strong> {app.councilRegistration}
                  </p>
                  <p>
                    <strong>Discipline:</strong> {app.discipline} · <strong>Submitted:</strong> {app.submittedDate}
                  </p>
                  {app.reviewNotes && (
                    <p className="text-[#526B5C] italic">
                      Admin Notes: {app.reviewNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#526B5C]">
                    <FileText className="w-3.5 h-3.5 text-[#2D5A43]" />
                    <span>Documents: {app.documents.join(', ')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPractitioner(app)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#2D5A43] hover:bg-[#EBF2ED] border border-[#CCD5CB] rounded-lg transition-colors"
                    >
                      Inspect Credentials
                    </button>

                    {app.status === 'Pending Verification' && (
                      <>
                        <button
                          onClick={() => handleApprovePractitioner(app.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg shadow-xs transition-colors"
                        >
                          Verify & Approve
                        </button>
                        <button
                          onClick={() => handleRejectPractitioner(app.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#A64B2A] hover:bg-[#FBF2EE] border border-[#E9C3B4] rounded-lg transition-colors"
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
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                Editorial Review & Compliance
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                Educational Article Submissions
              </h2>
              <p className="text-xs text-[#526B5C] mt-0.5">
                Educational wellness articles submitted by authoring physicians. Approvals publish articles into the seeker catalog.
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
                  className="pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[#CCD5CB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A43] w-full sm:w-60"
                />
              </div>

              <select
                value={contentStatusFilter}
                onChange={(e) => setContentStatusFilter(e.target.value as any)}
                aria-label="Filter content by status"
                className="text-xs p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Approved">Approved</option>
                <option value="Revision Requested">Revision Requested</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-[#E0E7E1] rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAFBF9] border-b border-[#E0E7E1] text-[#526B5C] font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4">Article Title</th>
                  <th className="py-3 px-4">Authoring Physician</th>
                  <th className="py-3 px-4">Discipline</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {filteredContentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFBF9] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#1E3F2E] max-w-xs sm:max-w-md">
                      <div>
                        <span>{item.title}</span>
                        {item.reviewNotes && (
                          <p className="text-[11px] text-[#6B8576] font-normal mt-0.5">
                            Notes: {item.reviewNotes}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#3C5345]">
                      {item.author}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs text-[#2D5A43] font-medium">
                        {item.discipline}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-[#526B5C]">
                      {item.submittedDate}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap ${
                          item.status === 'Approved'
                            ? 'bg-[#EBF2ED] text-[#244E38]'
                            : item.status === 'Pending Review'
                            ? 'bg-[#FEF7EC] text-[#9A6218]'
                            : 'bg-[#FBF2EE] text-[#A64B2A]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setInspectedArticle(item)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-[#2D5A43] hover:bg-[#EBF2ED] border border-[#CCD5CB] rounded-lg transition-colors"
                        >
                          Inspect
                        </button>

                        {item.status === 'Pending Review' ? (
                          <>
                            <button
                              onClick={() => onApproveItem(item.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors whitespace-nowrap shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onRequestRevision(item.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-[#A64B2A] hover:bg-[#FBF2EE] border border-[#E9C3B4] rounded-lg transition-colors whitespace-nowrap"
                            >
                              Request Revision
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-[#526B5C]">Decision Logged</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: WELLNESS PROGRAMME APPROVAL */}
      {activeTab === 'programs' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                Regimen Architecture Governance
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                Wellness Programme Submissions
              </h2>
              <p className="text-xs text-[#526B5C]">
                Practitioner-authored regimens must be vetted and approved by an Administrator before appearing in the public seeker catalog.
              </p>
            </div>
            <span className="text-xs text-[#526B5C]">
              {pendingProgramsCount} Regimens Awaiting Approval
            </span>
          </div>

          <div className="space-y-4">
            {programApprovalList.map((prog) => (
              <div
                key={prog.id}
                className="p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-3 hover:border-[#CAD7CC] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-bold text-base text-[#1E3F2E]">{prog.title}</h4>
                      <span className="text-xs font-semibold text-[#2D5A43]">{prog.discipline}</span>
                    </div>
                    <p className="text-xs text-[#526B5C] mt-0.5">
                      Authored by <strong>{prog.authorName}</strong> ({prog.authorTitle}) · {prog.durationWeeks} Weeks ({prog.level})
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-md font-semibold self-start sm:self-auto ${
                      prog.status === 'Approved'
                        ? 'bg-[#EBF2ED] text-[#244E38]'
                        : prog.status === 'Pending Approval'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#FBF2EE] text-[#A64B2A]'
                    }`}
                  >
                    {prog.status === 'Approved' ? 'Published in Catalog' : prog.status}
                  </span>
                </div>

                <p className="text-xs text-[#4E6457] leading-relaxed bg-white p-3.5 rounded-lg border border-[#E5ECE7]">
                  {prog.description}
                </p>

                {prog.reviewNotes && (
                  <p className="text-xs text-[#526B5C] italic">
                    Admin Review Note: {prog.reviewNotes}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#EEF2EC]">
                  <span className="text-[11px] text-[#526B5C]">
                    Submitted: {prog.submittedDate} · {prog.status !== 'Approved' ? 'Hidden from Seekers' : 'Publicly Visible'}
                  </span>

                  <div className="flex items-center gap-2">
                    {prog.status === 'Pending Approval' && (
                      <>
                        <button
                          onClick={() => handleApproveProgram(prog.id)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg shadow-xs transition-colors"
                        >
                          Approve & Publish
                        </button>
                        <button
                          onClick={() => handleRejectProgram(prog.id)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-[#A64B2A] hover:bg-[#FBF2EE] border border-[#E9C3B4] rounded-lg transition-colors"
                        >
                          Request Revision
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

      {/* TAB 5: PLATFORM ACTIVITY (Governance Audit Log) */}
      {activeTab === 'activity' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  System Accountability
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E8EFEA] text-[#244E38] border border-[#CCDCD2]">
                  Live Session Audit Trail
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E] mt-0.5">
                Platform Governance Audit Log
              </h2>
              <p className="text-xs text-[#526B5C]">
                Immutable administrative record tracking credential verification decisions, content publication approvals, and safety checks.
              </p>
            </div>
            <span className="text-xs text-[#526B5C]">
              {auditLog.length} Audit Events Logged
            </span>
          </div>

          <div className="space-y-3">
            {auditLog.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#CAD7CC] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      log.status === 'Approved'
                        ? 'bg-[#EBF2ED] text-[#2D5A43]'
                        : log.status === 'Rejected'
                        ? 'bg-[#FBF2EE] text-[#A64B2A]'
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
                    <p className="text-sm font-semibold text-[#1E3F2E]">
                      {log.action}
                    </p>
                    <p className="text-xs text-[#4E6457]">
                      Target: <strong>{log.target}</strong>
                    </p>
                    <p className="text-[11px] text-[#6B8576]">
                      Logged by {log.adminName}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-xs shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                      log.status === 'Approved'
                        ? 'bg-[#EBF2ED] text-[#244E38]'
                        : log.status === 'Rejected'
                        ? 'bg-[#FBF2EE] text-[#A64B2A]'
                        : 'bg-[#FEF3C7] text-[#92400E]'
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-[11px] text-[#526B5C]">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#DCE6DE] text-xs text-[#526B5C]">
            <strong>Audit Transparency Note:</strong> All administrative approval decisions taken in this console are logged here in real-time. Actions are synchronized with Firestore backend collections when cloud persistence is active.
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
          <div className="bg-[#FAFAF7] w-full max-w-lg rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Licensure Verification
                </span>
                <h3 id="inspect-prac-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
                  {selectedPractitioner.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPractitioner(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-white rounded-xl border border-[#E0E7E1] space-y-1.5">
                <p><strong>Statutory Qualification:</strong> {selectedPractitioner.qualification}</p>
                <p><strong>Discipline:</strong> {selectedPractitioner.discipline}</p>
                <p><strong>Medical University:</strong> {selectedPractitioner.university}</p>
                <p><strong>Clinical Experience:</strong> {selectedPractitioner.experienceYears} Years</p>
                <p className="text-[#2D5A43] font-semibold">
                  Registration Number: {selectedPractitioner.councilRegistration}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-[#1E3F2E]">Submitted Documentation:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-[#526B5C]">
                  {selectedPractitioner.documents.map((doc, idx) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-[#F0F5F1] rounded-lg border border-[#CCDCD2] text-xs text-[#244E38]">
                <strong>Statutory Check:</strong> Verified against the official central registry of the Ministry of AYUSH & respective State Medical Councils.
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
                      className="px-4 py-2 text-xs font-semibold text-[#A64B2A] hover:bg-[#FBF2EE] border border-[#E9C3B4] rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePractitioner(selectedPractitioner.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
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
          <div className="bg-[#FAFAF7] w-full max-w-xl rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Editorial Quality Inspection
                </span>
                <h3 id="inspect-art-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
                  {inspectedArticle.title}
                </h3>
                <p className="text-xs text-[#526B5C]">
                  Authored by {inspectedArticle.author} · {inspectedArticle.discipline}
                </p>
              </div>
              <button
                onClick={() => setInspectedArticle(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-white rounded-xl border border-[#E0E7E1] space-y-2">
                <span className="text-xs font-semibold text-[#2D5A43] uppercase">
                  Educational Thesis & Review Notes
                </span>
                <p className="text-xs text-[#4E6457] leading-relaxed">
                  {inspectedArticle.reviewNotes || 'Article submitted for platform compliance review.'}
                </p>
              </div>

              <div className="p-3 bg-[#F0F5F1] rounded-lg border border-[#CCDCD2] text-xs text-[#244E38]">
                <strong>Compliance Check:</strong> Does this article adhere to non-diagnostic self-care standards? Culinary dosages are clearly separated from clinical pharmacology.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInspectedArticle(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                {inspectedArticle.status === 'Pending Review' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onRequestRevision(inspectedArticle.id);
                        setInspectedArticle(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-[#A64B2A] hover:bg-[#FBF2EE] border border-[#E9C3B4] rounded-lg transition-colors"
                    >
                      Request Revision
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onApproveItem(inspectedArticle.id);
                        setInspectedArticle(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
                    >
                      Approve for Public Catalog
                    </button>
                  </>
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
