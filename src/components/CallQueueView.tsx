import React, { useState, useMemo } from 'react';
import { CallRecord, User, CallType, CallOutcome, ReviewStatus } from '../types';
import { Search, Filter, Play, CheckCircle, AlertTriangle, Clock, ArrowUpDown, UserCheck } from 'lucide-react';

interface CallQueueViewProps {
  calls: CallRecord[];
  currentUser: User;
  onOpenCall: (callId: string) => void;
  onAssignReviewer: (callId: string, reviewerId: string, reviewerName: string) => void;
  reviewers: User[];
  hipaaMasking: boolean;
}

export const CallQueueView: React.FC<CallQueueViewProps> = ({
  calls,
  currentUser,
  onOpenCall,
  onAssignReviewer,
  reviewers,
  hipaaMasking,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedScoreRange, setSelectedScoreRange] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<boolean | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Assign Reviewer popover state
  const [assigningCallId, setAssigningCallId] = useState<string | null>(null);

  const teams = useMemo(() => Array.from(new Set(calls.map((c) => c.agentTeam))), [calls]);

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = call.id.toLowerCase().includes(query);
        const matchesPatient = call.patientName.toLowerCase().includes(query) || call.patientId.toLowerCase().includes(query);
        const matchesAgent = call.agentName.toLowerCase().includes(query);
        const matchesDisposition = call.disposition.toLowerCase().includes(query);
        const matchesTranscript = call.transcript.some((t) => t.text.toLowerCase().includes(query));
        if (!matchesId && !matchesPatient && !matchesAgent && !matchesDisposition && !matchesTranscript) {
          return false;
        }
      }

      // Team
      if (selectedTeam !== 'all' && call.agentTeam !== selectedTeam) return false;

      // Type
      if (selectedType !== 'all' && call.callType !== selectedType) return false;

      // Outcome
      if (selectedOutcome !== 'all' && call.outcome !== selectedOutcome) return false;

      // Status
      if (selectedStatus !== 'all' && call.reviewStatus !== selectedStatus) return false;

      // Compliance flag
      if (complianceFilter === true && !call.latestScorecard?.isComplianceFlagged) return false;

      // Score Range
      if (selectedScoreRange === 'pass' && (call.latestScore === undefined || call.latestScore < 80)) return false;
      if (selectedScoreRange === 'fail' && (call.latestScore === undefined || call.latestScore >= 80)) return false;
      if (selectedScoreRange === 'unscored' && call.latestScore !== undefined) return false;

      return true;
    }).sort((a, b) => {
      let diff = 0;
      if (sortBy === 'date') {
        diff = new Date(a.callDate).getTime() - new Date(b.callDate).getTime();
      } else if (sortBy === 'score') {
        diff = (a.latestScore ?? -1) - (b.latestScore ?? -1);
      } else if (sortBy === 'duration') {
        diff = a.duration - b.duration;
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [calls, searchTerm, selectedTeam, selectedType, selectedOutcome, selectedStatus, selectedScoreRange, complianceFilter, sortBy, sortOrder]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatDisplayPatient = (name: string, id: string) => {
    if (!hipaaMasking) return `${name} (${id})`;
    const parts = name.split(' ');
    const initial = parts[0] ? `${parts[0][0]}.` : 'P.';
    const maskedLast = parts[1] ? `${parts[1][0]}***` : '***';
    return `${initial} ${maskedLast} [${id}]`;
  };

  const getStatusColor = (status: ReviewStatus) => {
    switch (status) {
      case 'Scored':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'In Review':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'Needs Follow-up':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Escalated':
        return 'text-rose-800 bg-rose-50 border-rose-200';
      case 'Closed':
        return 'text-slate-600 bg-slate-100 border-slate-200';
      case 'New':
      default:
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Healthcare Call QA Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinical conversation review, HIPAA adherence auditing, and agent score verification.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">
            Showing <strong className="text-slate-900 font-mono">{filteredCalls.length}</strong> of{' '}
            <span className="font-mono">{calls.length}</span> calls
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Call ID, Patient, Agent, or transcript text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          {/* Team Filter */}
          <div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="all">All Teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="all">All Review Statuses</option>
              <option value="New">New</option>
              <option value="In Review">In Review</option>
              <option value="Scored">Scored</option>
              <option value="Needs Follow-up">Needs Follow-up</option>
              <option value="Escalated">Escalated</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Call Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-1 px-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
            >
              <option value="all">All Call Types</option>
              <option value="prescription refill">Prescription Refill</option>
              <option value="appointment scheduling">Appointment Scheduling</option>
              <option value="follow-up">Follow-up</option>
              <option value="insurance verification">Insurance Verification</option>
              <option value="complaint">Complaint</option>
              <option value="general inquiry">General Inquiry</option>
            </select>

            {/* Score filter */}
            <select
              value={selectedScoreRange}
              onChange={(e) => setSelectedScoreRange(e.target.value)}
              className="py-1 px-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
            >
              <option value="all">All Scores</option>
              <option value="pass">Passing (≥ 80)</option>
              <option value="fail">Needs Improvement (&lt; 80)</option>
              <option value="unscored">Pending Review</option>
            </select>

            {/* Compliance filter toggle */}
            <button
              onClick={() => setComplianceFilter(complianceFilter === true ? 'all' : true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors ${
                complianceFilter === true
                  ? 'bg-rose-50 border-rose-200 text-rose-800 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Compliance Flagged</span>
            </button>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1 px-2 rounded-md border border-slate-200 bg-white text-slate-700"
            >
              <option value="date">Call Date</option>
              <option value="score">Score</option>
              <option value="duration">Duration</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
              title="Toggle sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calls Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Call Details</th>
                <th className="py-3 px-4">Patient (Protected)</th>
                <th className="py-3 px-4">Agent & Team</th>
                <th className="py-3 px-4">Type & Duration</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-medium text-slate-700">No calls matching current filters</p>
                      <p className="text-xs text-slate-400">
                        Try resetting your search query, team, or review status filters.
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedTeam('all');
                          setSelectedType('all');
                          setSelectedStatus('all');
                          setSelectedScoreRange('all');
                          setComplianceFilter('all');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-700 font-medium"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => {
                  const score = call.latestScore;
                  const isCritical = call.latestScorecard?.isCriticalIssue;
                  const isCompliance = call.latestScorecard?.isComplianceFlagged;

                  return (
                    <tr key={call.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Call details */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-900">{call.id}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{new Date(call.callDate).toLocaleDateString()}</span>
                          <span>·</span>
                          <span className="font-mono">{new Date(call.callDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>·</span>
                          <span className="capitalize">{call.direction}</span>
                        </div>
                      </td>

                      {/* Patient Identifier */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {formatDisplayPatient(call.patientName, call.patientId)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          DOB: {hipaaMasking ? '**/**/' + call.patientDob.slice(-4) : call.patientDob}
                        </div>
                      </td>

                      {/* Agent & Team */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{call.agentName}</div>
                        <div className="text-[11px] text-slate-500">{call.agentTeam}</div>
                      </td>

                      {/* Type & Duration */}
                      <td className="py-3 px-4">
                        <div className="capitalize font-medium text-slate-800">{call.callType}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {formatDuration(call.duration)} · {call.language}
                        </div>
                      </td>

                      {/* Outcome */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] font-semibold text-slate-700">
                          {call.disposition}
                        </div>
                        <div className="text-[11px] text-slate-400 capitalize">{call.outcome}</div>
                      </td>

                      {/* Review Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusColor(call.reviewStatus)}`}>
                          {call.reviewStatus}
                        </span>
                        {call.assignedReviewerName && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Rev: {call.assignedReviewerName.split(' ')[0]}
                          </div>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4 text-center">
                        {score !== undefined ? (
                          <div>
                            <div className="flex items-center justify-center gap-1 font-mono font-bold text-sm">
                              <span className={score >= 80 ? 'text-emerald-700' : 'text-rose-700'}>
                                {score}
                              </span>
                              <span className="text-[11px] text-slate-400 font-normal">/100</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              {score >= 80 ? (
                                <span className="text-[10px] text-emerald-700 font-medium">Pass</span>
                              ) : (
                                <span className="text-[10px] text-rose-700 font-medium">Fail</span>
                              )}
                              {isCritical && (
                                <span className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-1 rounded font-mono font-semibold" title="Critical Issue Flagged">
                                  CRITICAL
                                </span>
                              )}
                              {isCompliance && (
                                <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded font-mono" title="Compliance Flagged">
                                  COMPL
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unscored</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick assign button */}
                          <div className="relative">
                            <button
                              onClick={() => setAssigningCallId(assigningCallId === call.id ? null : call.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                              title="Assign Reviewer"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>

                            {assigningCallId === call.id && (
                              <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-30 p-2 text-left">
                                <div className="text-[11px] font-semibold text-slate-500 mb-1 px-1">
                                  Assign QA Reviewer:
                                </div>
                                <div className="space-y-1">
                                  {reviewers.map((rev) => (
                                    <button
                                      key={rev.id}
                                      onClick={() => {
                                        onAssignReviewer(call.id, rev.id, rev.name);
                                        setAssigningCallId(null);
                                      }}
                                      className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 ${
                                        call.assignedReviewerId === rev.id ? 'font-semibold text-teal-700 bg-teal-50' : 'text-slate-700'
                                      }`}
                                    >
                                      {rev.name} ({rev.role})
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Review Call button */}
                          <button
                            onClick={() => onOpenCall(call.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors"
                          >
                            <span>{call.latestScore !== undefined ? 'View & Edit' : 'Review Call'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
