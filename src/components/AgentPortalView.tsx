import React, { useState } from 'react';
import { CallRecord, User, CallActionItem } from '../types';
import {
  Award,
  CheckCircle2,
  Clock,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  FileCheck,
  Send,
  Calendar,
  Lock,
} from 'lucide-react';

interface AgentPortalViewProps {
  currentAgent: User;
  calls: CallRecord[];
  actionItems: CallActionItem[];
  onOpenCall: (callId: string) => void;
  onAcknowledgeFeedback: (callId: string, agentComment: string) => void;
  onUpdateActionItemStatus: (actionId: string, status: CallActionItem['status']) => void;
  hipaaMasking: boolean;
}

export const AgentPortalView: React.FC<AgentPortalViewProps> = ({
  currentAgent,
  calls,
  actionItems,
  onOpenCall,
  onAcknowledgeFeedback,
  onUpdateActionItemStatus,
  hipaaMasking,
}) => {
  // Only the agent's calls!
  const agentCalls = calls.filter((c) => c.agentId === currentAgent.id);
  const scoredCalls = agentCalls.filter((c) => c.latestScore !== undefined);

  // Acknowledgment modal
  const [selectedCallForAck, setSelectedCallForAck] = useState<CallRecord | null>(null);
  const [ackComment, setAckComment] = useState<string>('');

  const myActionItems = actionItems.filter((a) => a.ownerId === currentAgent.id);

  const avgScore = scoredCalls.length > 0
    ? Math.round(scoredCalls.reduce((sum, c) => sum + (c.latestScore || 0), 0) / scoredCalls.length)
    : 0;

  const passedCount = scoredCalls.filter((c) => (c.latestScore || 0) >= 80 && !c.latestScorecard?.isCriticalIssue).length;
  const passRate = scoredCalls.length > 0 ? Math.round((passedCount / scoredCalls.length) * 100) : 0;

  const formatDisplayPatient = (name: string, id: string) => {
    if (!hipaaMasking) return `${name} (${id})`;
    const parts = name.split(' ');
    const initial = parts[0] ? `${parts[0][0]}.` : 'P.';
    const maskedLast = parts[1] ? `${parts[1][0]}***` : '***';
    return `${initial} ${maskedLast} [${id}]`;
  };

  const handleConfirmAck = () => {
    if (!selectedCallForAck) return;
    onAcknowledgeFeedback(selectedCallForAck.id, ackComment);
    setSelectedCallForAck(null);
    setAckComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header with Welcome and Agent Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs text-teal-700 font-semibold uppercase tracking-wider">
            Agent Performance & Coaching Workspace
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            Welcome back, {currentAgent.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentAgent.title} · Team: <strong className="text-slate-700">{currentAgent.team}</strong>
          </p>
        </div>

        {/* Security assurance tag */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs">
          <Lock className="w-3.5 h-3.5 text-teal-600" />
          <span>Restricted Portal View (Role: Agent)</span>
        </div>
      </div>

      {/* KPI Overview Cards for Agent */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">My Evaluated Calls</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {scoredCalls.length} <span className="text-xs font-normal text-slate-400">/ {agentCalls.length}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{agentCalls.length - scoredCalls.length} pending QA</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">My Average Score</div>
          <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${avgScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {avgScore > 0 ? `${avgScore}/100` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Target Threshold: 80</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            {scoredCalls.length > 0 ? `${passRate}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{passedCount} passing evaluations</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Action Items</div>
          <div className="text-2xl font-bold font-mono text-sky-700 mt-1 tabular-nums">
            {myActionItems.filter((a) => a.status !== 'Completed').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{myActionItems.filter((a) => a.status === 'Completed').length} completed</div>
        </div>
      </div>

      {/* Grid: My Recent Evaluations & Feedback (Left 7 cols) + Action Items & Coaching (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: My Scored Calls & Detailed Feedback */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="font-bold text-slate-900 text-sm">My Evaluated Calls & QA Feedback</h3>
            <p className="text-xs text-slate-500">
              Review supervisor observations, strengths, and coaching notes for each interaction.
            </p>
          </div>

          {agentCalls.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              No calls currently assigned to your record.
            </div>
          ) : (
            agentCalls.map((call) => {
              const scorecard = call.latestScorecard;
              const feedback = scorecard?.feedbackForAgent;
              const isAck = feedback?.isAcknowledged;

              return (
                <div
                  key={call.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4"
                >
                  {/* Call Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{call.id}</span>
                        <span className="text-slate-400 text-xs">·</span>
                        <span className="text-xs font-semibold text-slate-700 capitalize">{call.callType}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Patient: <strong>{formatDisplayPatient(call.patientName, call.patientId)}</strong> · {new Date(call.callDate).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Score display */}
                    <div className="flex items-center gap-3">
                      {call.latestScore !== undefined ? (
                        <div className="text-right">
                          <div className={`text-xl font-bold font-mono ${call.latestScore >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {call.latestScore} <span className="text-xs text-slate-400 font-normal">/100</span>
                          </div>
                          <div className={`text-[10px] font-bold ${call.latestScore >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {call.latestScore >= 80 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">Review Pending</span>
                      )}

                      <button
                        onClick={() => onOpenCall(call.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                      >
                        Listen & Review
                      </button>
                    </div>
                  </div>

                  {/* Feedback Details if scored */}
                  {feedback && (
                    <div className="space-y-3 text-xs bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                      <div>
                        <div className="font-semibold text-slate-800 mb-1">Supervisor Overall Feedback:</div>
                        <p className="text-slate-700 leading-relaxed">{feedback.overallFeedback}</p>
                      </div>

                      {feedback.whatAgentDidWell && (
                        <div>
                          <div className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                            <span>What You Did Well:</span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-line pl-5">{feedback.whatAgentDidWell}</p>
                        </div>
                      )}

                      {feedback.improvementOpportunities && (
                        <div>
                          <div className="font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Opportunity Areas:</span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-line pl-5">{feedback.improvementOpportunities}</p>
                        </div>
                      )}

                      {feedback.recommendedCoachingAction && (
                        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] gap-2">
                          <span className="text-slate-600">
                            <strong>Recommended Action:</strong> {feedback.recommendedCoachingAction}
                          </span>
                          <span className="font-mono text-slate-500">
                            Follow-up Due: {feedback.followUpDate}
                          </span>
                        </div>
                      )}

                      {/* Acknowledgment Action Box */}
                      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {isAck ? (
                          <div className="text-emerald-800 font-semibold flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <span>Acknowledged by you on {new Date(feedback.acknowledgedAt || '').toLocaleDateString()}</span>
                            {feedback.agentComment && (
                              <span className="text-slate-500 font-normal italic"> — "{feedback.agentComment}"</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-amber-800 font-medium">
                              ⚠️ This review requires your formal acknowledgment.
                            </span>
                            <button
                              onClick={() => setSelectedCallForAck(call)}
                              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
                            >
                              Acknowledge Review
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right: My Action Items & Remediation (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="font-bold text-slate-900 text-sm">My Assigned Action Items</h3>
            <p className="text-xs text-slate-500">
              Coaching activities, retraining milestones, and follow-up clinical duties.
            </p>
          </div>

          {myActionItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              You have no outstanding action items.
            </div>
          ) : (
            <div className="space-y-3">
              {myActionItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <p className="text-slate-600 leading-snug">{item.description}</p>
                    </div>
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 shrink-0">
                      {item.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due: {item.dueDate}</span>
                    </div>

                    {/* Status updater */}
                    <select
                      value={item.status}
                      onChange={(e) => onUpdateActionItemStatus(item.id, e.target.value as any)}
                      className={`py-1 px-2 rounded font-semibold text-[11px] font-mono border ${
                        item.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.status === 'In Progress'
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acknowledgment Modal */}
      {selectedCallForAck && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Acknowledge QA Call Review</h3>
              <button
                onClick={() => setSelectedCallForAck(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                You are acknowledging the review for call <strong className="font-mono">{selectedCallForAck.id}</strong> (Score: {selectedCallForAck.latestScore}/100).
              </p>
              <p>
                By confirming, you verify that you have read your supervisor's feedback and understand the coaching points.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Response / Comment for Manager:
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Thank you for the feedback. I will review the Prior-Authorization cheat sheet before tomorrow's shift."
                value={ackComment}
                onChange={(e) => setAckComment(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCallForAck(null)}
                className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAck}
                className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs"
              >
                Submit Acknowledgment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
