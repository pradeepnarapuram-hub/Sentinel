import React, { useState, useMemo, useRef } from 'react';
import { TranscriptUtterance, AIReviewResult } from '../types';
import {
  HighlightCategory,
  HighlightMarker,
  CATEGORY_CONFIG,
  findHighlightMatches,
  MatchSpan,
} from '../utils/transcriptHighlighter';
import {
  Sparkles,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Info,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Smile,
  Activity,
} from 'lucide-react';

interface TranscriptViewerProps {
  transcript: TranscriptUtterance[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  aiResult?: AIReviewResult | null;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  currentTime,
  onSeek,
  aiResult,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoHighlight, setAutoHighlight] = useState<boolean>(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<HighlightCategory | 'all'>('all');
  const [activeTooltip, setActiveTooltip] = useState<{
    marker: HighlightMarker;
    x: number;
    y: number;
    timestamp: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Convert AI key moments & highlighted phrases into extra markers
  const extraAiMarkers = useMemo<HighlightMarker[]>(() => {
    if (!aiResult) return [];
    const markers: HighlightMarker[] = [];

    if (aiResult.keyMoments) {
      aiResult.keyMoments.forEach((km) => {
        if (km.quote && km.quote.length > 4) {
          markers.push({
            phrase: km.quote,
            category: 'ai_moment',
            label: `AI Key Moment: ${km.label}`,
            explanation: `AI-identified critical milestone: "${km.label}" (${km.type})`,
            severity: km.type === 'risk' ? 'high' : 'info',
          });
        }
      });
    }

    if (aiResult.highlightedPhrases) {
      aiResult.highlightedPhrases.forEach((hp) => {
        markers.push({
          phrase: hp.phrase,
          category: (hp.category as HighlightCategory) || 'compliance_risk',
          label: hp.category.replace(/_/g, ' ').toUpperCase(),
          explanation: hp.explanation,
          severity: hp.category.includes('risk') || hp.category.includes('emergency') ? 'high' : 'info',
        });
      });
    }

    return markers;
  }, [aiResult]);

  // Compute total highlights found in the transcript
  const allHighlightsSummary = useMemo(() => {
    let count = 0;
    const catCounts: Record<string, number> = {
      compliance_verified: 0,
      compliance_risk: 0,
      clinical_emergency: 0,
      patient_distress: 0,
      patient_relief: 0,
      ai_moment: 0,
    };

    transcript.forEach((u) => {
      const matches = findHighlightMatches(u.text, extraAiMarkers, 'all');
      count += matches.length;
      matches.forEach((m) => {
        catCounts[m.marker.category] = (catCounts[m.marker.category] || 0) + 1;
      });
    });

    return { total: count, catCounts };
  }, [transcript, extraAiMarkers]);

  // Navigation across all highlighted phrases
  const allMatchTimestamps = useMemo(() => {
    const list: { timestamp: number; marker: HighlightMarker }[] = [];
    transcript.forEach((u) => {
      const matches = findHighlightMatches(u.text, extraAiMarkers, activeCategoryFilter);
      matches.forEach((m) => {
        list.push({ timestamp: u.timestamp, marker: m.marker });
      });
    });
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [transcript, extraAiMarkers, activeCategoryFilter]);

  const jumpToNextHighlight = () => {
    const next = allMatchTimestamps.find((item) => item.timestamp > currentTime + 1);
    if (next) {
      onSeek(next.timestamp);
    } else if (allMatchTimestamps.length > 0) {
      onSeek(allMatchTimestamps[0].timestamp);
    }
  };

  const jumpToPrevHighlight = () => {
    const prevList = allMatchTimestamps.filter((item) => item.timestamp < currentTime - 1);
    if (prevList.length > 0) {
      onSeek(prevList[prevList.length - 1].timestamp);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Render text with highlight spans
  const renderTextWithHighlights = (text: string, utteranceTimestamp: number) => {
    if (!autoHighlight) {
      // If search is active, simple search highlight
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
          <>
            {parts.map((part, i) =>
              part.toLowerCase() === query ? (
                <mark key={i} className="bg-yellow-200 text-slate-950 px-0.5 rounded">
                  {part}
                </mark>
              ) : (
                part
              )
            )}
          </>
        );
      }
      return text;
    }

    const matches = findHighlightMatches(text, extraAiMarkers, activeCategoryFilter);
    if (matches.length === 0) {
      return text;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match, idx) => {
      // Text before match
      if (match.start > lastIndex) {
        elements.push(text.slice(lastIndex, match.start));
      }

      const matchText = text.slice(match.start, match.end);
      const conf = CATEGORY_CONFIG[match.marker.category] || CATEGORY_CONFIG.compliance_verified;

      elements.push(
        <span
          key={`highlight-${idx}`}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setActiveTooltip({
              marker: match.marker,
              x: rect.left,
              y: rect.top - 8,
              timestamp: utteranceTimestamp,
            });
          }}
          onMouseLeave={() => setActiveTooltip(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(utteranceTimestamp);
          }}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all inline-flex items-center gap-1 ${conf.bgClass} ${conf.borderClass} hover:opacity-90 shadow-2xs`}
          title={`${match.marker.label}: ${match.marker.explanation}`}
        >
          <span className="text-[10px] select-none">{conf.icon}</span>
          <span>{matchText}</span>
        </span>
      );

      lastIndex = match.end;
    });

    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return elements;
  };

  const filteredTranscript = transcript.filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return t.text.toLowerCase().includes(q) || t.speaker.toLowerCase().includes(q);
  });

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[600px] relative"
    >
      {/* Header bar: Title, Search & Auto-Highlight Toggle */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Interactive Transcript</span>
            {autoHighlight && allHighlightsSummary.total > 0 && (
              <span className="font-mono text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>{allHighlightsSummary.total} markers</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-highlight toggle */}
            <button
              onClick={() => setAutoHighlight(!autoHighlight)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                autoHighlight
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Toggle auto-highlighting of compliance keywords and critical sentiment"
            >
              {autoHighlight ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Auto-Highlight: {autoHighlight ? 'ON' : 'OFF'}</span>
            </button>

            {/* Jump between highlights */}
            {autoHighlight && allMatchTimestamps.length > 0 && (
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={jumpToPrevHighlight}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                  title="Jump to previous highlight"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={jumpToNextHighlight}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                  title="Jump to next highlight"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search input + Category Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter words..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          {/* Category filter pills */}
          {autoHighlight && (
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] py-0.5">
              <button
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-colors ${
                  activeCategoryFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({allHighlightsSummary.total})
              </button>

              <button
                onClick={() => setActiveCategoryFilter('compliance_verified')}
                className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-colors flex items-center gap-1 ${
                  activeCategoryFilter === 'compliance_verified'
                    ? 'bg-teal-700 text-white'
                    : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                }`}
                title="HIPAA identity verification & privacy disclaimers"
              >
                <span>🛡️ HIPAA Pass</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({allHighlightsSummary.catCounts.compliance_verified || 0})
                </span>
              </button>

              <button
                onClick={() => setActiveCategoryFilter('compliance_risk')}
                className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-colors flex items-center gap-1 ${
                  activeCategoryFilter === 'compliance_risk'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                }`}
                title="Missing verification, disclosure risks & billing grievances"
              >
                <span>⚠️ Compliance Risk</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({allHighlightsSummary.catCounts.compliance_risk || 0})
                </span>
              </button>

              <button
                onClick={() => setActiveCategoryFilter('clinical_emergency')}
                className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-colors flex items-center gap-1 ${
                  activeCategoryFilter === 'clinical_emergency'
                    ? 'bg-red-700 text-white'
                    : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'
                }`}
                title="Chest pain, 911 directives, elevated labs & clinical triage"
              >
                <span>🚨 Clinical Risk</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({allHighlightsSummary.catCounts.clinical_emergency || 0})
                </span>
              </button>

              <button
                onClick={() => setActiveCategoryFilter('patient_distress')}
                className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-colors flex items-center gap-1 ${
                  activeCategoryFilter === 'patient_distress'
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
                title="Patient anxiety, distress, fear of lapse"
              >
                <span>⚡ Distress</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({allHighlightsSummary.catCounts.patient_distress || 0})
                </span>
              </button>

              <button
                onClick={() => setActiveCategoryFilter('patient_relief')}
                className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-colors flex items-center gap-1 ${
                  activeCategoryFilter === 'patient_relief'
                    ? 'bg-sky-700 text-white'
                    : 'bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100'
                }`}
                title="Patient relief, satisfaction & positive resolution"
              >
                <span>✨ Relief</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({allHighlightsSummary.catCounts.patient_relief || 0})
                </span>
              </button>

              {allHighlightsSummary.catCounts.ai_moment > 0 && (
                <button
                  onClick={() => setActiveCategoryFilter('ai_moment')}
                  className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-colors flex items-center gap-1 ${
                    activeCategoryFilter === 'ai_moment'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                  title="Key milestones identified by Gemini AI"
                >
                  <span>🤖 AI Moments</span>
                  <span className="font-mono text-[10px] opacity-80">
                    ({allHighlightsSummary.catCounts.ai_moment || 0})
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transcript Utterances List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 divide-y divide-slate-100">
        {filteredTranscript.map((utterance) => {
          const isActive =
            currentTime >= utterance.timestamp &&
            currentTime < utterance.timestamp + 8;

          const isAgent = utterance.speaker === 'Agent';

          return (
            <div
              key={utterance.id}
              onClick={() => onSeek(utterance.timestamp)}
              className={`pt-2.5 cursor-pointer rounded-lg px-2 transition-colors ${
                isActive ? 'bg-sky-50/80 border border-sky-200' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAgent ? 'bg-teal-600' : 'bg-slate-600'
                    }`}
                  />
                  <span className={isAgent ? 'text-teal-900' : 'text-slate-800'}>
                    {utterance.speaker}
                  </span>
                </div>

                <span className="font-mono text-[11px] text-slate-400 hover:text-sky-600 underline">
                  {formatTime(utterance.timestamp)}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed pl-3.5">
                {renderTextWithHighlights(utterance.text, utterance.timestamp)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Micro-Tooltip Popup when hovering a highlight */}
      {activeTooltip && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg shadow-xl p-2.5 max-w-xs pointer-events-none transform -translate-x-1/2 -translate-y-full border border-slate-700"
          style={{
            left: `${activeTooltip.x + 40}px`,
            top: `${activeTooltip.y - 12}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1.5">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <span>{CATEGORY_CONFIG[activeTooltip.marker.category]?.icon}</span>
              <span>{activeTooltip.marker.label}</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {formatTime(activeTooltip.timestamp)}
            </span>
          </div>
          <p className="text-[11px] text-slate-200 leading-tight">
            {activeTooltip.marker.explanation}
          </p>
          <div className="text-[10px] text-sky-400 mt-1 font-mono">
            Click to seek audio to this timestamp
          </div>
        </div>
      )}
    </div>
  );
};
