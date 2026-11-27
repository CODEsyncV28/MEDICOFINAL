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
import { ReminderProvider } from './contexts/ReminderContext';
import { InAppReminderBanner } from './components/reminders/InAppReminderBanner';
import {
  toggleActivityStatus,
  fetchDailyActivitiesForDate,
} from './services/firestoreService';
import {
  GUEST_DINACHARYA_USER_ID,
  mergeDailyActivitiesWithRecords,
} from './services/dinacharyaService';
import {
  fetchConsultationsForUser,
  seedDemoConsultations,
} from './services/consultationService';
import {
  fetchVerifiedPractitioners,
  fetchSeekerAssignedPractitionerId,
  seedDemoClientProfiles,
} from './services/practitionerService';
import { seedDemoArticles } from './services/contentService';
import { seedDemoPrograms } from './services/programService';
import { seedDemoAuditLog } from './services/adminService';
import { canAccessPortal } from './utils/portalAccess';
import {
  resolvePractitionerForSeeker,
  resolvePractitionerForWorkspace,
} from './utils/practitionerIdentity';
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
} from './types';
import {
  WellnessPlan,
  AssessmentVersionRecord,
} from './types/assessment';
import { ConsultationDocument, PractitionerDocument } from './types/firebase';
import {
  INITIAL_DAILY_ACTIVITIES,
  INITIAL_PROGRAMS,
  INITIAL_ARTICLES,
  PRIMARY_PRACTITIONER,
  INITIAL_CLIENTS,
} from './data/mockData';
import { EXPANDED_ASSESSMENT_QUESTIONS } from './data/assessmentQuestions';

