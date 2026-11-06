import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/landing/LandingPage';
import { RoleSelector } from './components/roles/RoleSelector';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { PractitionerDashboard } from './components/dashboard/PractitionerDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { AssessmentModal } from './components/modals/AssessmentModal';
import { ContentReaderModal } from './components/modals/ContentReaderModal';
import { ConsultationModal } from './components/modals/ConsultationModal';
import { NewRegimenModal } from './components/modals/NewRegimenModal';
import { AuthModal } from './components/modals/AuthModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  toggleActivityStatus,
  fetchDailyActivitiesForDate,
  updateApprovalDecision,
} from './services/firestoreService';
import {
  submitAssessment,
  fetchLatestAssessment,
  fetchAssessmentHistory,
} from './services/assessmentService';
import {
  fetchLatestWellnessPlan,
  fetchWellnessPlanHistory,
  generateWellnessPlan,
} from './services/wellnessPlanService';
import {
  RoleType,
  DailyActivity,
  WellnessProgram,
  EducationalArticle,
  ContentApprovalItem,
  AYUSHDiscipline,
  WellnessCategory,
} from './types';
import {
  WellnessPlan,
  AssessmentVersionRecord,
} from './types/assessment';
import {
  INITIAL_DAILY_ACTIVITIES,
  INITIAL_PROGRAMS,
  INITIAL_ARTICLES,
  PRIMARY_PRACTITIONER,
  INITIAL_CLIENTS,
  INITIAL_APPROVAL_ITEMS,
} from './data/mockData';
import { EXPANDED_ASSESSMENT_QUESTIONS } from './data/assessmentQuestions';

