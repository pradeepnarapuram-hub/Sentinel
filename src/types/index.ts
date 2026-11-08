export type Role = 'admin' | 'manager' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  isActive: boolean;
  avatarUrl?: string;
  title: string;
}

export type CallDirection = 'inbound' | 'outbound';

export type CallType =
  | 'appointment scheduling'
  | 'follow-up'
  | 'insurance verification'
  | 'prescription refill'
  | 'complaint'
  | 'general inquiry'
  | 'custom';

export type CallOutcome =
  | 'completed'
  | 'no answer'
  | 'callback required'
  | 'escalated'
  | 'transferred'
  | 'failed';

export type ReviewStatus =
  | 'New'
  | 'In Review'
  | 'Scored'
  | 'Needs Follow-up'
  | 'Escalated'
  | 'Closed';

export interface TranscriptUtterance {
  id: string;
  speaker: 'Patient' | 'Agent';
  text: string;
  timestamp: number; // in seconds
  sentiment?: 'positive' | 'neutral' | 'negative' | 'anxious';
}

export interface RubricCategory {
  id: string;
  name: string;
  measureDescription: string;
  defaultWeight: number; // percentage, e.g. 20 for 20%
}

export interface CategoryScore {
  categoryId: string;
  rating: number; // 1 to 5
  comment?: string; // mandatory if rating is 1 or 2
}

export interface ReviewScorecard {
  id: string;
  callId: string;
  reviewerId: string;
  reviewerName: string;
  scoredAt: string;
  version: number;
  categoryScores: CategoryScore[];
  calculatedScore: number; // out of 100
  isPassing: boolean;
  isCriticalIssue: boolean;
  criticalIssueReason?: string;
  isComplianceFlagged: boolean;
  isEscalationFlagged: boolean;
  isCoachingFlagged: boolean;
  isRetrainingFlagged: boolean;
  strengths: string[];
  improvementAreas: string[];
  managerPrivateNotes?: string;
  feedbackForAgent: {
    overallFeedback: string;
    whatAgentDidWell: string;
    improvementOpportunities: string;
    specificExamplesWithTimestamps: string;
    recommendedCoachingAction: string;
    followUpDate: string;
    isAcknowledged: boolean;
    acknowledgedAt?: string;
    agentComment?: string;
  };
}

export interface CallActionItem {
  id: string;
  callId: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  type: 'Coaching' | 'Retraining' | 'Follow-up Call' | 'Compliance Review';
  createdAt: string;
}

export interface CallRecord {
  id: string;
  patientName: string;
  patientId: string; // e.g. PT-9821
  patientPhone: string;
  patientDob: string;
  agentId: string;
  agentName: string;
  agentTeam: string;
  callDate: string; // ISO string
  duration: number; // seconds
  direction: CallDirection;
  callType: CallType;
  audioUrl: string;
  transcript: TranscriptUtterance[];
  outcome: CallOutcome;
  disposition: string;
  language: string;
  reviewStatus: ReviewStatus;
  assignedReviewerId: string | null;
  assignedReviewerName: string | null;
  priority: 'Low' | 'Medium' | 'Normal' | 'High';
  tags: string[];
  latestScore?: number;
  latestScorecard?: ReviewScorecard;
  scoreHistory?: ReviewScorecard[];
  actionItems?: CallActionItem[];
}

export interface AIReviewResult {
  callSummary: string;
  patientIssue: string;
  requestedOutcome: string;
  agentActions: string[];
  missedSteps: string[];
  complianceFlags: string[];
  patientSentiment: string;
  agentSentiment: string;
  keyMoments: {
    timestamp: number;
    label: string;
    quote: string;
    type: 'strength' | 'risk' | 'milestone';
  }[];
  suggestedStrengths: string[];
  suggestedCoaching: string[];
  suggestedScores: Record<string, { rating: number; justification: string }>;
  draftFeedbackMessage: string;
  highlightedPhrases?: {
    phrase: string;
    category: 'compliance_verified' | 'compliance_risk' | 'clinical_emergency' | 'patient_distress' | 'patient_relief' | string;
    explanation: string;
    timestamp?: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action:
    | 'SCORE_CREATED'
    | 'SCORE_UPDATED'
    | 'FEEDBACK_SUBMITTED'
    | 'FEEDBACK_ACKNOWLEDGED'
    | 'ACTION_ITEM_CREATED'
    | 'ACTION_ITEM_UPDATED'
    | 'CALL_ASSIGNED'
    | 'STATUS_CHANGED'
    | 'REPORT_EXPORTED_PDF'
    | 'REPORT_EXPORTED_EXCEL'
    | 'RUBRIC_CONFIG_UPDATED'
    | 'USER_STATUS_TOGGLED'
    | 'AUDIO_ACCESSED';
  entityId: string;
  details: string;
}

export interface DailyReportData {
  reportDate: string;
  totalCallsReceived: number;
  callsReviewed: number;
  callsPendingReview: number;
  averageScore: number;
  passRate: number;
  failedCallsCount: number;
  complianceFlagsCount: number;
  escalationsCount: number;
  callbacksRequiredCount: number;
  topStrengths: string[];
  topImprovementAreas: string[];
  agentsRequiringUrgentCoaching: {
    agentId: string;
    agentName: string;
    averageScore: number;
    failedCalls: number;
    issue: string;
  }[];
  lowScoringCalls: {
    callId: string;
    agentName: string;
    score: number;
    callType: CallType;
    reason: string;
  }[];
  criticalIssueCalls: {
    callId: string;
    agentName: string;
    issue: string;
    disposition: string;
  }[];
  keyThemes: string[];
  executiveSummary: string;
}

export interface WeeklyReportData {
  weekRange: string; // e.g. "Oct 27 - Nov 02, 2026"
  totalCalls: number;
  reviewedCalls: number;
  volumeChangeWoW: number; // e.g. +5.2%
  avgScore: number;
  scoreChangeWoW: number; // e.g. +2.4
  passRate: number;
  passRateChangeWoW: number; // e.g. +3.1%
  complianceFlags: number;
  complianceFlagsChangeWoW: number;
  agentPerformance: {
    agentId: string;
    agentName: string;
    team: string;
    callsCount: number;
    avgScore: number;
    passRate: number;
    complianceFlags: number;
    status: 'Top Performer' | 'On Track' | 'Needs Support';
  }[];
  teamPerformance: {
    team: string;
    callsCount: number;
    avgScore: number;
    passRate: number;
    avgDurationSec: number;
  }[];
  callTypeAnalysis: {
    type: CallType;
    count: number;
    avgScore: number;
    escalationRate: number;
  }[];
  commonPatientIssues: string[];
  mostFrequentFailureReasons: string[];
  coachingProgress: {
    totalActionItems: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  recommendations: string[];
}
