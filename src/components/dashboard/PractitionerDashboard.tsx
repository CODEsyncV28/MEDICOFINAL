import React, { useState, useMemo, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import {
  ClientRecord,
  WellnessProgram,
  EducationalArticle,
  Practitioner,
  AYUSHDiscipline,
  WellnessCategory,
} from '../../types';
import {
  ConsultationDocument,
  ConsultationStatus,
  EducationalArticleDocument,
  WellnessProgramDocument,
  ArticleApprovalStatus,
  ProgramApprovalStatus,
} from '../../types/firebase';
import {
  fetchConsultationsForPractitioner,
  getConsultationTopicLabel,
  getPreferredSlotLabel,
  updateConsultationStatus,
} from '../../services/consultationService';
import {
  fetchClientsForPractitioner,
  updateClientObservationNotes,
} from '../../services/practitionerService';
import {
  fetchArticlesForPractitioner,
  saveOrSubmitArticle,
} from '../../services/contentService';
import {
  fetchProgramsForPractitioner,
  saveOrSubmitProgram,
} from '../../services/programService';
import { SafetyBanner } from '../common/SafetyBanner';

interface PractitionerDashboardProps {
  practitioner: Practitioner;
  clients?: ClientRecord[];
  programs: WellnessProgram[];
  articles: EducationalArticle[];
  programsRefreshKey?: number;
  onOpenNewRegimen: () => void;
  onReadArticle: (article: EducationalArticle) => void;
  onSwitchRole?: () => void;
  onConsultationUpdated?: () => void;
  canSwitchToAdmin?: boolean;
  isDemoMode?: boolean;
}

function formatReadableDate(iso?: string | null): string {
  if (!iso) return 'Not submitted';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function getArticleStatusMeta(status: ArticleApprovalStatus): { label: string; className: string } {
  switch (status) {
    case 'published':
      return { label: 'Approved', className: 'bg-[#EBF2ED] text-[#244E38]' };
    case 'pending_approval':
      return { label: 'Pending Review', className: 'bg-[#FEF3C7] text-[#92400E]' };
    case 'revision_requested':
      return { label: 'Revision Requested', className: 'bg-[#FBF2EE] text-[#A64B2A]' };
    default:
      return { label: 'Draft', className: 'bg-slate-100 text-slate-700' };
  }
}

function getProgramStatusMeta(status: ProgramApprovalStatus): { label: string; className: string } {
  switch (status) {
    case 'published':
      return { label: 'Published', className: 'bg-[#EBF2ED] text-[#244E38]' };
    case 'pending_approval':
      return { label: 'Pending Approval', className: 'bg-[#FEF3C7] text-[#92400E]' };
    case 'revision_requested':
      return { label: 'Revision Requested', className: 'bg-[#FBF2EE] text-[#A64B2A]' };
    default:
      return { label: 'Draft', className: 'bg-slate-100 text-slate-700' };
  }
}

export const PractitionerDashboard: React.FC<PractitionerDashboardProps> = ({
  practitioner,
  clients = [],
  programsRefreshKey = 0,
  onOpenNewRegimen,
  onReadArticle,
  onSwitchRole,
  onConsultationUpdated,
  canSwitchToAdmin = false,
  isDemoMode = false,
}) => {
  // Navigation / Tab state within practitioner workspace
  const [activeTab, setActiveTab] = useState<'roster' | 'consultations' | 'programs' | 'authoring'>('roster');

  // Client roster filtering & state (hydrated from practitionerService)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'On Track' | 'Active' | 'Needs Review'>('All');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('All');
  const [clientList, setClientList] = useState<ClientRecord[]>(clients);
  const [clientsLoading, setClientsLoading] = useState<boolean>(true);
  const [clientsError, setClientsError] = useState<string | null>(null);

  // Client detail drawer state
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<'Active' | 'Needs Review' | 'On Track'>('Active');
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [saveNotesToast, setSaveNotesToast] = useState<string | null>(null);

  // Programme management & editing (hydrated from programService)
  const [programList, setProgramList] = useState<WellnessProgramDocument[]>([]);
  const [programsLoading, setProgramsLoading] = useState<boolean>(true);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [editingProgram, setEditingProgram] = useState<WellnessProgramDocument | null>(null);
  const [programEditError, setProgramEditError] = useState<string | null>(null);
  const [isSavingProgramEdit, setIsSavingProgramEdit] = useState<boolean>(false);
  const [programEditSuccess, setProgramEditSuccess] = useState<string | null>(null);

  // Educational content authoring (hydrated from contentService)
  const [authoredArticles, setAuthoredArticles] = useState<EducationalArticleDocument[]>([]);
  const [articlesLoading, setArticlesLoading] = useState<boolean>(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<EducationalArticleDocument | null>(null);
  const [articleFormTitle, setArticleFormTitle] = useState('');
  const [articleFormDiscipline, setArticleFormDiscipline] = useState<AYUSHDiscipline>('Ayurveda');
  const [articleFormCategory, setArticleFormCategory] = useState<WellnessCategory>('Lifestyle Education');
  const [articleFormReadTime, setArticleFormReadTime] = useState('5 min read');
  const [articleFormSummary, setArticleFormSummary] = useState('');
  const [articleFormContent, setArticleFormContent] = useState('');
  const [articleModalError, setArticleModalError] = useState<string | null>(null);
  const [isSavingArticle, setIsSavingArticle] = useState<boolean>(false);
  const [authorSuccessMsg, setAuthorSuccessMsg] = useState<string | null>(null);

  // Consultation requests (hydrated from consultationService)
  const [consultations, setConsultations] = useState<ConsultationDocument[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState<boolean>(true);
  const [consultationsError, setConsultationsError] = useState<string | null>(null);
  const [activeConsultationModal, setActiveConsultationModal] = useState<ConsultationDocument | null>(null);
  const [consultationModalAction, setConsultationModalAction] = useState<'confirmed' | 'rescheduled' | 'rejected'>('confirmed');
  const [scheduledSlotInput, setScheduledSlotInput] = useState<string>('Tomorrow at 02:00 PM');
  const [consultationNoteInput, setConsultationNoteInput] = useState<string>('');
  const [isUpdatingConsultation, setIsUpdatingConsultation] = useState<boolean>(false);
  const [consultationModalError, setConsultationModalError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydratePractitionerWorkspace() {
      setClientsLoading(true);
      setConsultationsLoading(true);
      setProgramsLoading(true);
      setArticlesLoading(true);
      setClientsError(null);
      setConsultationsError(null);
      setProgramsError(null);
      setArticlesError(null);

      try {
        const [loadedClients, loadedConsultations, loadedPrograms, loadedArticles] =
          await Promise.all([
            fetchClientsForPractitioner(practitioner.id),
            fetchConsultationsForPractitioner(practitioner.id),
            fetchProgramsForPractitioner(practitioner.id),
            fetchArticlesForPractitioner(practitioner.id),
          ]);

        if (!isMounted) return;
        setClientList(loadedClients);
        setConsultations(loadedConsultations);
        setProgramList(loadedPrograms);
        setAuthoredArticles(loadedArticles);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Unable to load practitioner workspace data.';
        setClientsError(msg);
        setConsultationsError(msg);
        setProgramsError(msg);
        setArticlesError(msg);
      } finally {
        if (isMounted) {
          setClientsLoading(false);
          setConsultationsLoading(false);
          setProgramsLoading(false);
          setArticlesLoading(false);
        }
      }
    }

    hydratePractitionerWorkspace();
    return () => {
      isMounted = false;
    };
  }, [practitioner.id]);

  // Refresh practitioner programmes immediately after NewRegimenModal saves a new programme
  useEffect(() => {
    if (programsRefreshKey <= 0) return;
    let isMounted = true;
    fetchProgramsForPractitioner(practitioner.id)
      .then((loaded) => {
        if (isMounted) {
          setProgramList(loaded);
          setProgramsError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setProgramsError(
            err instanceof Error ? err.message : 'Unable to refresh wellness programmes.'
          );
        }
      });
    return () => {
      isMounted = false;
    };
  }, [programsRefreshKey, practitioner.id]);

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
    setNotesError(null);
  };

  // Handle save client observation note persistently via practitionerService
  const handleSaveClientNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setSavingNotes(true);
    setNotesError(null);
    setSaveNotesToast(null);

    try {
      const updated = await updateClientObservationNotes(
        selectedClient.id,
        editingNotes,
        editingStatus,
        practitioner.id,
        selectedClient
      );

      setClientList((prev) => {
        const exists = prev.some((c) => c.id === updated.id);
        return exists
          ? prev.map((c) => (c.id === updated.id ? updated : c))
          : [updated, ...prev];
      });
      setSelectedClient(updated);
      setSaveNotesToast('Observation note saved persistently for this practitioner');
      setTimeout(() => setSaveNotesToast(null), 3000);
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : 'Could not save client observation note.'
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const handleOpenNewArticleModal = () => {
    setEditingArticle(null);
    setArticleFormTitle('');
    setArticleFormDiscipline(practitioner.discipline || 'Ayurveda');
    setArticleFormCategory('Lifestyle Education');
    setArticleFormReadTime('5 min read');
    setArticleFormSummary('');
    setArticleFormContent('');
    setArticleModalError(null);
    setIsAuthorModalOpen(true);
  };

  const handleOpenEditArticleModal = (article: EducationalArticleDocument) => {
    setEditingArticle(article);
    setArticleFormTitle(article.title);
    setArticleFormDiscipline(article.discipline);
    setArticleFormCategory(article.category);
    setArticleFormReadTime(article.readTime || '5 min read');
    setArticleFormSummary(article.summary);
    setArticleFormContent(article.fullContent);
    setArticleModalError(null);
    setIsAuthorModalOpen(true);
  };

  // Handle saving an edited programme persistently (Draft or Submit for Admin Approval)
  const handleSaveProgramEdit = async (submitForReview: boolean) => {
    if (!editingProgram) return;
    setProgramEditError(null);
    setIsSavingProgramEdit(true);

    try {
      const saved = await saveOrSubmitProgram({
        id: editingProgram.id,
        title: editingProgram.title,
        discipline: editingProgram.discipline,
        category: editingProgram.category,
        durationWeeks: Number(editingProgram.durationWeeks),
        level: editingProgram.level,
        description: editingProgram.description,
        nextSessionTemplate: editingProgram.nextSessionTemplate,
        creatorPractitionerId: practitioner.id,
        practitionerName: practitioner.name,
        practitionerTitle: practitioner.qualification,
        submitForReview,
      });

      setProgramList((prev) =>
        prev.some((p) => p.id === saved.id)
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...prev]
      );
      setEditingProgram(null);
      setProgramEditSuccess(
        submitForReview
          ? `Regimen "${saved.title}" updated and submitted for Admin approval.`
          : `Regimen "${saved.title}" saved as Draft.`
      );
      setTimeout(() => setProgramEditSuccess(null), 4000);
    } catch (err) {
      setProgramEditError(
        err instanceof Error ? err.message : 'Unable to save wellness programme changes.'
      );
    } finally {
      setIsSavingProgramEdit(false);
    }
  };

  // Handle author article Draft or Submit for Admin Review (creates or updates without duplicates)
  const handleArticleSubmit = async (asDraft: boolean) => {
    setArticleModalError(null);
    setIsSavingArticle(true);

    try {
      const saved = await saveOrSubmitArticle({
        id: editingArticle?.id,
        title: articleFormTitle,
        discipline: articleFormDiscipline,
        category: articleFormCategory,
        readTime: articleFormReadTime,
        summary: articleFormSummary,
        fullContent: articleFormContent,
        authorId: practitioner.id,
        authorName: practitioner.name,
        authorQualification: practitioner.qualification,
        submitForReview: !asDraft,
      });

      setAuthoredArticles((prev) =>
        prev.some((a) => a.id === saved.id)
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [saved, ...prev]
      );

      setIsAuthorModalOpen(false);
      setEditingArticle(null);
      setArticleFormTitle('');
      setArticleFormSummary('');
      setArticleFormContent('');
      setAuthorSuccessMsg(
        asDraft
          ? `Draft "${saved.title}" saved persistently.`
          : `Article "${saved.title}" submitted for Administrator Governance review.`
      );
      setTimeout(() => setAuthorSuccessMsg(null), 4000);
    } catch (err) {
      setArticleModalError(
        err instanceof Error ? err.message : 'Unable to save educational article.'
      );
    } finally {
      setIsSavingArticle(false);
    }
  };

  const handleOpenConsultationModal = (
    item: ConsultationDocument,
    action: 'confirmed' | 'rescheduled' | 'rejected'
  ) => {
    setActiveConsultationModal(item);
    setConsultationModalAction(action);
    setConsultationModalError(null);
    setScheduledSlotInput(
      item.scheduledTime ||
        `${item.preferredDate ? `${item.preferredDate} · ` : ''}${getPreferredSlotLabel(item.preferredSlot)}`
    );
    setConsultationNoteInput(item.practitionerNotes || '');
  };

  // Handle consultation confirm, reschedule, or decline persistently
  const handleUpdateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationModal) return;

    setConsultationModalError(null);
    if (
      (consultationModalAction === 'confirmed' || consultationModalAction === 'rescheduled') &&
      !scheduledSlotInput.trim()
    ) {
      setConsultationModalError('Please enter a scheduled date and time window.');
      return;
    }

    setIsUpdatingConsultation(true);
    try {
      const updated = await updateConsultationStatus(activeConsultationModal.id, {
        status: consultationModalAction,
        practitionerId: practitioner.id,
        scheduledTime:
          consultationModalAction === 'rejected' ? null : scheduledSlotInput.trim(),
        practitionerNotes: consultationNoteInput.trim() || null,
      });

      setConsultations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setActiveConsultationModal(null);
      setConsultationNoteInput('');
      onConsultationUpdated?.();
    } catch (err) {
      setConsultationModalError(
        err instanceof Error ? err.message : 'Unable to update consultation request.'
      );
    } finally {
      setIsUpdatingConsultation(false);
    }
  };

  // Counts for overview
  const pendingConsultationsCount = consultations.filter((c) => c.status === 'pending').length;
  const pendingSubmissionsCount =
    authoredArticles.filter((a) => a.status === 'pending_approval').length +
    programList.filter((p) => p.status === 'pending_approval').length;

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
          {isDemoMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              DEMO MODE · UI Preview Only
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#526B5C] hidden md:inline">
            RBAC: /clientProfiles restricted
          </span>
          {canSwitchToAdmin && onSwitchRole && (
            <button
              type="button"
              onClick={onSwitchRole}
              className={`font-bold whitespace-nowrap transition-colors ${
                isDemoMode
                  ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'text-[#2D5A43] hover:text-[#183626] underline underline-offset-2'
              }`}
            >
              {isDemoMode ? 'DEMO MODE: Switch to Administrator Portal →' : 'Switch to Administrator Portal →'}
            </button>
          )}
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
            onClick={handleOpenNewArticleModal}
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
              {programList.length}
            </span>
            <span className="text-xs text-[#526B5C]">Curated Regimens</span>
          </div>
          <p className="text-[11px] text-[#5E7869]">
            {programList.filter((p) => p.status === 'published').length} Published ·{' '}
            {programList.filter((p) => p.status === 'pending_approval').length} In Review
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
            {consultations.filter((c) => c.status === 'confirmed' || c.status === 'rescheduled').length} Confirmed or Rescheduled
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
          <span>Wellness Programmes ({programList.length})</span>
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
          {clientsLoading ? (
            <div className="p-8 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] flex items-center justify-center gap-2 text-xs text-[#526B5C]">
              <Loader2 className="w-4 h-4 animate-spin text-[#2D5A43]" />
              <span>Loading assigned client records...</span>
            </div>
          ) : clientsError ? (
            <div className="p-4 rounded-xl border border-[#ECC8C1] bg-[#FDF2F0] text-xs text-[#9B2C1B]">
              {clientsError}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#CCD8CF] bg-[#FAFBF9] text-center text-xs text-[#526B5C]">
              No assigned seekers match the current filters for {practitioner.name}.
            </div>
          ) : (
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{client.name}</span>
                            {client.isSimulated !== false && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5] font-semibold">
                                Demo Record
                              </span>
                            )}
                          </div>
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
                          View Profile &amp; Notes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

          {consultationsLoading ? (
            <div className="p-8 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] flex items-center justify-center gap-2 text-xs text-[#526B5C]">
              <Loader2 className="w-4 h-4 animate-spin text-[#2D5A43]" />
              <span>Loading consultation inbox...</span>
            </div>
          ) : consultationsError ? (
            <div className="p-4 rounded-xl border border-[#ECC8C1] bg-[#FDF2F0] text-xs text-[#9B2C1B]">
              {consultationsError}
            </div>
          ) : consultations.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#CCD8CF] bg-[#FAFBF9] text-center text-xs text-[#526B5C]">
              No consultation requests addressed to {practitioner.name} yet.
            </div>
          ) : (
            <div className="space-y-4">
              {consultations.map((item) => {
                const statusBadgeMap: Record<
                  ConsultationStatus,
                  { label: string; className: string }
                > = {
                  pending: { label: 'Pending Review', className: 'bg-[#FEF3C7] text-[#92400E]' },
                  confirmed: { label: 'Confirmed', className: 'bg-[#EBF2ED] text-[#244E38]' },
                  rescheduled: { label: 'Rescheduled', className: 'bg-[#E8F0F7] text-[#1E4E79]' },
                  rejected: { label: 'Declined', className: 'bg-[#FDF2F0] text-[#9B2C1B]' },
                  completed: { label: 'Completed', className: 'bg-[#EBF2ED] text-[#244E38]' },
                  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600' },
                };
                const badge = statusBadgeMap[item.status] || statusBadgeMap.pending;
                const nameTokens = (item.userName || 'WS').match(/[a-zA-Z]+/g) || ['WS'];
                const initials =
                  nameTokens.length >= 2
                    ? `${nameTokens[0][0]}${nameTokens[1][0]}`.toUpperCase()
                    : nameTokens[0].slice(0, 2).toUpperCase();

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-3 hover:border-[#CAD7CC] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#E5EDE7] text-[#2D5A43] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1E3F2E]">{item.userName}</h4>
                          <p className="text-xs text-[#526B5C]">
                            Seeker ID: <span className="font-mono">{item.userId}</span> · Preferred:{' '}
                            {item.preferredDate ? `${item.preferredDate} · ` : ''}
                            {getPreferredSlotLabel(item.preferredSlot)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {item.isSimulated && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5] font-semibold">
                            Demo Request
                          </span>
                        )}
                        <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[#3C5345] space-y-1.5 bg-white p-3.5 rounded-lg border border-[#E5ECE7]">
                      <p>
                        <strong>Focus Area:</strong>{' '}
                        {item.topicLabel || getConsultationTopicLabel(item.topic)}
                      </p>
                      <p>
                        <strong>Seeker Observation Note:</strong>{' '}
                        {item.notes ? `"${item.notes}"` : 'No additional observation note provided.'}
                      </p>
                      {item.scheduledTime && (
                        <p className="text-[#2D5A43] font-semibold">
                          Scheduled Appointment: {item.scheduledTime}
                        </p>
                      )}
                      {item.practitionerNotes && (
                        <p className="text-[#526B5C] italic">
                          Physician Note: {item.practitionerNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenConsultationModal(item, 'confirmed')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg shadow-xs transition-colors"
                      >
                        {item.status === 'pending' ? 'Accept & Confirm' : 'Confirm Slot'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenConsultationModal(item, 'rescheduled')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#1E4E79] bg-[#E8F0F7] hover:bg-[#DCE8F2] border border-[#C6D8E8] rounded-lg transition-colors"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenConsultationModal(item, 'rejected')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#9B2C1B] bg-[#FDF2F0] hover:bg-[#F9E3DF] border border-[#ECC8C1] rounded-lg transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#DCE6DE] text-xs text-[#4F6858] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
            <span>
              <strong>Consultation Authorization Rules:</strong> As the assigned physician, you are authorized to confirm, reschedule, or decline appointment requests addressed to {practitioner.name} and attach review notes.
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
                Regimen Architecture &amp; Templates
              </span>
              <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                Wellness Programme Catalog
              </h2>
              <p className="text-xs text-[#526B5C]">
                Educational lifestyle curricula authored by {practitioner.name}. Edits and submissions undergo Admin approval before public release.
              </p>
            </div>

            <button
              type="button"
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

          {programsLoading ? (
            <div className="p-8 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] flex items-center justify-center gap-2 text-xs text-[#526B5C]">
              <Loader2 className="w-4 h-4 animate-spin text-[#2D5A43]" />
              <span>Loading wellness programmes...</span>
            </div>
          ) : programsError ? (
            <div className="p-4 rounded-xl border border-[#ECC8C1] bg-[#FDF2F0] text-xs text-[#9B2C1B]">
              {programsError}
            </div>
          ) : programList.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#CCD8CF] bg-[#FAFBF9] text-center text-xs text-[#526B5C]">
              No wellness programmes authored by {practitioner.name} yet. Create a regimen template to begin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programList.map((prog) => {
                const badge = getProgramStatusMeta(prog.status);
                return (
                  <div
                    key={prog.id}
                    className="p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#526B5C]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#2D5A43]">{prog.discipline}</span>
                          {prog.isSimulated && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5] font-semibold">
                              Demo Record
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                        {prog.title}
                      </h3>

                      <p className="text-xs text-[#4E6457] leading-relaxed line-clamp-3">
                        {prog.description}
                      </p>

                      {prog.reviewNotes && (
                        <div
                          className={`p-2.5 rounded-lg border text-[11px] space-y-0.5 ${
                            prog.status === 'revision_requested'
                              ? 'bg-[#FDF2F0] border-[#ECC8C1] text-[#9B2C1B]'
                              : 'bg-white border-[#E5ECE7] text-[#4E6457]'
                          }`}
                        >
                          <p className="font-semibold">
                            Admin Feedback{prog.reviewedAt ? ` (${formatReadableDate(prog.reviewedAt)})` : ''}:
                          </p>
                          <p>{prog.reviewNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E8ECE6] space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#526B5C]">
                        <span>Duration: {prog.durationWeeks} Weeks</span>
                        <span>Level: {prog.level}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#2D5A43] font-medium">
                          {prog.totalSessions} Total Sessions · Updated {formatReadableDate(prog.updatedAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProgramEditError(null);
                            setEditingProgram({ ...prog });
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2D5A43] hover:underline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>
                            {prog.status === 'revision_requested' ? 'Revise & Resubmit' : 'Edit Template'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3.5 bg-[#FAFBF9] rounded-xl border border-[#E0E7E1] text-xs text-[#526B5C] flex items-start gap-2">
            <Lock className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
            <span>
              <strong>Platform Governance Rule:</strong> Newly created or edited regimens are stored in <em>Draft</em> or <em>Pending Approval</em> status. Practitioners cannot bypass administrator verification to self-publish into the public seeker catalog.
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
                Authored Wellness Guides &amp; Articles
              </h2>
              <p className="text-xs text-[#526B5C]">
                Draft evidence-informed educational content authored by {practitioner.name}. Direct publication is restricted; submissions route to the Administrator Governance queue.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNewArticleModal}
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

          {articlesLoading ? (
            <div className="p-8 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] flex items-center justify-center gap-2 text-xs text-[#526B5C]">
              <Loader2 className="w-4 h-4 animate-spin text-[#2D5A43]" />
              <span>Loading authored wellness guides...</span>
            </div>
          ) : articlesError ? (
            <div className="p-4 rounded-xl border border-[#ECC8C1] bg-[#FDF2F0] text-xs text-[#9B2C1B]">
              {articlesError}
            </div>
          ) : authoredArticles.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#CCD8CF] bg-[#FAFBF9] text-center text-xs text-[#526B5C]">
              No educational articles authored by {practitioner.name} yet. Click &ldquo;Draft New Article&rdquo; to begin.
            </div>
          ) : (
            <div className="space-y-3.5">
              {authoredArticles.map((art) => {
                const badge = getArticleStatusMeta(art.status);
                return (
                  <div
                    key={art.id}
                    className="p-4 sm:p-5 rounded-xl border border-[#E0E7E1] bg-[#FAFBF9] space-y-2.5 hover:border-[#CAD7CC] transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-[#526B5C]">
                        <span className="font-semibold text-[#2D5A43]">{art.discipline}</span>
                        <span>·</span>
                        <span>{art.category}</span>
                        <span>·</span>
                        <span>{art.readTime}</span>
                        <span>·</span>
                        <span>
                          {art.submittedAt
                            ? `Submitted: ${formatReadableDate(art.submittedAt)}`
                            : `Updated: ${formatReadableDate(art.updatedAt)}`}
                        </span>
                        {art.isSimulated && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF2EF] text-[#A64B2A] border border-[#F0DCD5] font-semibold">
                            Demo Record
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-base text-[#1E3F2E]">
                      {art.title}
                    </h3>

                    <p className="text-xs text-[#4E6457] leading-relaxed">
                      {art.summary}
                    </p>

                    {art.reviewNotes && (
                      <div
                        className={`p-3 rounded-lg border text-xs space-y-0.5 ${
                          art.status === 'revision_requested'
                            ? 'bg-[#FDF2F0] border-[#ECC8C1] text-[#9B2C1B]'
                            : 'bg-white border-[#E5ECE7] text-[#4E6457]'
                        }`}
                      >
                        <p className="font-semibold">
                          Admin Review Feedback
                          {art.reviewedAt ? ` · ${formatReadableDate(art.reviewedAt)}` : ''}:
                        </p>
                        <p>{art.reviewNotes}</p>
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#526B5C] border-t border-[#EEF2EC]">
                      <span>
                        Status:{' '}
                        <strong>
                          {art.status === 'published'
                            ? 'Approved & Published by Admin'
                            : art.status === 'pending_approval'
                            ? 'In Administrator Review Queue'
                            : art.status === 'revision_requested'
                            ? 'Revision Requested by Admin'
                            : 'Saved as Private Draft'}
                        </strong>
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleOpenEditArticleModal(art)}
                          className="inline-flex items-center gap-1 font-semibold text-[#2D5A43] hover:underline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>
                            {art.status === 'revision_requested'
                              ? 'Edit & Resubmit'
                              : art.status === 'draft'
                              ? 'Edit / Submit'
                              : 'Edit Guide'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onReadArticle({
                              id: art.id,
                              title: art.title,
                              discipline: art.discipline,
                              category: art.category,
                              readTime: art.readTime,
                              author: art.authorName || practitioner.name,
                              authorQualification: art.authorQualification || practitioner.qualification,
                              summary: art.summary,
                              fullContent: art.fullContent,
                              keyTakeaways: art.keyTakeaways?.length
                                ? art.keyTakeaways
                                : [
                                    'Focuses on classical non-diagnostic health cultivation.',
                                    'Safe culinary doses of traditional herbs.',
                                    'Consult with primary physician for acute conditions.',
                                  ],
                              reviewedDate: formatReadableDate(art.reviewedAt || art.submittedAt || art.updatedAt),
                            });
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-[#2D5A43] hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Article Content</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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

                {notesError && (
                  <div role="alert" className="p-2.5 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-[#9B2C1B] text-xs font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{notesError}</span>
                  </div>
                )}

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
                    disabled={savingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] disabled:opacity-60 rounded-lg transition-colors shadow-xs"
                  >
                    {savingNotes ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{savingNotes ? 'Saving...' : 'Save Observation Note'}</span>
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
                type="button"
                onClick={() => setEditingProgram(null)}
                aria-label="Close edit programme dialog"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProgramEdit(true);
              }}
              noValidate
              className="p-6 space-y-4"
            >
              {editingProgram.reviewNotes && editingProgram.status === 'revision_requested' && (
                <div className="p-3 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-xs text-[#9B2C1B] space-y-0.5">
                  <p className="font-semibold">Admin Revision Feedback:</p>
                  <p>{editingProgram.reviewNotes}</p>
                </div>
              )}

              {programEditError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-xs text-[#9B2C1B] font-medium flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{programEditError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-program-name"
                  className="block text-xs font-semibold text-[#2C4035] mb-1"
                >
                  Programme Title *
                </label>
                <input
                  id="edit-program-name"
                  type="text"
                  required
                  value={editingProgram.title}
                  onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-program-weeks"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Duration (Weeks)
                  </label>
                  <input
                    id="edit-program-weeks"
                    type="number"
                    min={1}
                    max={52}
                    value={editingProgram.durationWeeks}
                    onChange={(e) =>
                      setEditingProgram({
                        ...editingProgram,
                        durationWeeks: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-program-level"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Level
                  </label>
                  <select
                    id="edit-program-level"
                    value={editingProgram.level}
                    onChange={(e) =>
                      setEditingProgram({ ...editingProgram, level: e.target.value as any })
                    }
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Deepening">Deepening</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-program-desc"
                  className="block text-xs font-semibold text-[#2C4035] mb-1"
                >
                  Description &amp; Clinical Objectives *
                </label>
                <textarea
                  id="edit-program-desc"
                  rows={3}
                  required
                  value={editingProgram.description}
                  onChange={(e) =>
                    setEditingProgram({ ...editingProgram, description: e.target.value })
                  }
                  className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="p-3 bg-[#FBF2EE] rounded-lg border border-[#F0DCD5] text-xs text-[#A64B2A] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#A64B2A] shrink-0 mt-0.5" />
                <span>
                  <strong>Governance Requirement:</strong> Submitting moves the regimen to <em>Pending Approval</em>. Platform Admin approval is mandatory before published changes appear in seeker dashboards.
                </span>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingProgramEdit}
                  onClick={() => handleSaveProgramEdit(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1E3F2E] bg-white hover:bg-[#F2F6F3] border border-[#CCD5CB] rounded-lg transition-colors disabled:opacity-60"
                >
                  <FileText className="w-3.5 h-3.5 text-[#2D5A43]" />
                  <span>Save as Draft</span>
                </button>
                <button
                  type="submit"
                  disabled={isSavingProgramEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs disabled:opacity-60"
                >
                  {isSavingProgramEdit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit for Admin Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAFT / EDIT EDUCATIONAL ARTICLE MODAL */}
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
                  {editingArticle ? 'Edit Educational Wellness Guide' : 'Author Educational Wellness Guide'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAuthorModalOpen(false);
                  setEditingArticle(null);
                  setArticleModalError(null);
                }}
                aria-label="Close article authoring dialog"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editingArticle?.reviewNotes && editingArticle.status === 'revision_requested' && (
                <div className="p-3 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-xs text-[#9B2C1B] space-y-0.5">
                  <p className="font-semibold">Admin Revision Feedback:</p>
                  <p>{editingArticle.reviewNotes}</p>
                </div>
              )}

              {articleModalError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-xs text-[#9B2C1B] font-medium flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{articleModalError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="author-article-title"
                  className="block text-xs font-semibold text-[#2C4035] mb-1"
                >
                  Article Title *
                </label>
                <input
                  id="author-article-title"
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
                  <label
                    htmlFor="author-article-discipline"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Discipline
                  </label>
                  <select
                    id="author-article-discipline"
                    value={articleFormDiscipline}
                    onChange={(e) => setArticleFormDiscipline(e.target.value as any)}
                    className="w-full text-xs sm:text-sm p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-800"
                  >
                    <option value="Ayurveda">Ayurveda</option>
                    <option value="Yoga & Naturopathy">Yoga &amp; Naturopathy</option>
                    <option value="Unani">Unani</option>
                    <option value="Siddha">Siddha</option>
                    <option value="Homeopathy">Homeopathy</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="author-article-category"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="author-article-category"
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
                  <label
                    htmlFor="author-article-readtime"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Read Time
                  </label>
                  <input
                    id="author-article-readtime"
                    type="text"
                    value={articleFormReadTime}
                    onChange={(e) => setArticleFormReadTime(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2 rounded-lg border border-[#CCD5CB] bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="author-article-summary"
                  className="block text-xs font-semibold text-[#2C4035] mb-1"
                >
                  Educational Thesis / Summary *
                </label>
                <textarea
                  id="author-article-summary"
                  rows={2}
                  required
                  placeholder="Summarize the core traditional concept, circadian relevance, and practical self-observation..."
                  value={articleFormSummary}
                  onChange={(e) => setArticleFormSummary(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div>
                <label
                  htmlFor="author-article-content"
                  className="block text-xs font-semibold text-[#2C4035] mb-1"
                >
                  Educational Content
                </label>
                <textarea
                  id="author-article-content"
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
                  disabled={isSavingArticle}
                  onClick={() => handleArticleSubmit(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-[#CCD5CB] disabled:opacity-60"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSavingArticle}
                  onClick={() => handleArticleSubmit(false)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs disabled:opacity-60"
                >
                  {isSavingArticle ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit for Admin Review</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM / RESCHEDULE / DECLINE CONSULTATION MODAL */}
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
                  {consultationModalAction === 'confirmed'
                    ? 'Confirm Consultation'
                    : consultationModalAction === 'rescheduled'
                    ? 'Reschedule Consultation'
                    : 'Decline Consultation Request'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveConsultationModal(null)}
                aria-label="Close consultation review dialog"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateConsultation} noValidate className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-white rounded-xl border border-[#E0E7E1] space-y-1">
                <p className="font-bold text-[#1E3F2E]">{activeConsultationModal.userName}</p>
                <p className="text-xs text-[#526B5C]">
                  Topic: {activeConsultationModal.topicLabel || getConsultationTopicLabel(activeConsultationModal.topic)}
                </p>
                <p className="text-xs text-[#526B5C]">
                  Preferred Time:{' '}
                  {activeConsultationModal.preferredDate ? `${activeConsultationModal.preferredDate} · ` : ''}
                  {getPreferredSlotLabel(activeConsultationModal.preferredSlot)}
                </p>
                {activeConsultationModal.notes && (
                  <p className="text-xs text-[#526B5C] italic">
                    Seeker Note: &ldquo;{activeConsultationModal.notes}&rdquo;
                  </p>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#1E3F2E] mb-1.5">
                  Practitioner Decision
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: 'confirmed', label: 'Accept / Confirm' },
                      { value: 'rescheduled', label: 'Reschedule' },
                      { value: 'rejected', label: 'Decline' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setConsultationModalAction(opt.value);
                        setConsultationModalError(null);
                      }}
                      className={`py-2 px-2 text-xs rounded-lg border font-semibold transition-colors ${
                        consultationModalAction === opt.value
                          ? opt.value === 'rejected'
                            ? 'border-[#9B2C1B] bg-[#FDF2F0] text-[#9B2C1B]'
                            : 'border-[#2D5A43] bg-[#EBF2ED] text-[#1E3F2E]'
                          : 'border-[#CCD5CB] bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {consultationModalError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-xs text-[#9B2C1B] flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{consultationModalError}</span>
                </div>
              )}

              {consultationModalAction !== 'rejected' && (
                <div>
                  <label
                    htmlFor="practitioner-scheduled-slot"
                    className="block text-xs font-semibold text-[#1E3F2E] mb-1"
                  >
                    {consultationModalAction === 'rescheduled'
                      ? 'Proposed New Appointment Date & Time *'
                      : 'Confirmed Schedule Window *'}
                  </label>
                  <input
                    id="practitioner-scheduled-slot"
                    type="text"
                    required
                    value={scheduledSlotInput}
                    onChange={(e) => setScheduledSlotInput(e.target.value)}
                    placeholder="e.g., 2026-11-28 at 10:30 AM (Virtual Review)"
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="practitioner-consult-notes"
                  className="block text-xs font-semibold text-[#1E3F2E] mb-1"
                >
                  {consultationModalAction === 'rejected'
                    ? 'Reason / Alternative Guidance for Seeker'
                    : 'Physician Pre-Consultation Instructions'}
                </label>
                <textarea
                  id="practitioner-consult-notes"
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
                  disabled={isUpdatingConsultation}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs disabled:opacity-60 ${
                    consultationModalAction === 'rejected'
                      ? 'bg-[#9B2C1B] hover:bg-[#7F2315]'
                      : 'bg-[#2D5A43] hover:bg-[#234835]'
                  }`}
                >
                  {isUpdatingConsultation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {consultationModalAction === 'confirmed'
                      ? 'Confirm Appointment'
                      : consultationModalAction === 'rescheduled'
                      ? 'Save Rescheduled Time'
                      : 'Confirm Decline'}
                  </span>
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
