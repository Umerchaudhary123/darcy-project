export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'client' | 'admin' | 'super_admin';
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  client?: Client;
}

export interface Client {
  id: string;
  userId?: string;
  businessName: string;
  contractorType: 'P&D' | 'Linehaul' | 'Both';
  contactName?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  indeedUsername?: string;
  firstAdvantageUsername?: string;
  agreementSigned: boolean;
  agreementSignedAt?: string;
  status: 'pending' | 'invited' | 'active' | 'archived' | 'suspended';
  displayOrder: number;
  stripeCustomerId?: string;
  adminNotes?: string;
  inviteToken?: string;
  subscription?: Subscription;
  applicants?: Applicant[];
  createdAt: string;
  updatedAt: string;
}

export interface Applicant {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avpStatus: 'pending' | 'passed' | 'failed' | 'waived';
  backgroundStatus: 'pending' | 'ordered' | 'clear' | 'consider' | 'failed';
  drugScreenStatus: 'pending' | 'ordered' | 'negative' | 'positive' | 'failed';
  medCardStatus: 'pending' | 'verified' | 'expired' | 'missing' | 'failed';
  pipelineStatus: 'in_progress' | 'interview_ready' | 'disqualified';
  hireStatus?: 'in_progress' | 'hired' | 'rejected';
  interviewDate?: string;
  adminNotes?: string;
  clientNotes?: string;
  source?: string;
  disqualifiedAt?: string;
  aiScore?: number | null;
  aiRecommendation?: 'high_alignment' | 'good_alignment' | 'review' | 'limited_evidence' | null;
  aiAssessment?: AiAssessment | null;
  aiAnalyzedAt?: string | null;
  aiModel?: string | null;
  resumeFileName?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: Pick<Client, 'id' | 'businessName'>;
}

export interface AiAssessment {
  scoreBreakdown: {
    relevantExperience: number;
    licensesAndSkills: number;
    safetyAndCompliance: number;
    workHistory: number;
    resumeQuality: number;
  };
  summary: string;
  strengths: string[];
  concerns: string[];
  matchedSkills: string[];
  missingRequirements: string[];
  suggestedInterviewQuestions: string[];
  experienceYears: number | null;
  criteria: string;
  disclaimer: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  extraIndeedListings: number;
  extraTerminals: number;
  i9Service: boolean;
  monthlyAmount?: number;
}

export interface Document {
  id: string;
  clientId: string;
  uploadedBy?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  s3Url?: string;
  status: 'pending' | 'approved' | 'rejected';
  documentType?: string;
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  clientId: string;
  subject: string;
  isActive: boolean;
  unreadByClient: number;
  unreadByAdmin: number;
  lastMessageAt?: string;
  createdAt: string;
  client?: Pick<Client, 'id' | 'businessName' | 'email'>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  senderRole: 'client' | 'admin';
  createdAt: string;
  sender?: Pick<User, 'id' | 'name' | 'role'>;
}

export interface Notification {
  id: string;
  userId: string;
  clientId?: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  clientId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isRecurring: boolean;
  recurringType: 'none' | 'daily' | 'weekly';
  bookedApplicantId?: string;
  notes?: string;
  bookedApplicant?: Applicant;
  client?: Pick<Client, 'id' | 'businessName'>;
}

export interface TimeTracking {
  id: string;
  clientId: string;
  adminId: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  notes?: string;
  admin?: Pick<User, 'id' | 'name' | 'email'>;
  createdAt: string;
}

export interface PipelineStats {
  total: number;
  interviewReady: number;
  inProgress: number;
  disqualified: number;
  hired: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    pages?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
    unreadCount?: number;
  };
}

export interface LoginForm {
  email?: string;
  username?: string;
  password: string;
}

export interface SignupStep1 {
  contractorType: 'P&D' | 'Linehaul' | 'Both';
}

export interface SignupStep2 {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  indeedUsername?: string;
  firstAdvantageUsername?: string;
}