function AppContent() {
  const { isConfigured, firebaseUser, userProfile, initializing: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'roles' | 'dashboard'>(() => {
    return firebaseUser ? 'dashboard' : 'landing';
  });
  const [currentRole, setCurrentRole] = useState<RoleType>(() => {
    return (userProfile?.role as RoleType) || 'user';
  });

  // Application State
  const [activities, setActivities] = useState<DailyActivity[]>(INITIAL_DAILY_ACTIVITIES);
  const [programs] = useState<WellnessProgram[]>(INITIAL_PROGRAMS);
  const [articles] = useState<EducationalArticle[]>(INITIAL_ARTICLES);
  const [userConsultations, setUserConsultations] = useState<ConsultationDocument[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState<boolean>(false);
  const [consultationsError, setConsultationsError] = useState<string | null>(null);

  // Portal sandbox switcher (enabled by default for UI preview; never grants live Firebase privileges)
  const [demoPortalEnabled, setDemoPortalEnabled] = useState<boolean>(true);
  const [verifiedPractitioners, setVerifiedPractitioners] = useState<PractitionerDocument[]>([]);
  const [practitionersLoading, setPractitionersLoading] = useState<boolean>(isConfigured);
  const [practitionersError, setPractitionersError] = useState<string | null>(null);
  const [seekerAssignedPractitionerId, setSeekerAssignedPractitionerId] = useState<string | null>(null);

  // Initial assessment: 3 answered for guest preview (canonical question IDs only)
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({
    circadian_waking_energy: 'gradual',
    digestive_appetite_strength: 'robust',
    movement_daily_type: 'active',
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
  const [practitionerProgramsRefreshKey, setPractitionerProgramsRefreshKey] = useState(0);
  const [userCatalogRefreshKey, setUserCatalogRefreshKey] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Seed synthetic demo records for Demo Mode / UI Sandbox evaluation, and hydrate verified Firestore practitioners in live mode
  useEffect(() => {
    if (!isConfigured || demoPortalEnabled) {
      seedDemoConsultations();
      seedDemoClientProfiles(PRIMARY_PRACTITIONER.id, INITIAL_CLIENTS);
      seedDemoArticles();
      seedDemoPrograms();
      seedDemoAuditLog();
    }

    if (!isConfigured) {
      setPractitionersLoading(false);
      setPractitionersError(null);
      return;
    }

    let isMounted = true;
    setPractitionersLoading(true);
    setPractitionersError(null);

    fetchVerifiedPractitioners()
      .then((docs) => {
        if (!isMounted) return;
        setVerifiedPractitioners(docs);
      })
      .catch((err) => {
        if (!isMounted) return;
        setVerifiedPractitioners([]);
        setPractitionersError(
          err instanceof Error
            ? err.message
            : 'Unable to load verified AYUSH practitioners from Firestore.'
        );
      })
      .finally(() => {
        if (isMounted) {
          setPractitionersLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isConfigured, demoPortalEnabled]);

  const workspacePractitioner = resolvePractitionerForWorkspace(
    PRIMARY_PRACTITIONER,
    firebaseUser?.uid ?? null,
    userProfile,
    demoPortalEnabled && userProfile?.role !== 'practitioner',
    verifiedPractitioners
  );
  const seekerPractitioner = resolvePractitionerForSeeker(
    PRIMARY_PRACTITIONER,
    userProfile,
    verifiedPractitioners,
    isConfigured,
    seekerAssignedPractitionerId
  );

  const refreshUserConsultations = async (uid?: string) => {
    const targetUid = uid || (firebaseUser ? firebaseUser.uid : GUEST_DINACHARYA_USER_ID);
    setIsLoadingConsultations(true);
    setConsultationsError(null);
    try {
      const records = await fetchConsultationsForUser(targetUid);
      setUserConsultations(records);
    } catch (err) {
      setConsultationsError(
        err instanceof Error ? err.message : 'Unable to load consultation requests.'
      );
    } finally {
      setIsLoadingConsultations(false);
    }
  };

  // Hydrate user data from storage / Firestore
  useEffect(() => {
    const effectiveUid = firebaseUser ? firebaseUser.uid : GUEST_DINACHARYA_USER_ID;

    let isMounted = true;
    async function loadUserData() {
      setIsLoadingData(true);
      setIsLoadingConsultations(true);
      setConsultationsError(null);
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
            // Guest mode: generate an initial demonstration baseline plan (canonical IDs)
            const guestBaselineAnswers = {
              circadian_waking_energy: 'gradual',
              digestive_appetite_strength: 'robust',
              movement_daily_type: 'active',
            };
            const mockRecord: AssessmentVersionRecord = {
              id: 'assess_guest_v1',
              userId: GUEST_DINACHARYA_USER_ID,
              version: 1,
              completedAt: new Date().toISOString(),
              answers: guestBaselineAnswers,
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
            const initialDemoPlan = generateWellnessPlan(GUEST_DINACHARYA_USER_ID, mockRecord);
            setAssessmentAnswers(guestBaselineAnswers);
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

        // 2. Fetch daily activities for today (isolated per effectiveUid: signed-in user vs guest)
        const today = new Date().toISOString().split('T')[0];
        const dailyDocs = await fetchDailyActivitiesForDate(effectiveUid, today);
        if (isMounted) {
          setActivities(
            mergeDailyActivitiesWithRecords(
              INITIAL_DAILY_ACTIVITIES,
              dailyDocs || [],
              !firebaseUser
            )
          );
        }

        // 3. Fetch persisted consultation requests & clientProfile practitioner assignment for current seeker
        const [consultDocs, assignedPracUid] = await Promise.all([
          fetchConsultationsForUser(effectiveUid),
          isConfigured && firebaseUser
            ? fetchSeekerAssignedPractitionerId(firebaseUser.uid)
            : Promise.resolve(null),
        ]);
        if (isMounted) {
          setUserConsultations(consultDocs);
          setSeekerAssignedPractitionerId(assignedPracUid);
        }
      } catch (err) {
        console.warn('Hydration skipped or offline:', err);
        if (isMounted) {
          setConsultationsError('Unable to load saved consultation requests.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
          setIsLoadingConsultations(false);
        }
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [firebaseUser]);

  // Refresh seeker consultations & published catalog whenever switching back to the seeker portal
  useEffect(() => {
    if (currentView === 'dashboard' && currentRole === 'user') {
      refreshUserConsultations();
      setUserCatalogRefreshKey((prev) => prev + 1);
    }
  }, [currentView, currentRole]);

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
    const effectiveUid = firebaseUser ? firebaseUser.uid : GUEST_DINACHARYA_USER_ID;
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

    try {
      const today = new Date().toISOString().split('T')[0];
      await toggleActivityStatus(effectiveUid, id, today, updatedStatus);
    } catch (err) {
      console.warn('Could not persist activity state:', err);
    }
  };

  const handleToggleDemoPortal = (enabled: boolean) => {
    setDemoPortalEnabled(enabled);
    if (!enabled) {
      const fallbackRole: RoleType = (userProfile?.role as RoleType) || 'user';
      if (currentRole !== fallbackRole) {
        setCurrentRole(fallbackRole);
      }
      showToast('Sandbox portal switcher disabled. Returned to standard role-restricted access.');
    } else {
      showToast('Sandbox portal switcher enabled for UI evaluation (local demo data only).');
    }
  };

  const handleSelectRole = (role: RoleType) => {
    const access = canAccessPortal({
      targetRole: role,
      accountRole: (userProfile?.role as RoleType) || null,
      isAuthenticated: Boolean(firebaseUser),
      demoPortalEnabled,
      isFirebaseConfigured: isConfigured,
    });

    if (!access.allowed) {
      showToast(access.reason);
      setCurrentView('roles');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentRole(role);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssessmentComplete = async (
    answers: Record<string, string>,
    categoryNotes?: Record<string, string>
  ) => {
    const effectiveUid = firebaseUser ? firebaseUser.uid : GUEST_DINACHARYA_USER_ID;

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
      console.error('Error during submitAssessment:', err);
      showToast(
        err instanceof Error
          ? err.message
          : 'Could not save assessment. Please verify your connection and permissions.'
      );
      throw err;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-[#0F172A]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0284C7] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#0284C7]">Loading your AYUSH wellness portal...</p>
        </div>
      </div>
    );
  }

  const effectiveUid = firebaseUser ? firebaseUser.uid : GUEST_DINACHARYA_USER_ID;

  const handleNavigateToActivity = (activityId?: string) => {
    setCurrentRole('user');
    setCurrentView('dashboard');
    if (!activityId) {
      setTimeout(() => {
        const section = document.getElementById('dinacharya-checklist-section');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  const handleDateRollover = async (newDateString: string) => {
    try {
      const dailyDocs = await fetchDailyActivitiesForDate(effectiveUid, newDateString);
      setActivities(
        mergeDailyActivitiesWithRecords(
          INITIAL_DAILY_ACTIVITIES,
          dailyDocs || [],
          !firebaseUser
        )
      );
    } catch (err) {
      console.warn('Could not refresh daily activities on date rollover:', err);
    }
  };

  return (
    <ReminderProvider
      userId={effectiveUid}
      userProfile={userProfile}
      activities={activities}
      onToggleActivity={handleToggleActivity}
      onNavigateToActivity={handleNavigateToActivity}
      onDateRollover={handleDateRollover}
    >
    <div
      className={`min-h-screen flex flex-col font-sans ${
        currentView === 'landing'
          ? 'bg-[#FAF6EB] text-[#163828] selection:bg-[#3A6B4C] selection:text-white'
          : 'bg-[#F8FAFC] text-[#0F172A] selection:bg-[#0284C7] selection:text-white'
      }`}
    >
      {currentView !== 'landing' && <InAppReminderBanner />}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs sm:text-sm px-4 py-3 rounded-xl shadow-lg border border-[#334155] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Top Bar */}
      <Navbar
        currentView={currentView}
        currentRole={currentRole}
        demoPortalEnabled={demoPortalEnabled}
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
            accountRole={(userProfile?.role as RoleType) || null}
            isAuthenticated={Boolean(firebaseUser)}
            isConfigured={isConfigured}
            demoPortalEnabled={demoPortalEnabled}
            onToggleDemoPortal={handleToggleDemoPortal}
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
                practitioner={seekerPractitioner}
                practitionersLoading={practitionersLoading}
                practitionersError={practitionersError}
                assessmentAnswers={assessmentAnswers}
                totalAssessmentQuestions={EXPANDED_ASSESSMENT_QUESTIONS.length}
                onOpenAssessment={() => setIsAssessmentOpen(true)}
                onCompleteAssessment={handleAssessmentComplete}
                onReadArticle={(art) => setReadingArticle(art)}
                onConnectPractitioner={() => setIsConsultationOpen(true)}
                demoPortalEnabled={demoPortalEnabled}
                onSwitchRole={() => handleSelectRole('practitioner')}
                userName={userProfile?.displayName || undefined}
                userEmail={firebaseUser?.email || null}
                isLoggedIn={Boolean(firebaseUser)}
                isLoadingData={isLoadingData}
                isConfigured={isConfigured}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                activePlan={activePlan}
                assessmentHistory={assessmentHistory}
                planHistory={planHistory}
                consultations={userConsultations}
                isLoadingConsultations={isLoadingConsultations}
                consultationsError={consultationsError}
                catalogRefreshKey={userCatalogRefreshKey}
              />
            )}

            {currentRole === 'practitioner' && (
              <PractitionerDashboard
                practitioner={workspacePractitioner}
                programs={programs}
                articles={articles}
                programsRefreshKey={practitionerProgramsRefreshKey}
                onOpenNewRegimen={() => setIsNewRegimenOpen(true)}
                onReadArticle={(art) => setReadingArticle(art)}
                onConsultationUpdated={() => refreshUserConsultations()}
                canSwitchToAdmin={
                  canAccessPortal({
                    targetRole: 'admin',
                    accountRole: (userProfile?.role as RoleType) || null,
                    isAuthenticated: Boolean(firebaseUser),
                    demoPortalEnabled,
                    isFirebaseConfigured: isConfigured,
                  }).allowed
                }
                isDemoMode={demoPortalEnabled && userProfile?.role !== 'practitioner'}
                onSwitchRole={() => handleSelectRole('admin')}
              />
            )}

            {currentRole === 'admin' && (
              <AdminDashboard
                isDemoMode={userProfile?.role !== 'admin'}
                onSwitchRole={() => handleSelectRole('user')}
                programs={programs}
                articles={articles}
                reviewerId={
                  userProfile?.role === 'admin' && firebaseUser
                    ? firebaseUser.uid
                    : 'admin_demo_governance'
                }
                reviewerName={
                  userProfile?.role === 'admin'
                    ? userProfile?.displayName || 'Platform Governance Admin'
                    : 'Platform Governance Admin (Demo Sandbox)'
                }
                reviewerRole={
                  userProfile?.role === 'admin'
                    ? 'admin'
                    : demoPortalEnabled
                    ? 'admin'
                    : (userProfile?.role as RoleType) || null
                }
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
        isOpen={isConsultationOpen && Boolean(seekerPractitioner)}
        practitioner={seekerPractitioner}
        seekerUid={firebaseUser ? firebaseUser.uid : GUEST_DINACHARYA_USER_ID}
        seekerName={
          userProfile?.displayName ||
          firebaseUser?.email?.split('@')[0] ||
          'Seeker (Demo Preview)'
        }
        onClose={() => setIsConsultationOpen(false)}
        onCreated={(created) => {
          setUserConsultations((prev) => [
            created,
            ...prev.filter((item) => item.id !== created.id),
          ]);
          showToast(`Consultation request sent to ${created.practitionerName}.`);
        }}
      />

      <NewRegimenModal
        isOpen={isNewRegimenOpen}
        onClose={() => setIsNewRegimenOpen(false)}
        practitioner={workspacePractitioner}
        isDemoMode={userProfile?.role !== 'practitioner'}
        onSaved={(saved) => {
          setPractitionerProgramsRefreshKey((prev) => prev + 1);
          showToast(
            saved.status === 'pending_approval'
              ? `Submitted "${saved.title}" for Admin Governance review.`
              : `Saved draft regimen: "${saved.title}".`
          );
        }}
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
    </ReminderProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
