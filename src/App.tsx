import React, { useState } from 'react';
import {
  User,
  CallRecord,
  RubricCategory,
  CallActionItem,
  AuditLogEntry,
  ReviewScorecard,
  ReviewStatus,
} from './types';
import {
  MOCK_USERS,
  INITIAL_CALLS,
  DEFAULT_RUBRIC_CATEGORIES,
  INITIAL_ACTION_ITEMS,
  INITIAL_AUDIT_LOGS,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CallQueueView } from './components/CallQueueView';
import { CallReviewView } from './components/CallReviewView';
import { AgentPortalView } from './components/AgentPortalView';
import { DailyReportView } from './components/DailyReportView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { AdminSettingsView } from './components/AdminSettingsView';

export default function App() {
  // Current active user (defaults to Sarah Jenkins, Senior QA Reviewer)
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[1]); // Sarah Jenkins (Manager)

  // System settings
  const [rubricCategories, setRubricCategories] = useState<RubricCategory[]>(DEFAULT_RUBRIC_CATEGORIES);
  const [passThreshold, setPassThreshold] = useState<number>(80);
  const [hipaaMasking, setHipaaMasking] = useState<boolean>(true);

  // Calls and reviews data
  const [calls, setCalls] = useState<CallRecord[]>(INITIAL_CALLS);
  const [actionItems, setActionItems] = useState<CallActionItem[]>(INITIAL_ACTION_ITEMS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Active navigation view
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Filter pending reviews
  const pendingReviewsCount = calls.filter((c) => c.latestScore === undefined).length;

  const reviewers = allUsers.filter((u) => u.role === 'manager' || u.role === 'admin');
  const allAgents = allUsers.filter((u) => u.role === 'agent');

  // Audit Logger helper
  const logAudit = (action: string, entityId: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: action as any,
      entityId,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Switch User Persona
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'agent') {
      setActiveView('agent-portal');
      setActiveCallId(null);
    } else if (activeView === 'agent-portal' || activeView === 'agent-actions') {
      setActiveView('dashboard');
      setActiveCallId(null);
    }
    logAudit('USER_STATUS_TOGGLED', user.id, `Session authenticated as ${user.name} (${user.role})`);
  };

  // Open Call Review
  const handleOpenCall = (callId: string) => {
    setActiveCallId(callId);
    setActiveView('call-review');
    logAudit('AUDIO_ACCESSED', callId, `Call review session opened by ${currentUser.name}`);
  };

  // Assign Reviewer
  const handleAssignReviewer = (callId: string, reviewerId: string, reviewerName: string) => {
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id === callId) {
          return {
            ...c,
            assignedReviewerId: reviewerId,
            assignedReviewerName: reviewerName,
            reviewStatus: c.reviewStatus === 'New' ? 'In Review' : c.reviewStatus,
          };
        }
        return c;
      })
    );
    logAudit('CALL_ASSIGNED', callId, `Assigned to QA Reviewer ${reviewerName}`);
  };

  // Save Review Scorecard
  const handleSaveScorecard = (scorecard: ReviewScorecard, status: ReviewStatus) => {
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id === scorecard.callId) {
          const prevHistory = c.scoreHistory || [];
          if (c.latestScorecard) {
            prevHistory.push(c.latestScorecard);
          }
          return {
            ...c,
            latestScore: scorecard.calculatedScore,
            latestScorecard: scorecard,
            scoreHistory: prevHistory,
            reviewStatus: status,
          };
        }
        return c;
      })
    );

    logAudit(
      scorecard.version > 1 ? 'SCORE_UPDATED' : 'SCORE_CREATED',
      scorecard.callId,
      `Scorecard ${scorecard.calculatedScore}/100 submitted (Version ${scorecard.version}). Pass: ${scorecard.isPassing ? 'Yes' : 'No'}. Critical Issue: ${scorecard.isCriticalIssue ? 'YES' : 'No'}`
    );

    alert(`QA Review for ${scorecard.callId} successfully saved! Overall Score: ${scorecard.calculatedScore}/100.`);
    setActiveView(currentUser.role === 'agent' ? 'agent-portal' : 'call-queue');
    setActiveCallId(null);
  };

  // Add Action Item
  const handleAddActionItem = (newItem: Omit<CallActionItem, 'id' | 'createdAt'>) => {
    const item: CallActionItem = {
      ...newItem,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setActionItems((prev) => [item, ...prev]);

    // Also attach to call
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id === newItem.callId) {
          return {
            ...c,
            actionItems: [...(c.actionItems || []), item],
          };
        }
        return c;
      })
    );

    logAudit('ACTION_ITEM_CREATED', item.id, `Action item "${item.title}" assigned to ${item.ownerName}`);
    alert(`Action item created: "${item.title}"`);
  };

  // Update Action Item Status
  const handleUpdateActionItemStatus = (actionId: string, status: CallActionItem['status']) => {
    setActionItems((prev) =>
      prev.map((act) => (act.id === actionId ? { ...act, status } : act))
    );
    logAudit('ACTION_ITEM_UPDATED', actionId, `Status updated to ${status}`);
  };

  // Agent Acknowledge Feedback
  const handleAcknowledgeFeedback = (callId: string, agentComment: string) => {
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id === callId && c.latestScorecard) {
          const updatedScorecard: ReviewScorecard = {
            ...c.latestScorecard,
            feedbackForAgent: {
              ...c.latestScorecard.feedbackForAgent,
              isAcknowledged: true,
              acknowledgedAt: new Date().toISOString(),
              agentComment: agentComment || undefined,
            },
          };
          return {
            ...c,
            latestScorecard: updatedScorecard,
          };
        }
        return c;
      })
    );

    logAudit(
      'FEEDBACK_ACKNOWLEDGED',
      callId,
      `Agent ${currentUser.name} acknowledged review with comment: "${agentComment || 'Confirmed'}"`
    );
    alert('Thank you! Your acknowledgment has been recorded and submitted to your QA manager.');
  };

  const activeCall = calls.find((c) => c.id === activeCallId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Institutional Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        allUsers={allUsers}
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          setActiveCallId(null);
        }}
        pendingReviewsCount={pendingReviewsCount}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Call Review Workspace */}
        {activeView === 'call-review' && activeCall && (
          <CallReviewView
            call={activeCall}
            currentUser={currentUser}
            rubricCategories={rubricCategories}
            passThreshold={passThreshold}
            reviewers={reviewers}
            allAgents={allAgents}
            hipaaMasking={hipaaMasking}
            onBack={() => {
              setActiveView(currentUser.role === 'agent' ? 'agent-portal' : 'call-queue');
              setActiveCallId(null);
            }}
            onSaveScorecard={handleSaveScorecard}
            onAddActionItem={handleAddActionItem}
            onAssignReviewer={handleAssignReviewer}
          />
        )}

        {/* Manager Dashboard */}
        {activeView === 'dashboard' && currentUser.role !== 'agent' && (
          <DashboardView
            calls={calls}
            allAgents={allAgents}
            onOpenCall={handleOpenCall}
            onNavigateToQueue={(preset) => {
              setActiveView('call-queue');
            }}
          />
        )}

        {/* Call Queue View */}
        {activeView === 'call-queue' && currentUser.role !== 'agent' && (
          <CallQueueView
            calls={calls}
            currentUser={currentUser}
            onOpenCall={handleOpenCall}
            onAssignReviewer={handleAssignReviewer}
            reviewers={reviewers}
            hipaaMasking={hipaaMasking}
          />
        )}

        {/* Daily Report View */}
        {activeView === 'daily-report' && currentUser.role !== 'agent' && (
          <DailyReportView
            calls={calls}
            allAgents={allAgents}
            onOpenCall={handleOpenCall}
            onLogAudit={logAudit}
          />
        )}

        {/* Weekly Report View */}
        {activeView === 'weekly-report' && currentUser.role !== 'agent' && (
          <WeeklyReportView
            calls={calls}
            allAgents={allAgents}
            actionItems={actionItems}
            onOpenCall={handleOpenCall}
            onLogAudit={logAudit}
          />
        )}

        {/* Admin Settings View */}
        {activeView === 'admin-settings' && currentUser.role === 'admin' && (
          <AdminSettingsView
            rubricCategories={rubricCategories}
            onUpdateRubricCategories={(cats) => setRubricCategories(cats)}
            passThreshold={passThreshold}
            onUpdatePassThreshold={(th) => setPassThreshold(th)}
            users={allUsers}
            onUpdateUsers={(u) => setAllUsers(u)}
            auditLogs={auditLogs}
            hipaaMasking={hipaaMasking}
            onToggleHipaaMasking={(val) => setHipaaMasking(val)}
            onLogAudit={logAudit}
          />
        )}

        {/* Agent Portal View */}
        {(activeView === 'agent-portal' || currentUser.role === 'agent') && (
          <AgentPortalView
            currentAgent={currentUser}
            calls={calls}
            actionItems={actionItems}
            onOpenCall={handleOpenCall}
            onAcknowledgeFeedback={handleAcknowledgeFeedback}
            onUpdateActionItemStatus={handleUpdateActionItemStatus}
            hipaaMasking={hipaaMasking}
          />
        )}
      </main>

      {/* Institutional Healthcare Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">HealthQA Sentinel</span>
            <span>·</span>
            <span>Clinical Call Quality Assurance & Compliance Governance</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Active Role: <strong className="text-teal-700 uppercase font-semibold">{currentUser.role}</strong></span>
            <span>·</span>
            <span>HIPAA Masking: <strong className={hipaaMasking ? 'text-emerald-700' : 'text-slate-600'}>{hipaaMasking ? 'ON' : 'OFF'}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
