import { AYUSHDiscipline, WellnessCategory, RoleType } from './index';

/**
 * 1. User Profile Document (/users/{userId})
 */
export interface UserProfileDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: RoleType; // 'user' | 'practitioner' | 'admin'
  createdAt: string;
  updatedAt: string;
  assignedPractitionerId?: string | null;
  assignedPractitionerName?: string | null;
  prakritiBaseline?: string | null;
  agreedToTerms: boolean;
  avatarUrl?: string | null;
}

/**
 * 1b. Limited Client Profile Document (/clientProfiles/{userId})
 * Exposes strictly non-sensitive summary details to assigned practitioners.
 */
export interface ClientProfileDocument {
  userId: string;
  clientName: string;
  primaryGoal: string;
  enrolledProgram: string;
  discipline: AYUSHDiscipline;
  adherenceRate: number;
  assessmentCompleted: boolean;
  lastCheckIn?: string;
  practitionerNotes?: string;
  status: 'Active' | 'Needs Review' | 'On Track';
  assignedPractitionerId: string;
  updatedAt: string;
}

/**
 * 2. Lifestyle Assessment Document (/assessments/{assessmentId})
 */
export interface LifestyleAssessmentDocument {
  id: string;
  userId: string;
  answers: Record<string, string>;
  totalAnswered: number;
  totalQuestions: number;
  isComplete: boolean;
  circadianBalanceCategory?: string;
  digestiveAgniCategory?: string;
  movementCategory?: string;
  stressCategory?: string;
  completedAt?: string;
  updatedAt: string;
}

/**
 * 3. Daily Activity Check-In Document (/dailyActivities/{activityId})
 */
export interface DailyActivityDocument {
  id: string;
  userId: string;
  activityKey: string;
  title?: string;
  category?: WellnessCategory;
  discipline?: AYUSHDiscipline;
  timeOfDay?: 'Morning' | 'Afternoon' | 'Evening';
  durationMinutes?: number;
  benefit?: string;
  dateString: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string | null;
}

/**
 * 4. Wellness Program Regimen Document (/wellnessPrograms/{programId})
 */
export interface WellnessProgramDocument {
  id: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  durationWeeks: number;
  totalSessions: number;
  creatorPractitionerId: string;
  practitionerName: string;
  practitionerTitle: string;
  description: string;
  nextSessionTemplate: string;
  level: 'Beginner' | 'Intermediate' | 'Deepening';
  isPublished: boolean;
  createdAt: string;
}

/**
 * 5. Educational Article Document (/educationalArticles/{articleId})
 */
export interface EducationalArticleDocument {
  id: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  readTime: string;
  authorId: string;
  authorName: string;
  authorQualification: string;
  summary: string;
  fullContent: string;
  keyTakeaways: string[];
  status: 'draft' | 'pending_approval' | 'published' | 'revision_requested';
  reviewedByAdminId?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
}

/**
 * 6. Practitioner Credential Document (/practitioners/{practitionerId})
 */
export interface PractitionerDocument {
  id: string;
  userId: string;
  name: string;
  qualification: string;
  discipline: AYUSHDiscipline;
  specialization: string;
  experienceYears: number;
  councilRegistration: string;
  isVerified: boolean;
  activeClientsCount: number;
  rating: number;
  bio: string;
  nextAvailableSlot: string;
  createdAt: string;
}

/**
 * 7. Consultation Request Document (/consultations/{consultationId})
 */
export interface ConsultationDocument {
  id: string;
  userId: string;
  userName: string;
  practitionerId: string;
  practitionerName: string;
  topic: string;
  preferredSlot: 'morning' | 'afternoon' | 'evening';
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  scheduledTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 8. Content Approval Review Document (/contentApprovals/{approvalId})
 */
export interface ContentApprovalDocument {
  id: string;
  targetType: 'article' | 'regimen';
  targetId: string;
  title: string;
  submittedByAuthorId: string;
  submittedByAuthorName: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  submittedAt: string;
  status: 'Pending Review' | 'Approved' | 'Revision Requested';
  reviewNotes?: string;
  reviewedByAdminId?: string;
  reviewedAt?: string;
}

/**
 * Service Return Type Definitions
 */
export interface AuthState {
  user: UserProfileDocument | null;
  firebaseUser: any | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
}
