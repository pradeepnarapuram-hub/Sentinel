import React, { useState, useMemo } from 'react';
import { CallRecord, User } from '../types';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  PhoneCall,
  UserX,
  PhoneForwarded,
  Award,
  ChevronRight,
} from 'lucide-react';

interface DashboardViewProps {
  calls: CallRecord[];
  allAgents: User[];
  onOpenCall: (callId: string) => void;
  onNavigateToQueue: (filterPreset?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  calls,
  allAgents,
  onOpenCall,
  onNavigateToQueue,
}) => {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const teams = useMemo(() => Array.from(new Set(calls.map((c) => c.agentTeam))), [calls]);

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (selectedTeam !== 'all' && c.agentTeam !== selectedTeam) return false;
      return true;
    });
  }, [calls, selectedTeam]);

  // Aggregate metrics
  const totalCalls = filteredCalls.length;
  const scoredCalls = filteredCalls.filter((c) => c.latestScore !== undefined);
  const reviewedCount = scoredCalls.length;
  const pendingCount = totalCalls - reviewedCount;

  const avgScore = useMemo(() => {
    if (scoredCalls.length === 0) return 0;
    const sum = scoredCalls.reduce((acc, c) => acc + (c.latestScore || 0), 0);
    return Math.round(sum / scoredCalls.length);
  }, [scoredCalls]);

  const passingCalls = scoredCalls.filter((c) => (c.latestScore || 0) >= 80 && !c.latestScorecard?.isCriticalIssue);
  const passRate = scoredCalls.length > 0 ? Math.round((passingCalls.length / scoredCalls.length) * 100) : 0;
  const failedCount = scoredCalls.length - passingCalls.length;

  const complianceFlaggedCount = filteredCalls.filter((c) => c.latestScorecard?.isComplianceFlagged).length;
  const escalationCount = filteredCalls.filter((c) => c.outcome === 'escalated' || c.latestScorecard?.isEscalationFlagged).length;
  const callbackCount = filteredCalls.filter((c) => c.outcome === 'callback required').length;

  const avgHandleTimeSec = useMemo(() => {
    if (filteredCalls.length === 0) return 0;
    const totalSec = filteredCalls.reduce((acc, c) => acc + c.duration, 0);
    return Math.round(totalSec / filteredCalls.length);
  }, [filteredCalls]);

  const formatAHT = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  // Score distribution brackets
  const scoreBuckets = useMemo(() => {
    let under70 = 0;
    let b70to79 = 0;
    let b80to89 = 0;
    let b90to100 = 0;

    scoredCalls.forEach((c) => {
      const s = c.latestScore || 0;
      if (s < 70) under70++;
      else if (s < 80) b70to79++;
      else if (s < 90) b80to89++;
      else b90to100++;
    });

    return [
      { label: '< 70', count: under70, color: 'bg-rose-500' },
      { label: '70 - 79', count: b70to79, color: 'bg-amber-500' },
      { label: '80 - 89', count: b80to89, color: 'bg-sky-500' },
      { label: '90 - 100', count: b90to100, color: 'bg-emerald-500' },
    ];
  }, [scoredCalls]);

  // Agent Leaderboard
  const agentLeaderboard = useMemo(() => {
    return allAgents.map((agent) => {
      const agentCalls = calls.filter((c) => c.agentId === agent.id);
      const agentScored = agentCalls.filter((c) => c.latestScore !== undefined);
      const agentAvg =
        agentScored.length > 0
          ? Math.round(agentScored.reduce((sum, c) => sum + (c.latestScore || 0), 0) / agentScored.length)
          : 0;
      const agentPassCount = agentScored.filter((c) => (c.latestScore || 0) >= 80 && !c.latestScorecard?.isCriticalIssue).length;
      const agentPassRate = agentScored.length > 0 ? Math.round((agentPassCount / agentScored.length) * 100) : 0;
      const flags = agentCalls.filter((c) => c.latestScorecard?.isComplianceFlagged).length;

      return {
        ...agent,
        totalCalls: agentCalls.length,
        scoredCalls: agentScored.length,
        avgScore: agentAvg,
        passRate: agentPassRate,
        complianceFlags: flags,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [allAgents, calls]);

  // Aggregate top strengths and improvement themes
  const topStrengths = [
    '2-Identifier HIPAA Verification at Inception',
    'Compassionate Active Listening & De-escalation',
    'Clear Diagnostic Scheduling & Turnaround Expectations',
    'Precise EHR Order & Pharmacy Transmission Documentation',
  ];

  const topImprovementAreas = [
    'Confirm patient consent prior to multi-party consultation transfers',
    'Offer digital SMS/portal tracking options proactively',
    'Avoid medical jargon when explaining prior-authorization delays',
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title and Global Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">QA Clinical Performance Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time quality scores, compliance adherence, and patient conversation analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Team filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300"
          >
            <option value="all">All Care Teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Time range tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-md transition-colors ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1 rounded-md transition-colors ${
                timeRange === '7days' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1 rounded-md transition-colors ${
                timeRange === '30days' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Calls */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Calls</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{totalCalls}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ingested across queues</div>
        </div>

        {/* Reviewed vs Pending */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-teal-500 transition-colors"
          onClick={() => onNavigateToQueue('unscored')}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reviews Pending</div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1 tabular-nums">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">{reviewedCount} scored ({Math.round((reviewedCount / Math.max(1, totalCalls)) * 100)}%)</div>
        </div>

        {/* Average Quality Score */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Quality Score</div>
          <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${avgScore >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {avgScore} <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Weighted 7-rubric avg</div>
        </div>

        {/* Pass Rate */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">{passRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">{failedCount} failed (&lt;80)</div>
        </div>

        {/* Compliance Flags */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Compliance Flags</div>
          <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${complianceFlaggedCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {complianceFlaggedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">HIPAA / PHI alerts</div>
        </div>

        {/* Average Handle Time */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Handle Time</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{formatAHT(avgHandleTimeSec)}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">{escalationCount} escalations</div>
        </div>
      </div>

      {/* Grid: Score Distribution + Clinical Strengths / Coaching Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Distribution Histogram (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Score Range Distribution</h3>
              <p className="text-xs text-slate-500">Breakdown of calls across quality tiers</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{scoredCalls.length} Scored</span>
          </div>

          <div className="space-y-3 pt-2">
            {scoreBuckets.map((bucket, i) => {
              const pct = scoredCalls.length > 0 ? Math.round((bucket.count / scoredCalls.length) * 100) : 0;
              return (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="font-medium text-slate-700">{bucket.label} Points</span>
                    <span className="text-slate-500">{bucket.count} calls ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bucket.color} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Pass Threshold: <strong className="text-slate-700 font-mono">80 / 100</strong></span>
            <span>Critical Issue Cap: <strong className="text-rose-700 font-mono">50 Max</strong></span>
          </div>
        </div>

        {/* Qualitative QA Themes & Strengths (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Team QA Insights & Coaching Focus</h3>
            <p className="text-xs text-slate-500">Top strengths and key improvement areas synthesized across reviews</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Top Strengths */}
            <div className="space-y-2">
              <div className="font-semibold text-emerald-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Top Team Strengths</span>
              </div>
              <ul className="space-y-2">
                {topStrengths.map((str, idx) => (
                  <li key={idx} className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-slate-700 leading-snug">
                    {str}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvement Areas */}
            <div className="space-y-2">
              <div className="font-semibold text-amber-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Priority Coaching Areas</span>
              </div>
              <ul className="space-y-2">
                {topImprovementAreas.map((imp, idx) => (
                  <li key={idx} className="p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-slate-700 leading-snug">
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Agent Performance Leaderboard</h3>
            <p className="text-xs text-slate-500">Quality scores, review volumes, and compliance standing by agent</p>
          </div>
          <button
            onClick={() => onNavigateToQueue()}
            className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
          >
            <span>View All Queue Calls</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Agent Name</th>
                <th className="py-2.5 px-4">Care Team</th>
                <th className="py-2.5 px-4 text-center">Calls Audited</th>
                <th className="py-2.5 px-4 text-center">Avg QA Score</th>
                <th className="py-2.5 px-4 text-center">Pass Rate</th>
                <th className="py-2.5 px-4 text-center">Compliance Flags</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {agentLeaderboard.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{agent.name}</td>
                  <td className="py-3 px-4 text-slate-500">{agent.team}</td>
                  <td className="py-3 px-4 text-center font-mono">{agent.scoredCalls} / {agent.totalCalls}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    <span className={agent.avgScore >= 80 ? 'text-emerald-700' : 'text-rose-700'}>
                      {agent.avgScore > 0 ? `${agent.avgScore}/100` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{agent.scoredCalls > 0 ? `${agent.passRate}%` : '—'}</td>
                  <td className="py-3 px-4 text-center font-mono">
                    {agent.complianceFlags > 0 ? (
                      <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                        {agent.complianceFlags} Flags
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      agent.avgScore >= 90
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : agent.avgScore >= 80
                        ? 'bg-sky-50 text-sky-800 border border-sky-200'
                        : agent.avgScore > 0
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {agent.avgScore >= 90 ? 'Champion' : agent.avgScore >= 80 ? 'On Track' : agent.avgScore > 0 ? 'Coaching Active' : 'Unscored'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
