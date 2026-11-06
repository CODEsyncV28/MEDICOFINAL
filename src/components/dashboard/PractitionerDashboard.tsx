import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  Info,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Video,
  Filter,
  Edit3,
  Send,
  Check,
  X,
  Lock,
  Eye,
  Award,
  Sparkles,
  UserCheck,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  ClientRecord,
  WellnessProgram,
  EducationalArticle,
  Practitioner,
  AYUSHDiscipline,
  WellnessCategory,
} from '../../types';
import { SafetyBanner } from '../common/SafetyBanner';

interface PractitionerDashboardProps {
  practitioner: Practitioner;
  clients: ClientRecord[];
  programs: WellnessProgram[];
  articles: EducationalArticle[];
  onOpenNewRegimen: () => void;
  onReadArticle: (article: EducationalArticle) => void;
  onSwitchRole: () => void;
}

interface ExtendedProgram extends WellnessProgram {
  status: 'Published' | 'Pending Approval' | 'Draft';
}

interface AuthoredArticle {
  id: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  readTime: string;
  summary: string;
  content: string;
  status: 'Draft' | 'Pending Review' | 'Approved';
  submittedDate: string;
}

interface ConsultationItem {
  id: string;
  seekerName: string;
  topic: string;
  preferredSlot: 'Morning (8-11 AM)' | 'Afternoon (1-4 PM)' | 'Evening (5-7 PM)';
  seekerNotes: string;
  status: 'Pending Review' | 'Confirmed' | 'Completed' | 'Rescheduled';
  scheduledTime?: string;
  isSimulated: boolean;
  practitionerNotes?: string;
}

