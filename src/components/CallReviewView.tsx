import React, { useState } from 'react';
import {
  CallRecord,
  User,
  RubricCategory,
  ReviewScorecard,
  CategoryScore,
  AIReviewResult,
  CallActionItem,
  ReviewStatus,
} from '../types';
import { AudioPlayer } from './AudioPlayer';
import { TranscriptViewer } from './TranscriptViewer';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldAlert,
  Save,
  MessageSquare,
  ClipboardList,
  UserCheck,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Award,
  AlertCircle,
  ThumbsUp,
  FileCheck,
} from 'lucide-react';

interface CallReviewViewProps {
  call: CallRecord;
  currentUser: User;
  rubricCategories: RubricCategory[];
  passThreshold: number;
  reviewers: User[];
  allAgents: User[];
  hipaaMasking: boolean;
  onBack: () => void;
  onSaveScorecard: (scorecard: ReviewScorecard, status: ReviewStatus) => void;
  onAddActionItem: (item: Omit<CallActionItem, 'id' | 'createdAt'>) => void;
  onAssignReviewer: (callId: string, reviewerId: string, reviewerName: string) => void;
}

export const CallReviewView: React.FC<CallReviewViewProps> = ({
  call,
  currentUser,
  rubricCategories,
  passThreshold,
  reviewers,
  allAgents,
  hipaaMasking,
  onBack,
  onSaveScorecard,
  onAddActionItem,
  onAssignReviewer,
}) => {
  // Playback sync
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Active workspace tab: 'scorecard' | 'ai-assistant' | 'feedback' | 'actions' | 'history'
  const [activeTab, setActiveTab] = useState<'scorecard' | 'ai-assistant' | 'feedback' | 'actions' | 'history'>('scorecard');

  // Review Status
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(call.reviewStatus);

  // Scorecard state initialized from call's latest scorecard or defaults
  const existingScorecard = call.latestScorecard;
  const [categoryScores, setCategoryScores] = useState<Record<string, { rating: number; comment: string }>>(() => {
    const map: Record<string, { rating: number; comment: string }> = {};
    rubricCategories.forEach((cat) => {
      const found = existingScorecard?.categoryScores.find((cs) => cs.categoryId === cat.id);
      map[cat.id] = {
        rating: found?.rating || 0,
        comment: found?.comment || '',
      };
    });
    return map;
  });

  const [isCriticalIssue, setIsCriticalIssue] = useState<boolean>(existingScorecard?.isCriticalIssue || false);
  const [criticalIssueReason, setCriticalIssueReason] = useState<string>(existingScorecard?.criticalIssueReason || '');
  const [isComplianceFlagged, setIsComplianceFlagged] = useState<boolean>(existingScorecard?.isComplianceFlagged || false);
  const [isEscalationFlagged, setIsEscalationFlagged] = useState<boolean>(existingScorecard?.isEscalationFlagged || false);
  const [isCoachingFlagged, setIsCoachingFlagged] = useState<boolean>(existingScorecard?.isCoachingFlagged || false);
  const [isRetrainingFlagged, setIsRetrainingFlagged] = useState<boolean>(existingScorecard?.isRetrainingFlagged || false);

  const [strengthsList, setStrengthsList] = useState<string[]>(existingScorecard?.strengths || []);
  const [improvementList, setImprovementList] = useState<string[]>(existingScorecard?.improvementAreas || []);
  const [newStrengthInput, setNewStrengthInput] = useState<string>('');
  const [newImprovementInput, setNewImprovementInput] = useState<string>('');

  const [managerPrivateNotes, setManagerPrivateNotes] = useState<string>(existingScorecard?.managerPrivateNotes || '');

  // Feedback for Agent
  const [overallFeedback, setOverallFeedback] = useState<string>(existingScorecard?.feedbackForAgent.overallFeedback || '');
  const [whatAgentDidWell, setWhatAgentDidWell] = useState<string>(existingScorecard?.feedbackForAgent.whatAgentDidWell || '');
  const [improvementOpportunities, setImprovementOpportunities] = useState<string>(existingScorecard?.feedbackForAgent.improvementOpportunities || '');
  const [specificExamples, setSpecificExamples] = useState<string>(existingScorecard?.feedbackForAgent.specificExamplesWithTimestamps || '');
  const [recommendedCoaching, setRecommendedCoaching] = useState<string>(existingScorecard?.feedbackForAgent.recommendedCoachingAction || '');
  const [followUpDate, setFollowUpDate] = useState<string>(existingScorecard?.feedbackForAgent.followUpDate || '2026-11-20');

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // New Action Item Form
  const [showActionItemModal, setShowActionItemModal] = useState<boolean>(false);
  const [actionTitle, setActionTitle] = useState<string>('');
  const [actionDesc, setActionDesc] = useState<string>('');
  const [actionOwnerId, setActionOwnerId] = useState<string>(call.agentId);
  const [actionDueDate, setActionDueDate] = useState<string>('2026-11-18');
  const [actionPriority, setActionPriority] = useState<CallActionItem['priority']>('High');
  const [actionType, setActionType] = useState<CallActionItem['type']>('Coaching');

  // Form validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate real-time weighted score out of 100
  const calculatedScore = React.useMemo(() => {
    let totalScore = 0;
    let totalWeight = 0;

    rubricCategories.forEach((cat) => {
      const entry = categoryScores[cat.id];
      if (entry && entry.rating > 0) {
        // rating / 5 * weight
        totalScore += (entry.rating / 5) * cat.defaultWeight;
      }
      totalWeight += cat.defaultWeight;
    });

    const normalized = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
    const finalScore = Math.round(normalized);

    // If critical issue is flagged, cap score at 50 if it was higher
    if (isCriticalIssue) {
      return Math.min(50, finalScore);
    }
    return finalScore;
  }, [rubricCategories, categoryScores, isCriticalIssue]);

  const isPassing = calculatedScore >= passThreshold && !isCriticalIssue;

  // Run AI Review
  const handleAnalyzeWithAI = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          patientName: call.patientName,
          agentName: call.agentName,
          callType: call.callType,
          duration: call.duration,
          transcript: call.transcript,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setAiResult(data.result);
      setActiveTab('ai-assistant');
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setAiError(err.message || 'Unable to connect to AI Review Service');
    } finally {
      setAiLoading(false);
    }
  };

  // Accept AI Suggested Scores
  const handleAcceptAIScores = () => {
    if (!aiResult) return;
    const newScores = { ...categoryScores };
    rubricCategories.forEach((cat) => {
      const suggested = aiResult.suggestedScores[cat.id];
      if (suggested) {
        newScores[cat.id] = {
          rating: suggested.rating,
          comment: suggested.justification,
        };
      }
    });
    setCategoryScores(newScores);

    // Also import suggested strengths and coaching
    if (aiResult.suggestedStrengths?.length) {
      setStrengthsList(Array.from(new Set([...strengthsList, ...aiResult.suggestedStrengths])));
    }
    if (aiResult.suggestedCoaching?.length) {
      setImprovementList(Array.from(new Set([...improvementList, ...aiResult.suggestedCoaching])));
    }

    if (aiResult.complianceFlags && aiResult.complianceFlags.length > 0) {
      setIsComplianceFlagged(true);
    }

    setActiveTab('scorecard');
  };

  // Accept AI Draft Feedback
  const handleAcceptAIFeedback = () => {
    if (!aiResult) return;
    setOverallFeedback(aiResult.draftFeedbackMessage);
    if (aiResult.suggestedStrengths) {
      setWhatAgentDidWell(aiResult.suggestedStrengths.join('\n• '));
    }
    if (aiResult.suggestedCoaching) {
      setImprovementOpportunities(aiResult.suggestedCoaching.join('\n• '));
    }
    if (aiResult.keyMoments?.length) {
      const ex = aiResult.keyMoments
        .map((k) => `[${formatTime(k.timestamp)}] ${k.label}: "${k.quote}"`)
        .join('\n');
      setSpecificExamples(ex);
    }
    setActiveTab('feedback');
  };

  // Save Scorecard Validation
  const handleSaveReview = () => {
    const errors: string[] = [];

    // Verify all categories rated
    rubricCategories.forEach((cat) => {
      const score = categoryScores[cat.id];
      if (!score || score.rating === 0) {
        errors.push(`Rating is required for "${cat.name}".`);
      } else if ((score.rating === 1 || score.rating === 2) && (!score.comment || score.comment.trim().length < 5)) {
        errors.push(`Mandatory justification comment required for "${cat.name}" (Rating ${score.rating}/5).`);
      }
    });

    if (isCriticalIssue && (!criticalIssueReason || criticalIssueReason.trim().length < 5)) {
      errors.push('A concrete justification reason is required when flagging a Critical Issue.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setActiveTab('scorecard');
      return;
    }

    setValidationErrors([]);

    const scorecardCategoryScores: CategoryScore[] = rubricCategories.map((cat) => ({
      categoryId: cat.id,
      rating: categoryScores[cat.id]?.rating || 3,
      comment: categoryScores[cat.id]?.comment,
    }));

    const newScorecard: ReviewScorecard = {
      id: `sc-${call.id}-${Date.now()}`,
      callId: call.id,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      scoredAt: new Date().toISOString(),
      version: (existingScorecard?.version || 0) + 1,
      categoryScores: scorecardCategoryScores,
      calculatedScore,
      isPassing,
      isCriticalIssue,
      criticalIssueReason: isCriticalIssue ? criticalIssueReason : undefined,
      isComplianceFlagged,
      isEscalationFlagged,
      isCoachingFlagged,
      isRetrainingFlagged,
      strengths: strengthsList,
      improvementAreas: improvementList,
      managerPrivateNotes,
      feedbackForAgent: {
        overallFeedback: overallFeedback || 'Overall performance reviewed according to clinical standards.',
        whatAgentDidWell,
        improvementOpportunities,
        specificExamplesWithTimestamps: specificExamples,
        recommendedCoachingAction: recommendedCoaching,
        followUpDate,
        isAcknowledged: false,
      },
    };

    onSaveScorecard(newScorecard, reviewStatus === 'New' ? 'Scored' : reviewStatus);
  };

  const handleCreateActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim()) return;

    const owner = allAgents.find((a) => a.id === actionOwnerId) || currentUser;

    onAddActionItem({
      callId: call.id,
      title: actionTitle,
      description: actionDesc,
      ownerId: owner.id,
      ownerName: owner.name,
      dueDate: actionDueDate,
      status: 'Open',
      priority: actionPriority,
      type: actionType,
    });

    setShowActionItemModal(false);
    setActionTitle('');
    setActionDesc('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDisplayPatient = (name: string, id: string) => {
    if (!hipaaMasking) return `${name} (${id})`;
    const parts = name.split(' ');
    const initial = parts[0] ? `${parts[0][0]}.` : 'P.';
    const maskedLast = parts[1] ? `${parts[1][0]}***` : '***';
    return `${initial} ${maskedLast} [${id}]`;
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Metadata Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Return to Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {call.id}
              </h1>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-sm font-semibold text-slate-700 capitalize">{call.callType}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono font-medium text-slate-500 uppercase">{call.disposition}</span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              <span>Patient: <strong className="text-slate-700">{formatDisplayPatient(call.patientName, call.patientId)}</strong></span>
              <span>·</span>
              <span>Agent: <strong className="text-slate-700">{call.agentName}</strong> ({call.agentTeam})</span>
              <span>·</span>
              <span>Recorded: {new Date(call.callDate).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Manager Actions: Review Status & AI Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI review button */}
          <button
            onClick={handleAnalyzeWithAI}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{aiLoading ? 'Analyzing Call with AI...' : 'AI Review Assistant'}</span>
          </button>

          {/* Review Status Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
              className="font-semibold text-slate-800 bg-transparent focus:outline-none"
            >
              <option value="New">New</option>
              <option value="In Review">In Review</option>
              <option value="Scored">Scored</option>
              <option value="Needs Follow-up">Needs Follow-up</option>
              <option value="Escalated">Escalated</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Save Scorecard Button */}
          <button
            onClick={handleSaveReview}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save & Publish Review</span>
          </button>
        </div>
      </div>

      {/* Validation banner */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Please resolve the following required items before publishing:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main 2-Column Split: Audio & Transcript on Left, Review Workbench on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Audio Player + Synced Transcript */}
        <div className="lg:col-span-5 space-y-4">
          {/* Audio Player */}
          <AudioPlayer
            duration={call.duration}
            currentTime={currentTime}
            onTimeUpdate={(t) => setCurrentTime(t)}
            transcript={call.transcript}
            userRole={currentUser.role}
            callId={call.id}
          />

          {/* Interactive Transcript Viewer with Auto-Highlighting */}
          <TranscriptViewer
            transcript={call.transcript}
            currentTime={currentTime}
            onSeek={(t) => setCurrentTime(t)}
            aiResult={aiResult}
          />
        </div>

        {/* Right Column (7 cols): QA Scorecard & AI Review Hub */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tabs bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('scorecard')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'scorecard'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Scorecard</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-assistant')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ai-assistant'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Insights</span>
                {aiResult && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </button>

              <button
                onClick={() => setActiveTab('feedback')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'feedback'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Agent Feedback</span>
              </button>

              <button
                onClick={() => setActiveTab('actions')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'actions'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Action Items ({call.actionItems?.length || 0})</span>
              </button>
            </div>

            {/* Score pill preview in tab bar */}
            <div className="flex items-center gap-2 pr-2 font-mono">
              <span className="text-slate-400 text-xs">Score:</span>
              <span className={`font-bold text-sm ${isPassing ? 'text-emerald-700' : 'text-rose-700'}`}>
                {calculatedScore}/100
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${
                isPassing ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {isPassing ? 'PASS' : 'FAIL'}
              </span>
            </div>
          </div>

          {/* TAB 1: SCORECARD */}
          {activeTab === 'scorecard' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
              {/* Score header summary card */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Overall Calculated Quality Score
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-extrabold font-mono ${isPassing ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {calculatedScore}
                    </span>
                    <span className="text-slate-400 text-sm font-mono">/ 100</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 ${
                      isPassing ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isPassing ? 'PASSED (≥ ' + passThreshold + ')' : 'FAILED (< ' + passThreshold + ')'}
                    </span>
                  </div>
                </div>

                {/* Critical Issue Toggle */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={isCriticalIssue}
                      onChange={(e) => setIsCriticalIssue(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-rose-800 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Critical Issue Flag</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Auto-caps score at 50</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Critical issue reason if checked */}
              {isCriticalIssue && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                  <label className="block text-xs font-semibold text-rose-900">
                    Critical Issue Justification (Required):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe specific safety, HIPAA violation, or clinical hazard that warrants critical failure..."
                    value={criticalIssueReason}
                    onChange={(e) => setCriticalIssueReason(e.target.value)}
                    className="w-full text-xs p-2 rounded border border-rose-300 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Compliance & Escalate Flags */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsComplianceFlagged(!isComplianceFlagged)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    isComplianceFlagged
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Compliance / HIPAA Flag</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEscalationFlagged(!isEscalationFlagged)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    isEscalationFlagged
                      ? 'bg-rose-100 border-rose-300 text-rose-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Clinical Escalation Flag</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCoachingFlagged(!isCoachingFlagged)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    isCoachingFlagged
                      ? 'bg-sky-100 border-sky-300 text-sky-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Coaching Opportunity</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRetrainingFlagged(!isRetrainingFlagged)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    isRetrainingFlagged
                      ? 'bg-purple-100 border-purple-300 text-purple-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Retraining Required</span>
                </button>
              </div>

              {/* Rubric Category Scores */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider pb-1 border-b border-slate-200">
                  <span>Category Evaluation (1 to 5)</span>
                  <span>Category Weight</span>
                </div>

                {rubricCategories.map((cat) => {
                  const currentRating = categoryScores[cat.id]?.rating || 0;
                  const currentComment = categoryScores[cat.id]?.comment || '';
                  const needsComment = currentRating === 1 || currentRating === 2;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                            <span>{cat.name}</span>
                            <span className="text-xs font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                              Weight: {cat.defaultWeight}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{cat.measureDescription}</p>
                        </div>

                        {/* 1 to 5 Rating Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const isSelected = currentRating === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setCategoryScores({
                                    ...categoryScores,
                                    [cat.id]: {
                                      rating: val,
                                      comment: currentComment,
                                    },
                                  })
                                }
                                className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                                  isSelected
                                    ? val >= 4
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : val === 3
                                      ? 'bg-sky-600 text-white shadow-xs'
                                      : 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comment Input */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={needsComment ? 'font-semibold text-rose-700' : 'text-slate-500'}>
                            {needsComment ? '⚠️ Mandatory comment for score of 1 or 2:' : 'Reviewer notes (optional):'}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder={
                            needsComment
                              ? 'Explain why this category scored below expectations...'
                              : 'Observation notes or timestamp reference...'
                          }
                          value={currentComment}
                          onChange={(e) =>
                            setCategoryScores({
                              ...categoryScores,
                              [cat.id]: {
                                rating: currentRating,
                                comment: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 text-xs rounded border bg-white focus:outline-none focus:ring-1 ${
                            needsComment && !currentComment.trim()
                              ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                              : 'border-slate-300 focus:ring-teal-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Private Manager Notes */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Private Manager Notes (Internal QA only, not visible to Agent):
                </label>
                <textarea
                  rows={2}
                  value={managerPrivateNotes}
                  onChange={(e) => setManagerPrivateNotes(e.target.value)}
                  placeholder="Internal audit notes, supervisor remarks, or calibrations..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>
          )}

          {/* TAB 2: AI ASSISTANT INSIGHTS */}
          {activeTab === 'ai-assistant' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">AI-Assisted Call Review</h3>
                    <p className="text-xs text-slate-500">
                      Powered by Gemini 3.8 Flash Clinical Quality Evaluator. All suggestions require manager review.
                    </p>
                  </div>
                </div>

                {aiResult && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAcceptAIScores}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                      title="Apply AI suggested ratings to scorecard"
                    >
                      Accept AI Scores
                    </button>
                    <button
                      onClick={handleAcceptAIFeedback}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-xs"
                      title="Apply AI draft feedback to agent coaching"
                    >
                      Accept AI Feedback
                    </button>
                  </div>
                )}
              </div>

              {aiLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-semibold text-slate-800">
                    Analyzing clinical dialogue, HIPAA protocol adherence, and sentiment...
                  </p>
                  <p className="text-xs text-slate-400">Evaluating 7 rubric categories</p>
                </div>
              ) : !aiResult ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No AI analysis generated yet</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click the button below to transcribe, audit compliance, extract sentiment shifts, and draft scorecard ratings.
                  </p>
                  <button
                    onClick={handleAnalyzeWithAI}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Analyze Call with Gemini 3.8 Flash
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Summary Box */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                    <div className="font-semibold text-indigo-900 text-sm">Concise Call Summary (AI-suggested)</div>
                    <p className="text-slate-700 leading-relaxed">{aiResult.callSummary}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-indigo-100/80">
                      <div>
                        <strong className="text-indigo-950">Patient Issue:</strong> {aiResult.patientIssue}
                      </div>
                      <div>
                        <strong className="text-indigo-950">Requested Outcome:</strong> {aiResult.requestedOutcome}
                      </div>
                    </div>
                  </div>

                  {/* Sentiment & Tone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="font-semibold text-slate-800 mb-1">Patient Emotional Trajectory</div>
                      <p className="text-slate-600">{aiResult.patientSentiment}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="font-semibold text-slate-800 mb-1">Agent Bedside Manner & Tone</div>
                      <p className="text-slate-600">{aiResult.agentSentiment}</p>
                    </div>
                  </div>

                  {/* Key Moments */}
                  <div>
                    <div className="font-semibold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                      Key Moments & Milestones
                    </div>
                    <div className="space-y-1.5">
                      {aiResult.keyMoments.map((m, idx) => (
                        <div
                          key={idx}
                          onClick={() => setCurrentTime(m.timestamp)}
                          className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <span className="font-mono font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                            {formatTime(m.timestamp)}
                          </span>
                          <div className="flex-1">
                            <span className="font-semibold text-slate-800">{m.label}</span>
                            <span className="text-slate-500"> — "{m.quote}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Category Ratings */}
                  <div>
                    <div className="font-semibold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                      AI Suggested Rubric Ratings
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(aiResult.suggestedScores).map(([catKey, item]) => {
                        const categoryName = rubricCategories.find((r) => r.id === catKey)?.name || catKey;
                        return (
                          <div key={catKey} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800">{categoryName}</span>
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                                {item.rating} / 5
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{item.justification}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Draft Feedback Message */}
                  <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
                    <div className="font-semibold text-teal-950 flex items-center justify-between">
                      <span>Draft Feedback Message for Agent</span>
                      <button
                        onClick={handleAcceptAIFeedback}
                        className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline"
                      >
                        Copy to Agent Feedback Tab →
                      </button>
                    </div>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{aiResult.draftFeedbackMessage}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AGENT FEEDBACK & COACHING */}
          {activeTab === 'feedback' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm">Agent Feedback & Coaching Plan</h3>
                <p className="text-xs text-slate-500">
                  This section is published to the agent upon review completion. The agent can acknowledge and respond.
                </p>
              </div>

              {/* Overall Feedback */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Performance Feedback:
                </label>
                <textarea
                  rows={3}
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="Constructive summary of the interaction..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* What Agent Did Well */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>What the Agent Did Well (Strengths):</span>
                </label>
                <textarea
                  rows={2}
                  value={whatAgentDidWell}
                  onChange={(e) => setWhatAgentDidWell(e.target.value)}
                  placeholder="Specific positive behaviors, empathy, clear explanations..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Improvement Opportunities */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Improvement Opportunities:</span>
                </label>
                <textarea
                  rows={2}
                  value={improvementOpportunities}
                  onChange={(e) => setImprovementOpportunities(e.target.value)}
                  placeholder="Targeted areas for coaching and behavioral refinement..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Specific Examples with Timestamps */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Specific Examples with Timestamps:</span>
                </label>
                <textarea
                  rows={2}
                  value={specificExamples}
                  onChange={(e) => setSpecificExamples(e.target.value)}
                  placeholder="e.g., At 01:45, excellent calm reassurance regarding prior-authorization..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Recommended Coaching & Follow-up Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recommended Training / Coaching Action:
                  </label>
                  <input
                    type="text"
                    value={recommendedCoaching}
                    onChange={(e) => setRecommendedCoaching(e.target.value)}
                    placeholder="e.g. Complete HIPAA refresher module"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Follow-up Date:
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Agent Acknowledgment Status */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-slate-600" />
                  <span>Agent Acknowledgment Status:</span>
                  {existingScorecard?.feedbackForAgent.isAcknowledged ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Acknowledged on {new Date(existingScorecard.feedbackForAgent.acknowledgedAt || '').toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Pending Agent Acknowledgment
                    </span>
                  )}
                </div>
                {existingScorecard?.feedbackForAgent.agentComment && (
                  <div className="text-slate-600 pt-1 italic">
                    Agent response: "{existingScorecard.feedbackForAgent.agentComment}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ACTION ITEMS */}
          {activeTab === 'actions' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Action Items & Remediation</h3>
                  <p className="text-xs text-slate-500">
                    Track coaching tasks, compliance remediation, or physician callbacks tied to this call.
                  </p>
                </div>
                <button
                  onClick={() => setShowActionItemModal(true)}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  + Add Action Item
                </button>
              </div>

              {/* Action items list */}
              {(!call.actionItems || call.actionItems.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No action items created for this call yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {call.actionItems.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{act.title}</span>
                          <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">
                            {act.type}
                          </span>
                        </div>
                        <p className="text-slate-500">{act.description}</p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                          <span>Owner: <strong className="text-slate-600">{act.ownerName}</strong></span>
                          <span>·</span>
                          <span>Due: <strong className="font-mono text-slate-600">{act.dueDate}</strong></span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          act.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : act.status === 'In Progress'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {act.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Action Item Modal */}
      {showActionItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Create New Action Item</h3>
              <button
                onClick={() => setShowActionItemModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateActionItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Complete 2-identifier patient authentication refresher"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description:</label>
                <textarea
                  rows={2}
                  placeholder="Specific requirements, links, or expectations..."
                  value={actionDesc}
                  onChange={(e) => setActionDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assignee / Owner:</label>
                  <select
                    value={actionOwnerId}
                    onChange={(e) => setActionOwnerId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    {allAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Agent)
                      </option>
                    ))}
                    {reviewers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (QA)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date:</label>
                  <input
                    type="date"
                    required
                    value={actionDueDate}
                    onChange={(e) => setActionDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority:</label>
                  <select
                    value={actionPriority}
                    onChange={(e) => setActionPriority(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type:</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    <option value="Coaching">Coaching</option>
                    <option value="Retraining">Retraining</option>
                    <option value="Follow-up Call">Follow-up Call</option>
                    <option value="Compliance Review">Compliance Review</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActionItemModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-semibold shadow-xs"
                >
                  Create Action Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
