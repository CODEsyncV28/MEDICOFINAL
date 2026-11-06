export type RoleType = 'user' | 'practitioner' | 'admin';

export type AYUSHDiscipline = 
  | 'Ayurveda' 
  | 'Yoga & Naturopathy' 
  | 'Unani' 
  | 'Siddha' 
  | 'Homeopathy';

export type WellnessCategory = 
  | 'Yoga' 
  | 'Ayurveda' 
  | 'Nutrition' 
  | 'Meditation' 
  | 'Lifestyle Education';

export interface DailyActivity {
  id: string;
  title: string;
  category: WellnessCategory;
  discipline: AYUSHDiscipline;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
  durationMinutes: number;
  completed: boolean;
  benefit: string;
}

export interface WellnessProgram {
  id: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  durationWeeks: number;
  completedSessions: number;
  totalSessions: number;
  practitionerName: string;
  practitionerTitle: string;
  description: string;
  nextSession: string;
  level: 'Beginner' | 'Intermediate' | 'Deepening';
}

export interface EducationalArticle {
  id: string;
  title: string;
  discipline: AYUSHDiscipline;
  category: WellnessCategory;
  readTime: string;
  author: string;
  authorQualification: string;
  summary: string;
  fullContent: string;
  keyTakeaways: string[];
  reviewedDate: string;
}

export interface Practitioner {
  id: string;
  name: string;
  qualification: string;
  discipline: AYUSHDiscipline;
  specialization: string;
  experienceYears: number;
  councilRegistration: string;
  activeClientsCount: number;
  rating: number;
  bio: string;
  nextAvailableSlot: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  primaryGoal: string;
  enrolledProgram: string;
  discipline: AYUSHDiscipline;
  adherenceRate: number; // 0 - 100
  assessmentCompleted: boolean;
  lastCheckIn: string;
  practitionerNotes: string;
  status: 'Active' | 'Needs Review' | 'On Track';
}

export interface ContentApprovalItem {
  id: string;
  title: string;
  author: string;
  discipline: AYUSHDiscipline;
  submittedDate: string;
  status: 'Pending Review' | 'Approved' | 'Revision Requested';
  category: WellnessCategory;
  reviewNotes?: string;
}

export interface LifestyleAssessmentQuestion {
  id: string;
  category: string;
  question: string;
  options: {
    label: string;
    description: string;
    value: string;
  }[];
}
