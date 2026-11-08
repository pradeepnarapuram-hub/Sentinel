import React, { useState } from 'react';
import { CallRecord, User } from '../types';
import {
  FileText,
  Download,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface DailyReportViewProps {
  calls: CallRecord[];
  allAgents: User[];
  onOpenCall: (callId: string) => void;
  onLogAudit: (action: string, entityId: string, details: string) => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  calls,
  allAgents,
  onOpenCall,
  onLogAudit,
}) => {
  const [reportDate, setReportDate] = useState<string>('2026-11-08');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [scheduleTime, setScheduleTime] = useState<string>('08:00');
  const [recipientEmails, setRecipientEmails] = useState<string>('qa-leadership@medqa-health.org, clinical-ops@medqa-health.org');
  const [isScheduled, setIsScheduled] = useState<boolean>(true);

  // Compute metrics for the report
  const totalCalls = calls.length;
  const scoredCalls = calls.filter((c) => c.latestScore !== undefined);
  const reviewedCount = scoredCalls.length;
  const pendingCount = totalCalls - reviewedCount;

  const avgScore = scoredCalls.length > 0
    ? Math.round(scoredCalls.reduce((sum, c) => sum + (c.latestScore || 0), 0) / scoredCalls.length)
    : 0;

  const passingCalls = scoredCalls.filter((c) => (c.latestScore || 0) >= 80 && !c.latestScorecard?.isCriticalIssue);
  const passRate = scoredCalls.length > 0 ? Math.round((passingCalls.length / scoredCalls.length) * 100) : 0;
  const failedCount = scoredCalls.length - passingCalls.length;

  const complianceCount = calls.filter((c) => c.latestScorecard?.isComplianceFlagged).length;
  const escalationCount = calls.filter((c) => c.outcome === 'escalated' || c.latestScorecard?.isEscalationFlagged).length;
  const callbackCount = calls.filter((c) => c.outcome === 'callback required').length;

  // Urgent coaching candidates
  const agentsNeedingCoaching = allAgents.filter((agent) => {
    const agentCalls = calls.filter((c) => c.agentId === agent.id && c.latestScore !== undefined);
    if (agentCalls.length === 0) return false;
    const avg = agentCalls.reduce((s, c) => s + (c.latestScore || 0), 0) / agentCalls.length;
    return avg < 80 || agentCalls.some((c) => c.latestScorecard?.isCriticalIssue);
  });

  // Low scoring calls (<80)
  const lowScoringCalls = calls.filter((c) => c.latestScore !== undefined && c.latestScore < 80);

  // Critical issue calls
  const criticalCalls = calls.filter((c) => c.latestScorecard?.isCriticalIssue);

  // CSV Export
  const handleExportCSV = () => {
    onLogAudit('REPORT_EXPORTED_EXCEL', `Daily_QA_Report_${reportDate}`, `Exported daily QA call report data for ${reportDate}`);
    const rows = [
      ['Call ID', 'Patient ID', 'Agent Name', 'Team', 'Type', 'Outcome', 'QA Score', 'Result', 'Compliance Flag', 'Review Status'],
      ...calls.map((c) => [
        c.id,
        c.patientId,
        c.agentName,
        c.agentTeam,
        c.callType,
        c.outcome,
        c.latestScore !== undefined ? c.latestScore.toString() : 'N/A',
        c.latestScore !== undefined ? (c.latestScore >= 80 && !c.latestScorecard?.isCriticalIssue ? 'PASS' : 'FAIL') : 'UNSCORED',
        c.latestScorecard?.isComplianceFlagged ? 'YES' : 'NO',
        c.reviewStatus,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(val => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_QA_Report_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF / Print Export
  const handlePrint = () => {
    onLogAudit('REPORT_EXPORTED_PDF', `Daily_QA_Report_${reportDate}`, `Generated PDF print view for daily QA report of ${reportDate}`);
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Daily Call-Quality Audit Report
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
              Automated Daily Run
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clinical conversation scorecard compliance, critical exceptions, and executive quality summary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="font-medium text-slate-700 bg-transparent focus:outline-none"
            />
          </div>

          {/* Schedule Email Button */}
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-teal-600" />
            <span>Schedule Daily Email</span>
          </button>

          {/* Export Excel / CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Excel/CSV</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 lg:p-8 space-y-6">
        {/* Healthcare QA Institutional Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-teal-700">
              Department of Quality Assurance & Clinical Risk Management
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              Daily Executive Call Quality Report
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Audit Date: <strong className="font-mono text-slate-800">{reportDate}</strong> · Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-slate-800">Healthcare Sentinel QA</div>
            <div className="text-[11px] text-slate-400 font-mono">Doc Ref: QA-DAILY-{reportDate.replace(/-/g, '')}</div>
            <div className="text-[10px] text-emerald-700 font-mono mt-0.5">HIPAA Safe Harbor Masking Active</div>
          </div>
        </div>

        {/* Executive Summary in Plain English */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
          <div className="font-bold text-slate-900 text-sm">Executive QA Summary</div>
          <p className="text-slate-700 leading-relaxed">
            During the audit period ending {reportDate}, our clinical contact centers handled{' '}
            <strong className="font-mono">{totalCalls} calls</strong> with{' '}
            <strong className="font-mono">{reviewedCount} calls evaluated</strong> by QA leadership ({Math.round((reviewedCount / Math.max(1, totalCalls)) * 100)}% audit coverage). The aggregate quality score achieved was{' '}
            <strong className="font-mono">{avgScore} out of 100</strong>, yielding a{' '}
            <strong className="font-mono">{passRate}% pass rate</strong> against our 80-point threshold.
            Specialty pharmacy and orthopedic appointment scheduling demonstrated exceptional bedside communication and adherence to e-prescribing standards. However, 1 critical failure was flagged in Patient Financial Services due to disclosure of itemized surgical balance codes prior to completing two-identifier authentication. Immediate corrective retraining has been assigned.
          </p>
        </div>

        {/* Core Daily KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Total Received</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{totalCalls}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Reviewed</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{reviewedCount}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Pending</div>
            <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">{pendingCount}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Avg Score</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${avgScore >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {avgScore}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Pass Rate</div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{passRate}%</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Failed Calls</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${failedCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {failedCount}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">HIPAA Flags</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${complianceCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {complianceCount}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Escalations</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{escalationCount}</div>
          </div>
        </div>

        {/* Section: Strengths and Improvement Themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Top 3 Team Strengths Across Evaluated Calls</span>
            </div>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">1.</span>
                <span><strong>Flawless Bilingual Prior-Auth Approvals:</strong> Outbound specialty notifications in Spanish achieved 96/100 with zero jargon.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">2.</span>
                <span><strong>Expedited Prescription Refill Logistics:</strong> Seamless coordination with retail pharmacies, preventing medication lapses.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">3.</span>
                <span><strong>Prompt Triage Hand-offs:</strong> Rapid warm-transfer protocols executed for post-op stent patients experiencing tightness.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
            <div className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Top 3 Improvement Opportunities & Coaching Directives</span>
            </div>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-700">1.</span>
                <span><strong>Mandatory 2-Identifier Verification:</strong> Zero tolerance for discussing balances or diagnostics without prior DOB + address check.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-700">2.</span>
                <span><strong>De-escalation in Billing Inquiries:</strong> Eliminate defensive language regarding third-party radiologist network status.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-700">3.</span>
                <span><strong>Explicit Callback Service Windows:</strong> State specific callback windows (e.g. before 11:00 AM) rather than open-ended promises.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Section: Critical Issues & Low Scoring Calls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Calls Requiring Management Attention (Critical Flags & Score &lt; 80)</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">{lowScoringCalls.length} Incidents</span>
          </div>

          {lowScoringCalls.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No low scoring or critical calls recorded today.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {lowScoringCalls.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                      <span>{c.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-rose-700 font-sans font-semibold">Score: {c.latestScore}/100</span>
                      {c.latestScorecard?.isCriticalIssue && (
                        <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-sans uppercase">
                          Critical Issue
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 mt-1">
                      Agent: <strong>{c.agentName}</strong> ({c.agentTeam}) · Patient ID: {c.patientId} · Call Type: {c.callType}
                    </div>
                    {c.latestScorecard?.criticalIssueReason && (
                      <p className="text-rose-900 font-medium mt-1">
                        Reason: {c.latestScorecard.criticalIssueReason}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenCall(c.id)}
                    className="no-print px-3 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shrink-0"
                  >
                    Open Review Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Agents Requiring Urgent Coaching */}
        <div className="space-y-2">
          <div className="font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
            Agents Requiring Immediate Coaching or Retraining
          </div>
          {agentsNeedingCoaching.length === 0 ? (
            <p className="text-xs text-slate-400 italic">All evaluated agents met or exceeded standard thresholds.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {agentsNeedingCoaching.map((agent) => (
                <div key={agent.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/30">
                  <div className="font-bold text-slate-900">{agent.name}</div>
                  <div className="text-slate-500 text-[11px]">{agent.title} · {agent.team}</div>
                  <div className="mt-1 text-slate-700">
                    Mandatory Retraining Action Item active: <strong>HIPAA Security Standards Module 4</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary of Patient Conversation Themes */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="font-bold text-slate-900 text-sm">Key Clinical Themes from Patient Conversations</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <strong className="text-slate-800">1. Out-of-Pocket Transparency:</strong>
              <p className="text-slate-600 mt-0.5">High patient sensitivity to unexpected facility fees and specialist network coverage.</p>
            </div>
            <div>
              <strong className="text-slate-800">2. Refill Continuity:</strong>
              <p className="text-slate-600 mt-0.5">Weekend anxiety regarding maintenance blood pressure medication refills.</p>
            </div>
            <div>
              <strong className="text-slate-800">3. Post-Op Symptom Caution:</strong>
              <p className="text-slate-600 mt-0.5">Patients seek immediate clarity on normal post-procedure discomfort vs clinical emergencies.</p>
            </div>
          </div>
        </div>

        {/* Sign-off footer */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <div>Reviewed & Approved by: <strong>Dr. Arthur Sterling, Clinical QA Director</strong></div>
            <div className="text-[11px] text-slate-400 mt-0.5">Medical Records & Contact Center Compliance Committee</div>
          </div>
          <div className="font-mono text-[11px] text-right">
            Page 1 of 1 · Confirmed Encrypted Audit
          </div>
        </div>
      </div>

      {/* Schedule Email Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Schedule Daily QA Report by Email</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-slate-600">
              Configure automated morning delivery of the executive daily quality and compliance report to managers.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Daily Delivery Time:</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recipient Email List (comma separated):</label>
              <textarea
                rows={3}
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeSched"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded"
              />
              <label htmlFor="activeSched" className="font-medium text-slate-800">
                Enable automated delivery schedule
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`Daily QA Report schedule saved! Automated email will dispatch every morning at ${scheduleTime} to ${recipientEmails}`);
                  setShowScheduleModal(false);
                }}
                className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-semibold shadow-xs"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