function AppContent() {
  const { isConfigured, firebaseUser, userProfile, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'roles' | 'dashboard'>(() => {
    return firebaseUser ? 'dashboard' : 'landing';
  });
  const [currentRole, setCurrentRole] = useState<RoleType>(() => {
    return (userProfile?.role as RoleType) || 'user';
  });

  // Application State
  const [activities, setActivities] = useState<DailyActivity[]>(INITIAL_DAILY_ACTIVITIES);
  const [programs, setPrograms] = useState<WellnessProgram[]>(INITIAL_PROGRAMS);
  const [articles, setArticles] = useState<EducationalArticle[]>(INITIAL_ARTICLES);
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [approvalItems, setApprovalItems] = useState<ContentApprovalItem[]>(INITIAL_APPROVAL_ITEMS);

  // Initial assessment: 3 answered for guest preview
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({
    circadian_waking_energy: 'gradual',
    digestive_appetite_strength: 'robust',
    movement_daily_type: 'active',
    q1: 'gradual',
    q2: 'robust',
    q3: 'active',
  });

  // Modular Wellness Plan & Assessment History State
  const [activePlan, setActivePlan] = useState<WellnessPlan | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentVersionRecord[]>([]);
  const [planHistory, setPlanHistory] = useState<WellnessPlan[]>([]);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Modal states
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [readingArticle, setReadingArticle] = useState<EducationalArticle | null>(null);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [isNewRegimenOpen, setIsNewRegimenOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Hydrate user data from storage / Firestore
  useEffect(() => {
    const effectiveUid = firebaseUser ? firebaseUser.uid : 'guest_seeker';

    let isMounted = true;
    async function loadUserData() {
      setIsLoadingData(true);
      try {
        // 1. Fetch user assessment history & latest record
        const historyRecords = await fetchAssessmentHistory(effectiveUid);
        const plans = await fetchWellnessPlanHistory(effectiveUid);
        const latestPlan = await fetchLatestWellnessPlan(effectiveUid);

        if (isMounted) {
          setAssessmentHistory(historyRecords);
          setPlanHistory(plans);

          if (historyRecords.length > 0) {
            setAssessmentAnswers(historyRecords[0].answers);
            setActivePlan(latestPlan);
          } else if (!firebaseUser) {
            // Guest mode: generate an initial demonstration baseline plan
            const mockRecord: AssessmentVersionRecord = {
              id: 'assess_guest_v1',
              userId: 'guest_seeker',
              version: 1,
              completedAt: new Date().toISOString(),
              answers: {
                circadian_waking_energy: 'gradual',
                digestive_appetite_strength: 'robust',
                movement_daily_type: 'active',
                q1: 'gradual',
                q2: 'robust',
                q3: 'active',
              },
              totalAnswered: 3,
              totalQuestions: 20,
              isComplete: false,
              analysis: {
                constitutionTendency: 'Pitta-Predominant Vitality',
                circadianRhythmCategory: 'Gradual Morning Awakening',
                digestiveAgniCategory: 'Robust Agni (Balanced)',
                sleepArchitectureCategory: 'Regular Night Schedule',
                movementPranaCategory: 'Active Daily Movement',
                stressMindCategory: 'Balanced Breath Focus',
                hydrationBalanceCategory: 'Adequate Hydration',
                digitalEnvironmentCategory: 'Balanced Screen Habits',
                primaryImbalanceRisk: 'Pitta excess heat',
                strengths: ['Strong digestive fire', 'Regular daily movement'],
                guidanceNote: 'Maintain midday cooling hydration and consistent sleep timing.',
              },
            };
            const initialDemoPlan = generateWellnessPlan('guest_seeker', mockRecord);
            setActivePlan(initialDemoPlan);
            setAssessmentHistory([mockRecord]);
            setPlanHistory([initialDemoPlan]);
          } else {
            // Newly registered user with no history: clean empty state
            setAssessmentAnswers({});
            setActivePlan(null);
            setAssessmentHistory([]);
            setPlanHistory([]);
          }
        }

        // 2. Fetch daily activities for today
        if (firebaseUser) {
          const today = new Date().toISOString().split('T')[0];
          const dailyDocs = await fetchDailyActivitiesForDate(firebaseUser.uid, today);
          if (isMounted) {
            if (dailyDocs && dailyDocs.length > 0) {
              setActivities((prev) =>
                prev.map((act) => {
                  const recorded = dailyDocs.find((d) => d.activityKey === act.id);
                  return recorded ? { ...act, completed: recorded.completed } : { ...act, completed: false };
                })
              );
            } else {
              setActivities((prev) => prev.map((act) => ({ ...act, completed: false })));
            }
          }
        }
      } catch (err) {
        console.warn('Hydration skipped or offline:', err);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [firebaseUser]);

  const prevUserRef = useRef<string | null>(null);

  // Redirect to appropriate dashboard according to user's assigned role after login,
  // or cleanly transition to landing page on logout without retaining prior user state.
  useEffect(() => {
    if (firebaseUser) {
      const assignedRole: RoleType = (userProfile?.role as RoleType) || 'user';
      setCurrentRole(assignedRole);
      setCurrentView('dashboard');
      prevUserRef.current = firebaseUser.uid;
    } else if (prevUserRef.current) {
      prevUserRef.current = null;
      setCurrentRole('user');
      setCurrentView('landing');
      showToast('Signed out successfully.');
    }
  }, [firebaseUser, userProfile?.role]);

  // Handlers
  const handleToggleActivity = async (id: string) => {
    const currentActivity = activities.find((act) => act.id === id);
    const updatedStatus = currentActivity ? !currentActivity.completed : true;

    setActivities((prev) =>
      prev.map((act) => {
        if (act.id === id) {
          showToast(updatedStatus ? `Marked "${act.title}" as completed` : `Reset "${act.title}"`);
          return { ...act, completed: updatedStatus };
        }
        return act;
      })
    );

    if (firebaseUser) {
      try {
        const today = new Date().toISOString().split('T')[0];
        await toggleActivityStatus(firebaseUser.uid, id, today, updatedStatus);
      } catch (err) {
        console.warn('Could not persist activity state to Firestore:', err);
      }
    }
  };

  const handleSelectRole = (role: RoleType) => {
    setCurrentRole(role);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssessmentComplete = async (
    answers: Record<string, string>,
    categoryNotes?: Record<string, string>
  ) => {
    const effectiveUid = firebaseUser ? firebaseUser.uid : 'guest_seeker';

    try {
      // Versioned multi-record submission & revised plan generation
      const { assessment, plan } = await submitAssessment(effectiveUid, answers, categoryNotes);

      setAssessmentAnswers(answers);
      setActivePlan(plan);
      setAssessmentHistory((prev) => [assessment, ...prev.filter((p) => p.id !== assessment.id)]);
      setPlanHistory((prev) => [plan, ...prev.filter((p) => p.id !== plan.id)]);

      if (assessment.version > 1) {
        showToast(`Version ${assessment.version} Assessment saved! Revised Wellness Plan generated with progress comparison.`);
      } else {
        showToast('Baseline Assessment saved! Your personalized Wellness Plan has been generated.');
      }
    } catch (err) {
      console.warn('Error during submitAssessment:', err);
      showToast('Assessment submitted successfully.');
    }
  };

  const handleAddRegimen = (regimen: {
    title: string;
    discipline: AYUSHDiscipline;
    category: WellnessCategory;
    durationWeeks: number;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Deepening';
  }) => {
    const newProg: WellnessProgram = {
      id: `prog-${Date.now()}`,
      title: regimen.title,
      discipline: regimen.discipline,
      category: regimen.category,
      durationWeeks: regimen.durationWeeks,
      completedSessions: 0,
      totalSessions: regimen.durationWeeks * 4,
      practitionerName: PRIMARY_PRACTITIONER.name,
      practitionerTitle: PRIMARY_PRACTITIONER.qualification,
      description: regimen.description,
      nextSession: 'Module 1: Orientation & Foundations',
      level: regimen.level,
    };
    setPrograms((prev) => [newProg, ...prev]);
    showToast(`Published template: "${regimen.title}"`);
  };

  const handleApproveItem = async (id: string) => {
    setApprovalItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'Approved', reviewNotes: 'Approved by Platform Governance Administrator' }
          : item
      )
    );
    showToast('Educational item approved for platform catalog');

    if (firebaseUser && isConfigured && userProfile?.role === 'admin') {
      try {
        await updateApprovalDecision(
          id,
          'Approved',
          firebaseUser.uid,
          'Approved by Platform Governance Administrator'
        );
      } catch (err) {
        console.warn('Could not persist approval decision to Firestore:', err);
      }
    }
  };

  const handleRequestRevision = (id: string) => {
    setApprovalItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'Revision Requested', reviewNotes: 'Ensure culinary dosage safety is explicitly mentioned' }
          : item
      )
    );
    showToast('Revision request sent to authoring practitioner');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF7] text-[#1E2922]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2D5A43] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#2D5A43]">Loading your AYUSH wellness portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7] text-[#1E2922] font-sans selection:bg-[#2D5A43] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#1C3627] text-white text-xs sm:text-sm px-4 py-3 rounded-xl shadow-lg border border-[#315740] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-[#84D4A8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Top Bar */}
      <Navbar
        currentView={currentView}
        currentRole={currentRole}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectRole={handleSelectRole}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onSelectRole={handleSelectRole}
            onOpenAssessment={() => setIsAssessmentOpen(true)}
            onNavigateToRoles={() => {
              setCurrentView('roles');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'roles' && (
          <RoleSelector
            currentRole={currentRole}
            onSelectRole={handleSelectRole}
            onBackToLanding={() => {
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'dashboard' && (
          <>
            {currentRole === 'user' && (
              <UserDashboard
                userProfile={userProfile}
                userUid={firebaseUser?.uid || null}
                activities={activities}
                onToggleActivity={handleToggleActivity}
                programs={programs}
                articles={articles}
                practitioner={PRIMARY_PRACTITIONER}
                assessmentAnswers={assessmentAnswers}
                totalAssessmentQuestions={EXPANDED_ASSESSMENT_QUESTIONS.length}
                onOpenAssessment={() => setIsAssessmentOpen(true)}
                onCompleteAssessment={handleAssessmentComplete}
                onReadArticle={(art) => setReadingArticle(art)}
                onConnectPractitioner={() => setIsConsultationOpen(true)}
                onSwitchRole={() => setCurrentRole('practitioner')}
                userName={userProfile?.displayName || undefined}
                userEmail={firebaseUser?.email || null}
                isLoggedIn={Boolean(firebaseUser)}
                isLoadingData={isLoadingData}
                isConfigured={isConfigured}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                activePlan={activePlan}
                assessmentHistory={assessmentHistory}
                planHistory={planHistory}
              />
            )}

            {currentRole === 'practitioner' && (
              <PractitionerDashboard
                practitioner={PRIMARY_PRACTITIONER}
                clients={clients}
                programs={programs}
                articles={articles}
                onOpenNewRegimen={() => setIsNewRegimenOpen(true)}
                onReadArticle={(art) => setReadingArticle(art)}
                onSwitchRole={() => setCurrentRole('admin')}
              />
            )}

            {currentRole === 'admin' && (
              <AdminDashboard
                approvalItems={approvalItems}
                onApproveItem={handleApproveItem}
                onRequestRevision={handleRequestRevision}
                onSwitchRole={() => setCurrentRole('user')}
                programs={programs}
                articles={articles}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <AssessmentModal
        isOpen={isAssessmentOpen}
        onClose={() => setIsAssessmentOpen(false)}
        onComplete={handleAssessmentComplete}
        initialAnswers={assessmentAnswers}
      />

      <ContentReaderModal
        article={readingArticle}
        onClose={() => setReadingArticle(null)}
      />

      <ConsultationModal
        isOpen={isConsultationOpen}
        practitioner={PRIMARY_PRACTITIONER}
        onClose={() => setIsConsultationOpen(false)}
      />

      <NewRegimenModal
        isOpen={isNewRegimenOpen}
        onClose={() => setIsNewRegimenOpen(false)}
        onAddRegimen={handleAddRegimen}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <Footer
        onNavigateLandingSection={(sectionId) => {
          if (currentView !== 'landing') {
            setCurrentView('landing');
            setTimeout(() => {
              const el = document.getElementById(sectionId);
              el?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          } else {
            const el = document.getElementById(sectionId);
            el?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        onOpenRoles={() => {
          setCurrentView('roles');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