export const PractitionerDashboard: React.FC<PractitionerDashboardProps> = ({
  practitioner,
  clients,
  programs,
  articles,
  onOpenNewRegimen,
  onReadArticle,
  onSwitchRole,
}) => {
  // Navigation / Tab state within practitioner workspace
  const [activeTab, setActiveTab] = useState<'roster' | 'consultations' | 'programs' | 'authoring'>('roster');

  // Client roster filtering & state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'On Track' | 'Active' | 'Needs Review'>('All');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('All');
  const [clientList, setClientList] = useState<ClientRecord[]>(clients);

  // Client detail drawer state
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<'Active' | 'Needs Review' | 'On Track'>('Active');
  const [saveNotesToast, setSaveNotesToast] = useState<string | null>(null);

  // Programme management & editing
  const [localPrograms, setLocalPrograms] = useState<ExtendedProgram[]>(() =>
    programs.map((p, idx) => ({
      ...p,
      status: idx === 0 ? 'Published' : idx === 1 ? 'Published' : 'Pending Approval',
    }))
  );
  const [editingProgram, setEditingProgram] = useState<ExtendedProgram | null>(null);
  const [programEditSuccess, setProgramEditSuccess] = useState<string | null>(null);

  // Educational content authoring
  const [authoredArticles, setAuthoredArticles] = useState<AuthoredArticle[]>([
    {
      id: 'auth-1',
      title: 'Guidance on Seasonal Herbal Teas for Autumn Transition (Sharad Ritucharya)',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      readTime: '6 min read',
      summary: 'Clear educational tone with appropriate safety disclaimers regarding culinary vs medicinal dosages of ginger and tulsi.',
      content: 'In late autumn (Sharad Ritucharya), the environmental cooling requires pacification of residual Pitta heat followed by stabilization of Vata dryness. Traditional infusions of boiled coriander seeds, dried ginger, and holy basil support gentle digestive fire without overheating mucosal membranes...',
      status: 'Pending Review',
      submittedDate: 'Nov 04, 2026',
    },
    {
      id: 'auth-2',
      title: 'Understanding Prakriti: Your Unique Constitutional Blueprint',
      discipline: 'Ayurveda',
      category: 'Ayurveda',
      readTime: '6 min read',
      summary: 'A foundational introduction to Vata, Pitta, and Kapha biological principles for beginners.',
      content: 'Prakriti is the individual biological constitution established at conception according to classical Ayurvedic biology...',
      status: 'Approved',
      submittedDate: 'Oct 15, 2026',
    },
    {
      id: 'auth-3',
      title: 'Dinacharya Guidelines: Circadian Awakening & Oral Hygiene Rituals',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      readTime: '5 min read',
      summary: 'Exploring oil pulling (Gandusha), tongue scraping (Jihwa Nirlekhana), and warm morning hydration.',
      content: 'Classical texts recommend sensory organ purification upon waking to stimulate vagal nerve tone and prime gastrointestinal tract readiness...',
      status: 'Draft',
      submittedDate: 'Nov 05, 2026',
    },
  ]);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [articleFormTitle, setArticleFormTitle] = useState('');
  const [articleFormDiscipline, setArticleFormDiscipline] = useState<AYUSHDiscipline>('Ayurveda');
  const [articleFormCategory, setArticleFormCategory] = useState<WellnessCategory>('Lifestyle Education');
  const [articleFormReadTime, setArticleFormReadTime] = useState('5 min read');
  const [articleFormSummary, setArticleFormSummary] = useState('');
  const [articleFormContent, setArticleFormContent] = useState('');
  const [authorSuccessMsg, setAuthorSuccessMsg] = useState<string | null>(null);

  // Consultation requests
  const [consultations, setConsultations] = useState<ConsultationItem[]>([
    {
      id: 'c-1',
      seekerName: 'Priya Sundaram',
      topic: 'Circadian Sleep Restoration & Evening Wind-down (Dinacharya)',
      preferredSlot: 'Morning (8-11 AM)',
      seekerNotes: 'Experiencing restless awakening around 3 AM. Warm milk with nutmeg helped slightly.',
      status: 'Confirmed',
      scheduledTime: 'Tomorrow at 10:30 AM',
      isSimulated: true,
      practitionerNotes: 'Will review tongue observation and recommend evening Ashwagandha decoction.',
    },
    {
      id: 'c-2',
      seekerName: 'Vikram Malhotra',
      topic: 'Postural Spine Mobility & Ergonomics',
      preferredSlot: 'Afternoon (1-4 PM)',
      seekerNotes: 'Upper cervical tightness after 6 hours of consecutive laptop work.',
      status: 'Pending Review',
      isSimulated: true,
    },
    {
      id: 'c-3',
      seekerName: 'Farhan Qureshi',
      topic: 'Metabolic Agni & Meal Interval Guidance',
      preferredSlot: 'Evening (5-7 PM)',
      seekerNotes: 'Digestive heaviness when eating after 8 PM.',
      status: 'Pending Review',
      isSimulated: true,
    },
  ]);
  const [activeConsultationModal, setActiveConsultationModal] = useState<ConsultationItem | null>(null);
  const [scheduledSlotInput, setScheduledSlotInput] = useState<string>('Tomorrow at 02:00 PM');
  const [consultationNoteInput, setConsultationNoteInput] = useState<string>('');

  // Filtered Client Roster
  const filteredClients = useMemo(() => {
    return clientList.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primaryGoal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.enrolledProgram.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesDiscipline = disciplineFilter === 'All' || c.discipline === disciplineFilter;
      return matchesSearch && matchesStatus && matchesDiscipline;
    });
  }, [clientList, searchTerm, statusFilter, disciplineFilter]);

  // Handle open client detail
  const handleOpenClientDetail = (client: ClientRecord) => {
    setSelectedClient(client);
    setEditingNotes(client.practitionerNotes || '');
    setEditingStatus(client.status);
    setSaveNotesToast(null);
  };

  // Handle save client observation note
  const handleSaveClientNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setClientList((prev) =>
      prev.map((c) =>
        c.id === selectedClient.id
          ? { ...c, practitionerNotes: editingNotes, status: editingStatus }
          : c
      )
    );
    setSelectedClient((prev) => (prev ? { ...prev, practitionerNotes: editingNotes, status: editingStatus } : null));
    setSaveNotesToast('Observation note updated in /clientProfiles record');
    setTimeout(() => setSaveNotesToast(null), 3000);
  };

  // Handle saving an edited programme
  const handleSaveProgramEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    // Practitioners editing a programme marks it as Pending Approval (cannot bypass Admin approval)
    const updatedStatus: 'Pending Approval' = 'Pending Approval';
    setLocalPrograms((prev) =>
      prev.map((p) =>
        p.id === editingProgram.id
          ? { ...editingProgram, status: updatedStatus }
          : p
      )
    );
    setProgramEditSuccess(`Regimen "${editingProgram.title}" updated and submitted for Admin approval.`);
    setTimeout(() => {
      setProgramEditSuccess(null);
      setEditingProgram(null);
    }, 1500);
  };

  // Handle author article submit
  const handleArticleSubmit = (asDraft: boolean) => {
    if (!articleFormTitle.trim() || !articleFormSummary.trim()) return;

    const newArticle: AuthoredArticle = {
      id: `auth-${Date.now()}`,
      title: articleFormTitle.trim(),
      discipline: articleFormDiscipline,
      category: articleFormCategory,
      readTime: articleFormReadTime,
      summary: articleFormSummary.trim(),
      content: articleFormContent.trim() || 'Educational article content awaiting practitioner expansion.',
      status: asDraft ? 'Draft' : 'Pending Review',
      submittedDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date()),
    };

    setAuthoredArticles((prev) => [newArticle, ...prev]);
    setAuthorSuccessMsg(
      asDraft
        ? `Draft "${newArticle.title}" saved.`
        : `Article "${newArticle.title}" submitted for Administrator Governance review.`
    );
    setTimeout(() => {
      setAuthorSuccessMsg(null);
      setIsAuthorModalOpen(false);
      setArticleFormTitle('');
      setArticleFormSummary('');
      setArticleFormContent('');
    }, 1600);
  };

  // Handle consultation confirmation
  const handleConfirmConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationModal) return;

    setConsultations((prev) =>
      prev.map((item) =>
        item.id === activeConsultationModal.id
          ? {
              ...item,
              status: 'Confirmed',
              scheduledTime: scheduledSlotInput,
              practitionerNotes: consultationNoteInput || item.practitionerNotes,
            }
          : item
      )
    );
    setActiveConsultationModal(null);
    setConsultationNoteInput('');
  };

  // Counts for overview
  const pendingConsultationsCount = consultations.filter((c) => c.status === 'Pending Review').length;
  const pendingSubmissionsCount =
    authoredArticles.filter((a) => a.status === 'Pending Review').length +
    localPrograms.filter((p) => p.status === 'Pending Approval').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Demonstration / Governance Top Bar */}
      <div className="p-3.5 rounded-xl bg-[#F4F7F4] border border-[#D5E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#224A34]">
        <div className="flex flex-wrap items-center gap-2">
          <Stethoscope className="w-4 h-4 text-[#2D5A43] shrink-0" />
          <span>
            <strong>Practitioner Console:</strong> Licensed AYUSH Physician Workspace for{' '}
            <span className="font-semibold text-[#183625]">{practitioner.name}</span> ({practitioner.qualification}).
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E2EBE4] text-[#1E3F2E] border border-[#C8D7CD]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Verified Statutory License
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#526B5C] hidden md:inline">
            RBAC: /clientProfiles restricted
          </span>
          <button
            onClick={onSwitchRole}
            className="text-[#2D5A43] font-bold hover:text-[#183626] underline underline-offset-2 whitespace-nowrap transition-colors"
          >
            Switch to Administrator Portal →
          </button>
        </div>
      </div>

      {/* 1. PRACTITIONER OVERVIEW & PROFILE HEADER */}
      <section className="bg-gradient-to-br from-[#FAFAF7] via-[#F6F8F5] to-[#EEF4F0] rounded-2xl p-6 sm:p-8 border border-[#E0E7E1] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#E5EDE7] text-[#2D5A43] font-serif font-bold text-2xl flex items-center justify-center shrink-0 border border-[#D0DDD3] shadow-xs">
            AS
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#142A1E]">
                {practitioner.name}
              </h1>
              <span className="text-xs font-semibold text-[#2D5A43] bg-[#E5EDE7] px-2.5 py-0.5 rounded-md border border-[#CCDCD2]">
                Verified AYUSH Physician
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#4E6457] font-medium">
              {practitioner.qualification} · {practitioner.experienceYears} Years Clinical & Circadian Supervision
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#5E7969]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
                <span>{practitioner.councilRegistration}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#2D5A43]" />
                <span>{practitioner.nextAvailableSlot}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsAuthorModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#1E3F2E] bg-white hover:bg-[#F2F6F3] border border-[#CCD5CB] rounded-xl shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-[#2D5A43]" />
            <span>Author Wellness Guide</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewRegimen}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Regimen Template</span>
          </button>
        </div>
      </section>

      {/* PRACTITIONER OVERVIEW STATISTIC CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Clients */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
              Assigned Client Cohort
            </span>
            <Users className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
              {clientList.length}
            </span>
            <span className="text-xs text-[#526B5C]">Seekers Assigned</span>
          </div>
          <p className="text-[11px] text-[#5E7869]">
            Avg. Cohort Adherence: <strong>86.4%</strong> across daily rituals
          </p>
        </div>

        {/* Card 2: Active Programmes */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
              Wellness Programmes
            </span>
            <Award className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
              {localPrograms.length}
            </span>
            <span className="text-xs text-[#526B5C]">Curated Regimens</span>
          </div>
          <p className="text-[11px] text-[#5E7869]">
            {localPrograms.filter((p) => p.status === 'Published').length} Published ·{' '}
            {localPrograms.filter((p) => p.status === 'Pending Approval').length} In Review
          </p>
        </div>

        {/* Card 3: Pending Consultations */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#A64B2A]">
              Consultation Requests
            </span>
            <Video className="w-4 h-4 text-[#A64B2A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
              {pendingConsultationsCount}
            </span>
            <span className="text-xs text-[#A64B2A] font-semibold">Pending Review</span>
          </div>
          <p className="text-[11px] text-[#6E544B]">
            {consultations.filter((c) => c.status === 'Confirmed').length} Confirmed for review
          </p>
        </div>

        {/* Card 4: Governance & Submissions */}
        <div className="bg-white rounded-xl p-5 border border-[#E3E8E3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#526B5C]">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#2D5A43]">
              Admin Governance Queue
            </span>
            <ShieldCheck className="w-4 h-4 text-[#2D5A43]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[#1E3F2E] tabular-nums">
              {pendingSubmissionsCount}
            </span>
            <span className="text-xs text-[#526B5C]">Awaiting Admin Sign-off</span>
          </div>
          <p className="text-[11px] text-[#5E7869]">
            Strict RBAC: Direct publishing restricted
          </p>
        </div>
      </section>

      {/* NAVIGATION TABS WITHIN PRACTITIONER WORKSPACE */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E0E7E1] pb-3 text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'roster'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Assigned Client Roster ({clientList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('consultations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'consultations'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Consultation Requests ({consultations.length})</span>
          {pendingConsultationsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A64B2A] text-white">
              {pendingConsultationsCount}
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
          <span>Wellness Programmes ({localPrograms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('authoring')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'authoring'
              ? 'bg-[#2D5A43] text-white shadow-xs font-semibold'
              : 'text-[#4A6455] hover:bg-[#EBF2ED] hover:text-[#1E3F2E]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Educational Guides ({authoredArticles.length})</span>
        </button>
      </div>

      {/* 2. CLIENT ROSTER TAB */}
      {activeTab === 'roster' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Care Management
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5]">
                  Simulated Cohort Data (Demo Records)
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E] mt-0.5">
                Assigned Seekers Roster
              </h2>
              <p className="text-xs text-[#526B5C]">
                Exclusively displaying seekers assigned to {practitioner.name}. Private user contact info is strictly excluded.
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search seeker, goal, program..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[#CCD5CB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A43] w-full sm:w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter seekers by status"
                className="text-xs p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
              >
                <option value="All">All Statuses</option>
                <option value="On Track">On Track</option>
                <option value="Active">Active</option>
                <option value="Needs Review">Needs Review</option>
              </select>

              {/* Discipline Filter */}
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                aria-label="Filter seekers by discipline"
                className="text-xs p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
              >
                <option value="All">All Disciplines</option>
                <option value="Ayurveda">Ayurveda</option>
                <option value="Yoga & Naturopathy">Yoga & Naturopathy</option>
                <option value="Unani">Unani</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto border border-[#E0E7E1] rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAFBF9] border-b border-[#E0E7E1] text-[#526B5C] font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4">Seeker Name</th>
                  <th className="py-3 px-4">Primary Wellness Goal</th>
                  <th className="py-3 px-4">Enrolled Regimen</th>
                  <th className="py-3 px-4">Dinacharya Adherence</th>
                  <th className="py-3 px-4">Baseline Assessment</th>
                  <th className="py-3 px-4">Clinical Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#FAFBF9] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#1E3F2E]">
                      <div>
                        <span>{client.name}</span>
                        <p className="text-[11px] text-[#6B8576] font-normal">
                          {client.age} yrs · {client.gender}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#3C5345] max-w-xs">
                      <span className="line-clamp-2 leading-relaxed">{client.primaryGoal}</span>
                    </td>

                    <td className="py-3.5 px-4 text-[#3C5345]">
                      <div>
                        <span className="font-medium text-[#1E3F2E]">{client.enrolledProgram}</span>
                        <p className="text-[11px] text-[#6B8576]">{client.discipline}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1 w-28">
                        <div className="flex justify-between text-[11px] font-semibold text-[#1E3F2E]">
                          <span className="tabular-nums">{client.adherenceRate}%</span>
                          <span className="text-[10px] text-[#526B5C]">Active</span>
                        </div>
                        <div className="w-full bg-[#E5ECE7] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              client.adherenceRate >= 80 ? 'bg-[#2D5A43]' : 'bg-[#D97746]'
                            }`}
                            style={{ width: `${client.adherenceRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {client.assessmentCompleted ? (
                        <span className="text-[#2D5A43] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </span>
                      ) : (
                        <span className="text-[#A64B2A] font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${
                          client.status === 'On Track'
                            ? 'bg-[#EBF2ED] text-[#244E38]'
                            : client.status === 'Active'
                            ? 'bg-[#E8F0F7] text-[#1E4E79]'
                            : 'bg-[#FBF2EE] text-[#A64B2A]'
                        }`}
                      >
                        {client.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenClientDetail(client)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#2D5A43] hover:text-[#183626] border border-[#CCD5CB] hover:bg-[#EBF2ED] rounded-lg transition-colors whitespace-nowrap"
                      >
                        View Profile & Notes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. CONSULTATION REQUESTS TAB */}
      {activeTab === 'consultations' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Direct Care Coordination
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E8EFEA] text-[#244E38] border border-[#CCDCD2]">
                  Authorized Care Channel
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E] mt-0.5">
                Virtual Consultation Requests
              </h2>
              <p className="text-xs text-[#526B5C]">
                Seekers requesting personalized lifestyle guidance and routine review with {practitioner.name}.
              </p>
            </div>
            <span className="text-xs text-[#526B5C]">
              {consultations.length} Total Requests Recorded
            </span>
          </div>

          <div className="space-y-4">
            {consultations.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-3 hover:border-[#CAD7CC] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#E5EDE7] text-[#2D5A43] font-serif font-bold text-sm flex items-center justify-center">
                      {item.seekerName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#1E3F2E]">{item.seekerName}</h4>
                      <p className="text-xs text-[#526B5C]">Preferred Time: {item.preferredSlot}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {item.isSimulated && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5] font-semibold">
                        Simulated Request
                      </span>
                    )}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
                        item.status === 'Confirmed'
                          ? 'bg-[#EBF2ED] text-[#244E38]'
                          : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#3C5345] space-y-1.5 bg-white p-3.5 rounded-lg border border-[#E5ECE7]">
                  <p>
                    <strong>Focus Area:</strong> {item.topic}
                  </p>
                  <p>
                    <strong>Seeker Observation Note:</strong> "{item.seekerNotes}"
                  </p>
                  {item.scheduledTime && (
                    <p className="text-[#2D5A43] font-semibold">
                      Confirmed Scheduled Slot: {item.scheduledTime}
                    </p>
                  )}
                  {item.practitionerNotes && (
                    <p className="text-[#526B5C] italic">
                      Physician Note: {item.practitionerNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  {item.status === 'Pending Review' ? (
                    <button
                      onClick={() => setActiveConsultationModal(item)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg shadow-xs transition-colors"
                    >
                      Confirm Schedule & Add Notes
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveConsultationModal(item)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#2D5A43] hover:bg-[#EBF2ED] border border-[#CCD5CB] rounded-lg transition-colors"
                    >
                      Update Appointment Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#DCE6DE] text-xs text-[#4F6858] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
            <span>
              <strong>Consultation Authorization Rules:</strong> As the assigned physician, you are authorized to confirm appointment times and attach clinical review notes. Seekers cannot self-confirm or alter assigned doctors per Firestore rules.
            </span>
          </div>
        </section>
      )}

      {/* 4. WELLNESS PROGRAMME MANAGEMENT TAB */}
      {activeTab === 'programs' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                Regimen Architecture & Templates
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                Wellness Programme Catalog
              </h2>
              <p className="text-xs text-[#526B5C]">
                Educational lifestyle curricula authored by verified practitioners. Edits undergo Admin approval before public release.
              </p>
            </div>

            <button
              onClick={onOpenNewRegimen}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Regimen Template</span>
            </button>
          </div>

          {programEditSuccess && (
            <div className="p-3.5 rounded-lg bg-[#EBF2ED] text-[#1E3F2E] border border-[#CCDCD2] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
              <span>{programEditSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localPrograms.map((prog) => (
              <div
                key={prog.id}
                className="p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#526B5C]">
                    <span className="font-semibold text-[#2D5A43]">{prog.discipline}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        prog.status === 'Published'
                          ? 'bg-[#EBF2ED] text-[#244E38]'
                          : prog.status === 'Pending Approval'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {prog.status}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                    {prog.title}
                  </h3>

                  <p className="text-xs text-[#4E6457] leading-relaxed line-clamp-3">
                    {prog.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E8ECE6] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#526B5C]">
                    <span>Duration: {prog.durationWeeks} Weeks</span>
                    <span>Level: {prog.level}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#2D5A43] font-medium">
                      {prog.totalSessions} Total Sessions
                    </span>
                    <button
                      onClick={() => setEditingProgram(prog)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#2D5A43] hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Template</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-[#FAFBF9] rounded-xl border border-[#E0E7E1] text-xs text-[#526B5C] flex items-start gap-2">
            <Lock className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
            <span>
              <strong>Platform Governance Rule:</strong> Newly created or edited regimens are stored in <em>Pending Approval</em> status. Practitioners cannot bypass administrator verification to self-publish into the public seeker catalog.
            </span>
          </div>
        </section>
      )}

      {/* 5. EDUCATIONAL CONTENT AUTHORING TAB */}
      {activeTab === 'authoring' && (
        <section className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E0E7E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF2EC] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                Health Education Authorship
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                Authored Wellness Guides & Articles
              </h2>
              <p className="text-xs text-[#526B5C]">
                Draft evidence-informed educational content for community review. Direct publication is restricted; submissions route to the Administrator Governance queue.
              </p>
            </div>

            <button
              onClick={() => setIsAuthorModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draft New Article</span>
            </button>
          </div>

          {authorSuccessMsg && (
            <div className="p-3.5 rounded-lg bg-[#EBF2ED] text-[#1E3F2E] border border-[#CCDCD2] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
              <span>{authorSuccessMsg}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {authoredArticles.map((art) => (
              <div
                key={art.id}
                className="p-4 sm:p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-2 hover:border-[#CAD7CC] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[#526B5C]">
                    <span className="font-semibold text-[#2D5A43]">{art.discipline}</span>
                    <span>·</span>
                    <span>{art.category}</span>
                    <span>·</span>
                    <span>{art.readTime}</span>
                    <span>·</span>
                    <span>Submitted: {art.submittedDate}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold ${
                      art.status === 'Approved'
                        ? 'bg-[#EBF2ED] text-[#244E38]'
                        : art.status === 'Pending Review'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {art.status}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                  {art.title}
                </h3>

                <p className="text-xs text-[#4E6457] leading-relaxed">
                  {art.summary}
                </p>

                <div className="pt-2 flex items-center justify-between text-xs text-[#526B5C] border-t border-[#EEF2EC]">
                  <span>
                    Status:{' '}
                    <strong>
                      {art.status === 'Approved'
                        ? 'Published in Public Catalog'
                        : art.status === 'Pending Review'
                        ? 'In Administrator Review Queue'
                        : 'Saved as Private Draft'}
                    </strong>
                  </span>
                  <button
                    onClick={() => {
                      onReadArticle({
                        id: art.id,
                        title: art.title,
                        discipline: art.discipline,
                        category: art.category,
                        readTime: art.readTime,
                        author: practitioner.name,
                        authorQualification: practitioner.qualification,
                        summary: art.summary,
                        fullContent: art.content,
                        keyTakeaways: [
                          'Focuses on classical non-diagnostic health cultivation.',
                          'Safe culinary doses of traditional herbs.',
                          'Consult with primary physician for acute conditions.',
                        ],
                        reviewedDate: art.submittedDate,
                      });
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-[#2D5A43] hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Article Content</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-[#FAFBF9] rounded-xl border border-[#E0E7E1] text-xs text-[#526B5C] flex items-start gap-2">
            <Lock className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
            <span>
              <strong>Content Publishing Constraint:</strong> Under platform security rules (`/educationalArticles`), practitioner authors can create drafts and submit for review, but only Administrators can change status to <code>published</code>.
            </span>
          </div>
        </section>
      )}

      {/* 3. CLIENT DETAIL VIEW MODAL / DRAWER */}
      {selectedClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-detail-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FAFAF7] w-full max-w-2xl rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#2D5A43] uppercase tracking-wider">
                    Client Profile & Clinical Record
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E8EFEA] text-[#244E38] font-bold">
                    /clientProfiles/{selectedClient.id}
                  </span>
                </div>
                <h3 id="client-detail-title" className="text-xl font-serif font-bold text-[#1E3F2E]">
                  {selectedClient.name}
                </h3>
                <p className="text-xs text-[#526B5C]">
                  {selectedClient.age} yrs · {selectedClient.gender} · Assigned to {practitioner.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Privacy Notice Banner */}
              <div className="p-3 bg-[#F0F5F1] rounded-xl border border-[#CCDCD2] text-xs text-[#234B36] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Strict Privacy Architecture:</strong> Practitioner view accesses only non-sensitive records in <code>/clientProfiles/{selectedClient.id}</code>. Private user credentials, passwords, and personal email addresses in <code>/users</code> are blocked by Firestore security rules.
                </p>
              </div>

              {/* Status and Metric Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-[#E0E7E1] space-y-1">
                  <span className="text-[11px] font-semibold text-[#526B5C] uppercase">Habit Adherence</span>
                  <p className="text-2xl font-serif font-bold text-[#1E3F2E] tabular-nums">
                    {selectedClient.adherenceRate}%
                  </p>
                  <p className="text-[11px] text-[#526B5C]">Check-in: {selectedClient.lastCheckIn}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#E0E7E1] space-y-1">
                  <span className="text-[11px] font-semibold text-[#526B5C] uppercase">Baseline Assessment</span>
                  <p className="text-sm font-bold text-[#1E3F2E]">
                    {selectedClient.assessmentCompleted ? 'Completed (100%)' : 'Incomplete / Pending'}
                  </p>
                  <p className="text-[11px] text-[#526B5C]">
                    {selectedClient.assessmentCompleted ? 'Prakriti Profile Saved' : 'Section 3/4 unlogged'}
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#E0E7E1] space-y-1">
                  <span className="text-[11px] font-semibold text-[#526B5C] uppercase">Supervision Status</span>
                  <p className="text-sm font-bold text-[#1E3F2E]">{selectedClient.status}</p>
                  <p className="text-[11px] text-[#526B5C]">{selectedClient.discipline}</p>
                </div>
              </div>

              {/* Goal and Enrolled Program */}
              <div className="p-4 bg-white rounded-xl border border-[#E0E7E1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                    Primary Wellness Objective
                  </span>
                  <span className="text-xs text-[#526B5C] font-medium">{selectedClient.enrolledProgram}</span>
                </div>
                <p className="text-sm font-semibold text-[#1E3F2E]">
                  {selectedClient.primaryGoal}
                </p>
              </div>

              {/* Practitioner Observation Notes Editor */}
              <form onSubmit={handleSaveClientNotes} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#1E3F2E]">
                    Physician Clinical Observation & Regimen Guidance Notes
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#526B5C]">Status:</span>
                    <select
                      value={editingStatus}
                      onChange={(e) => setEditingStatus(e.target.value as any)}
                      aria-label="Seeker status"
                      className="text-xs p-1 rounded-md border border-[#CCD5CB] bg-white text-slate-800"
                    >
                      <option value="On Track">On Track</option>
                      <option value="Active">Active</option>
                      <option value="Needs Review">Needs Review</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Record observational feedback on Agni, sleep transitions, herbal tea responses, or posture resets..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />

                {saveNotesToast && (
                  <div className="p-2.5 rounded-lg bg-[#EBF2ED] text-[#1E3F2E] text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
                    <span>{saveNotesToast}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Observation Note</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROGRAMME MODAL */}
      {editingProgram && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-program-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FAFAF7] w-full max-w-lg rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Regimen Architecture
                </span>
                <h3 id="edit-program-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
                  Edit Programme Template
                </h3>
              </div>
              <button
                onClick={() => setEditingProgram(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgramEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Programme Title
                </label>
                <input
                  type="text"
                  required
                  value={editingProgram.title}
                  onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Duration (Weeks)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editingProgram.durationWeeks}
                    onChange={(e) => setEditingProgram({ ...editingProgram, durationWeeks: Number(e.target.value) })}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Level
                  </label>
                  <select
                    value={editingProgram.level}
                    onChange={(e) => setEditingProgram({ ...editingProgram, level: e.target.value as any })}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Deepening">Deepening</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Description & Clinical Objectives
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingProgram.description}
                  onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })}
                  className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="p-3 bg-[#FBF2EE] rounded-lg border border-[#F0DCD5] text-xs text-[#A64B2A] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#A64B2A] shrink-0 mt-0.5" />
                <span>
                  <strong>Governance Requirement:</strong> Saving modifications moves the regimen to <em>Pending Approval</em>. Platform Admin approval is mandatory before published changes appear in seeker dashboards.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Admin Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAFT EDUCATIONAL ARTICLE MODAL */}
      {isAuthorModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="author-modal-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FAFAF7] w-full max-w-xl rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Health Education Authorship
                </span>
                <h3 id="author-modal-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
                  Author Educational Wellness Guide
                </h3>
              </div>
              <button
                onClick={() => setIsAuthorModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Article Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Safe Culinary Herbal Teas for Autumn Transition"
                  value={articleFormTitle}
                  onChange={(e) => setArticleFormTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Discipline
                  </label>
                  <select
                    value={articleFormDiscipline}
                    onChange={(e) => setArticleFormDiscipline(e.target.value as any)}
                    className="w-full text-xs sm:text-sm p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-800"
                  >
                    <option value="Ayurveda">Ayurveda</option>
                    <option value="Yoga & Naturopathy">Yoga & Naturopathy</option>
                    <option value="Unani">Unani</option>
                    <option value="Siddha">Siddha</option>
                    <option value="Homeopathy">Homeopathy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Category
                  </label>
                  <select
                    value={articleFormCategory}
                    onChange={(e) => setArticleFormCategory(e.target.value as any)}
                    className="w-full text-xs sm:text-sm p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-800"
                  >
                    <option value="Lifestyle Education">Lifestyle</option>
                    <option value="Nutrition">Nutrition</option>
                    <option value="Yoga">Yoga</option>
                    <option value="Meditation">Meditation</option>
                    <option value="Ayurveda">Ayurveda</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Read Time
                  </label>
                  <input
                    type="text"
                    value={articleFormReadTime}
                    onChange={(e) => setArticleFormReadTime(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Educational Thesis / Summary
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Summarize the core traditional concept, circadian relevance, and practical self-observation..."
                  value={articleFormSummary}
                  onChange={(e) => setArticleFormSummary(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Educational Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Detailed guidelines, classical references (Charaka/Ashtanga), and non-diagnostic safe practices..."
                  value={articleFormContent}
                  onChange={(e) => setArticleFormContent(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="p-3 bg-[#F0F5F1] rounded-lg border border-[#CCDCD2] text-xs text-[#234B36] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
                <span>
                  <strong>Governance Workflow:</strong> Submitting routes this article directly to the Platform Administrator for review. Practitioners cannot self-publish.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleArticleSubmit(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleArticleSubmit(false)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Admin Review</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM / RESCHEDULE CONSULTATION MODAL */}
      {activeConsultationModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-consult-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FAFAF7] w-full max-w-md rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                  Care Scheduling
                </span>
                <h3 id="confirm-consult-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
                  Confirm Consultation
                </h3>
              </div>
              <button
                onClick={() => setActiveConsultationModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmConsultation} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-white rounded-xl border border-[#E0E7E1] space-y-1">
                <p className="font-bold text-[#1E3F2E]">{activeConsultationModal.seekerName}</p>
                <p className="text-xs text-[#526B5C]">Topic: {activeConsultationModal.topic}</p>
                <p className="text-xs text-[#526B5C]">Preferred Time: {activeConsultationModal.preferredSlot}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E3F2E] mb-1">
                  Confirmed Schedule Window
                </label>
                <input
                  type="text"
                  required
                  value={scheduledSlotInput}
                  onChange={(e) => setScheduledSlotInput(e.target.value)}
                  placeholder="e.g., Tomorrow at 10:30 AM (Virtual Review)"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E3F2E] mb-1">
                  Physician Pre-Consultation Instructions
                </label>
                <textarea
                  rows={3}
                  value={consultationNoteInput}
                  onChange={(e) => setConsultationNoteInput(e.target.value)}
                  placeholder="e.g., Please have a warm cup of water ready and track morning wakefulness patterns..."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveConsultationModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Appointment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Notice in Practitioner Dashboard */}
      <SafetyBanner compact />
    </div>
  );
};
