import React, { useState } from 'react';
import { CallRecord, User, CallActionItem } from '../types';
import {
  Calendar,
  Download,
  Mail,
  Printer,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface WeeklyReportViewProps {
  calls: CallRecord[];
  allAgents: User[];
  actionItems: CallActionItem[];
  onOpenCall: (callId: string) => void;
  onLogAudit: (action: string, entityId: string, details: string) => void;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  calls,
  allAgents,
  actionItems,
  onOpenCall,
  onLogAudit,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<string>('Oct 26 - Nov 01, 2026');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [scheduleTime, setScheduleTime] = useState<string>('07:30');
  const [recipientEmails, setRecipientEmails] = useState<string>('executive-qa@medqa-health.org, contact-center-ops@medqa-health.org');

  // Compute metrics
  const totalCalls = calls.length;
  const scoredCalls = calls.filter((c) => c.latestScore !== undefined);
  const reviewedCount = scoredCalls.length;

  const avgScore = scoredCalls.length > 0
    ? Math.round(scoredCalls.reduce((sum, c) => sum + (c.latestScore || 0), 0) / scoredCalls.length)
    : 0;

  const passedCount = scoredCalls.filter((c) => (c.latestScore || 0) >= 80 && !c.latestScorecard?.isCriticalIssue).length;
  const passRate = scoredCalls.length > 0 ? Math.round((passedCount / scoredCalls.length) * 100) : 0;
  const complianceCount = calls.filter((c) => c.latestScorecard?.isComplianceFlagged).length;

  // Week-over-week deltas
  const wowVolumeChange = +6.4;
  const wowScoreChange = +2.8;
  const wowPassRateChange = +4.1;
  const wowComplianceChange = -1.2;

  // Agent Performance Table
  const agentPerformance = allAgents.map((agent) => {
    const agentCalls = calls.filter((c) => c.agentId === agent.id);
    const agentScored = agentCalls.filter((c) => c.latestScore !== undefined);
    const agentAvg =
      agentScored.length > 0
        ? Math.round(agentScored.reduce((sum, c) => sum + (c.latestScore || 0), 0) / agentScored.length)
        : 0;
    const agentPass = agentScored.filter((c) => (c.latestScore || 0) >= 80 && !c.latestScorecard?.isCriticalIssue).length;
    const agentRate = agentScored.length > 0 ? Math.round((agentPass / agentScored.length) * 100) : 0;
    const flags = agentCalls.filter((c) => c.latestScorecard?.isComplianceFlagged).length;

    let status: 'Top Performer' | 'On Track' | 'Needs Support' = 'On Track';
    if (agentAvg >= 90) status = 'Top Performer';
    else if (agentAvg < 80 && agentScored.length > 0) status = 'Needs Support';

    return {
      agent,
      total: agentCalls.length,
      scored: agentScored.length,
      avgScore: agentAvg,
      passRate: agentRate,
      complianceFlags: flags,
      status,
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  // Team Performance Table
  const teams = Array.from(new Set(calls.map((c) => c.agentTeam)));
  const teamPerformance = teams.map((team) => {
    const teamCalls = calls.filter((c) => c.agentTeam === team);
    const teamScored = teamCalls.filter((c) => c.latestScore !== undefined);
    const teamAvg =
      teamScored.length > 0
        ? Math.round(teamScored.reduce((sum, c) => sum + (c.latestScore || 0), 0) / teamScored.length)
        : 0;
    const avgDuration = Math.round(teamCalls.reduce((s, c) => s + c.duration, 0) / Math.max(1, teamCalls.length));
    return {
      team,
      total: teamCalls.length,
      avgScore: teamAvg,
      avgDuration,
    };
  });

  // Call Type Analysis
  const callTypes = [
    { type: 'Prescription Refill', volume: 24, avgScore: 94, escalationRate: '4%' },
    { type: 'Appointment Scheduling', volume: 38, avgScore: 88, escalationRate: '2%' },
    { type: 'Insurance Verification', volume: 19, avgScore: 91, escalationRate: '5%' },
    { type: 'Follow-up (Post-Procedure)', volume: 15, avgScore: 82, escalationRate: '18%' },
    { type: 'Complaint & Financial', volume: 11, avgScore: 68, escalationRate: '27%' },
  ];

  // Action Items Progress
  const totalActions = actionItems.length;
  const completedActions = actionItems.filter((a) => a.status === 'Completed').length;
  const inProgressActions = actionItems.filter((a) => a.status === 'In Progress').length;
  const overdueActions = actionItems.filter((a) => a.status === 'Overdue').length;

  const handleExportCSV = () => {
    onLogAudit('REPORT_EXPORTED_EXCEL', `Weekly_QA_Report_${selectedWeek}`, `Exported weekly QA data for ${selectedWeek}`);
    const rows = [
      ['Metric', 'Current Week', 'WoW Delta'],
      ['Total Calls', totalCalls.toString(), `${wowVolumeChange}%`],
      ['Reviewed Calls', reviewedCount.toString(), '—'],
      ['Average Score', avgScore.toString(), `+${wowScoreChange} pts`],
      ['Pass Rate', `${passRate}%`, `+${wowPassRateChange}%`],
      ['Compliance Flags', complianceCount.toString(), `${wowComplianceChange}%`],
      [],
      ['Agent Name', 'Team', 'Calls', 'Avg Score', 'Pass Rate', 'Status'],
      ...agentPerformance.map((a) => [
        a.agent.name,
        a.agent.team,
        a.total.toString(),
        a.avgScore.toString(),
        `${a.passRate}%`,
        a.status,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(val => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Weekly_QA_Report_${selectedWeek.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    onLogAudit('REPORT_EXPORTED_PDF', `Weekly_QA_Report_${selectedWeek}`, `Generated PDF print view for weekly report ${selectedWeek}`);
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Weekly QA Performance & Trend Audit
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 font-semibold">
              Monday – Sunday Period
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Week-over-week quality trends, agent performance ranking, and strategic clinical coaching directives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="font-medium text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="Nov 02 - Nov 08, 2026">Nov 02 - Nov 08, 2026 (Current)</option>
              <option value="Oct 26 - Nov 01, 2026">Oct 26 - Nov 01, 2026</option>
              <option value="Oct 19 - Oct 25, 2026">Oct 19 - Oct 25, 2026</option>
            </select>
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-teal-600" />
            <span>Schedule Monday Email</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* DOCUMENT CANVAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 lg:p-8 space-y-6">
        {/* Institutional Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-teal-700">
              St. Jude Health System · Clinical Operations Quality Committee
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              Weekly Call Quality & Operational Review
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Reporting Cycle: <strong className="font-mono text-slate-800">{selectedWeek}</strong> · Mon 00:00 - Sun 23:59 UTC
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-800">QA Governance Board</div>
            <div className="text-[11px] text-slate-400 font-mono">Report ID: QA-WK-2026-W45</div>
            <div className="text-[10px] text-emerald-700 font-mono mt-0.5">HIPAA & OIG Audit Verified</div>
          </div>
        </div>

        {/* Week-over-Week Executive Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] font-semibold uppercase">Total Call Volume</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{totalCalls}</div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{wowVolumeChange}% vs prior week</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] font-semibold uppercase">Average Quality Score</div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
              {avgScore} <span className="text-xs font-normal text-slate-400">/100</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{wowScoreChange} pts vs prior week</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] font-semibold uppercase">QA Pass Rate (≥ 80)</div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">{passRate}%</div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{wowPassRateChange}% vs prior week</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] font-semibold uppercase">Compliance Disclosures</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{complianceCount}</div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{wowComplianceChange}% improvement in compliance</span>
            </div>
          </div>
        </div>

        {/* Section: Agent Performance Rankings Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Agent Performance Ranking</h3>
            <span className="text-xs font-mono text-slate-400">{agentPerformance.length} Active Agents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Team</th>
                  <th className="py-2.5 px-3 text-center">Calls Audited</th>
                  <th className="py-2.5 px-3 text-center">Avg QA Score</th>
                  <th className="py-2.5 px-3 text-center">Pass Rate</th>
                  <th className="py-2.5 px-3 text-center">Compliance Alerts</th>
                  <th className="py-2.5 px-3 text-right">Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {agentPerformance.map((item) => (
                  <tr key={item.agent.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.agent.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.agent.team}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.scored} / {item.total}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      <span className={item.avgScore >= 80 ? 'text-emerald-700' : 'text-rose-700'}>
                        {item.avgScore > 0 ? `${item.avgScore}/100` : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.scored > 0 ? `${item.passRate}%` : '—'}</td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {item.complianceFlags > 0 ? (
                        <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded text-[10px]">
                          {item.complianceFlags}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.status === 'Top Performer'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.status === 'Needs Support'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Call-Type Analysis & Outcome Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
              Call-Type Quality & Escalation Matrix
            </h3>
            <div className="space-y-2 text-xs">
              {callTypes.map((ct, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800">{ct.type}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Volume: <span className="font-mono text-slate-700">{ct.volume} calls</span> · Escalation Rate: <span className="font-mono text-slate-700">{ct.escalationRate}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className={`font-bold ${ct.avgScore >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {ct.avgScore} / 100
                    </div>
                    <div className="text-[10px] text-slate-400">Avg Quality</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coaching Progress & Action Items (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm pb-1 border-b border-slate-200">
              Remediation & Action Item Progress
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Total Active Coaching Items:</span>
                <span className="font-bold font-mono text-slate-900 text-sm">{totalActions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Completed Remediation:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">{completedActions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">In Progress:</span>
                <span className="font-bold font-mono text-sky-700 text-sm">{inProgressActions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Overdue Tasks:</span>
                <span className="font-bold font-mono text-rose-700 text-sm">{overdueActions}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Priority Coaching Notice</span>
              </div>
              <p className="text-[11px] leading-snug">
                Priya Sharma's HIPAA Authentication refresher is due on Nov 12. Clinical supervision recommended until certificate is filed.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations for Coming Week */}
        <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 text-xs space-y-2">
          <div className="font-bold text-teal-950 uppercase tracking-wider text-[11px]">
            Strategic Recommendations for the Coming Week
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
            <li>
              <strong>Implement Mandatory Pre-Disclosure Script:</strong> Add system prompt to CRM requiring explicit checkbox confirmation of 2 patient identifiers before unmasking financial balances.
            </li>
            <li>
              <strong>Expand Bilingual Recognition Program:</strong> Nominate Maria Rodriguez for QA Champion after exemplary Spanish prior-authorization approval handling.
            </li>
            <li>
              <strong>Conduct Stent Follow-Up Calibration:</strong> Audit all post-op cardiology calls for adherence to the 90-second nurse triage handoff standard.
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <div>Prepared for: <strong>Executive Clinical Governance Board</strong></div>
            <div className="text-[11px] text-slate-400 mt-0.5">Automated compilation certified by HealthQA Sentinel Engine</div>
          </div>
          <div className="font-mono text-[11px] text-right">
            Weekly Cycle Closes Every Sunday 23:59 UTC
          </div>
        </div>
      </div>

      {/* Schedule Monday Morning Email Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Schedule Weekly Report Delivery</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-slate-600">
              Automate weekly Monday morning PDF and Excel summary distribution to department directors.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dispatch Schedule:</label>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">Every Monday at</span>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="px-2.5 py-1 rounded border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recipient Email List:</label>
              <textarea
                rows={3}
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
              />
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
                  alert(`Weekly QA Report schedule saved! Automated delivery set for every Monday at ${scheduleTime} to ${recipientEmails}`);
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
