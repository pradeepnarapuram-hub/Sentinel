import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Download, Lock } from 'lucide-react';
import { TranscriptUtterance, Role } from '../types';

interface AudioPlayerProps {
  duration: number; // in seconds
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  transcript: TranscriptUtterance[];
  userRole: Role;
  callId: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  duration,
  currentTime,
  onTimeUpdate,
  transcript,
  userRole,
  callId,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now() - (currentTime * 1000) / playbackRate;
      const tick = () => {
        const elapsedSec = ((performance.now() - startTimeRef.current) / 1000) * playbackRate;
        if (elapsedSec >= duration) {
          onTimeUpdate(duration);
          setIsPlaying(false);
          window.speechSynthesis?.cancel();
        } else {
          onTimeUpdate(elapsedSec);
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackRate, duration]);

  // Speech synthesis support for realistic listening
  useEffect(() => {
    if (isPlaying && 'speechSynthesis' in window) {
      // Find the current utterance based on currentTime
      const currentUtterance = transcript.find(
        (t, idx) =>
          currentTime >= t.timestamp &&
          (idx === transcript.length - 1 || currentTime < transcript[idx + 1].timestamp)
      );

      if (currentUtterance && (!speechUtteranceRef.current || speechUtteranceRef.current.text !== currentUtterance.text)) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(currentUtterance.text);
        utt.rate = playbackRate;
        utt.volume = isMuted ? 0 : volume;
        speechUtteranceRef.current = utt;
        window.speechSynthesis.speak(utt);
      }
    } else {
      window.speechSynthesis?.cancel();
      speechUtteranceRef.current = null;
    }
  }, [isPlaying, Math.floor(currentTime), isMuted, volume, playbackRate]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      window.speechSynthesis?.pause();
    } else {
      if (currentTime >= duration) {
        onTimeUpdate(0);
      }
      setIsPlaying(true);
      if (window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onTimeUpdate(newTime);
    window.speechSynthesis?.cancel();
    speechUtteranceRef.current = null;
    if (isPlaying) {
      startTimeRef.current = performance.now() - (newTime * 1000) / playbackRate;
    }
  };

  const skipSeconds = (delta: number) => {
    const nextTime = Math.max(0, Math.min(duration, currentTime + delta));
    onTimeUpdate(nextTime);
    window.speechSynthesis?.cancel();
    speechUtteranceRef.current = null;
    if (isPlaying) {
      startTimeRef.current = performance.now() - (nextTime * 1000) / playbackRate;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Generate deterministic realistic audio waveform bars
  const waveformBars = Array.from({ length: 48 }, (_, i) => {
    const seed = (Math.sin(i * 0.7 + callId.length) + 1.2) * 20;
    const height = Math.min(100, Math.max(15, seed * 2.2));
    const isPast = (i / 48) * duration <= currentTime;
    return { height, isPast };
  });

  const canDownloadAudio = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800">
      {/* Top row: Call Audio Status & Restrictions */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-200">Encrypted HIPAA Stream (256-bit AES)</span>
          <span className="text-slate-600">·</span>
          <span>Dual-channel stereo audio</span>
        </div>

        <div className="flex items-center gap-3">
          {canDownloadAudio ? (
            <button
              onClick={() => {
                alert(`Audio file export initiated for QA Audit Record: ${callId}.wav (Encrypted Package)`);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Download recording (QA Manager & Admin permission)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Audio</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-slate-500 text-xs cursor-not-allowed" title="Agent audio downloads restricted by HIPAA clinical governance policy">
              <Lock className="w-3.5 h-3.5" />
              <span>Download Restricted</span>
            </div>
          )}
        </div>
      </div>

      {/* Waveform graphic visualization */}
      <div className="relative h-14 bg-slate-950/70 rounded-lg p-2 mb-3 flex items-end justify-between gap-1 overflow-hidden">
        {waveformBars.map((bar, i) => (
          <div
            key={i}
            className={`w-full rounded-t-sm transition-all duration-75 ${
              bar.isPast ? 'bg-sky-400' : 'bg-slate-700 hover:bg-slate-600'
            } ${isPlaying && bar.isPast ? 'opacity-100' : 'opacity-70'}`}
            style={{
              height: `${isPlaying && bar.isPast ? Math.min(100, bar.height * (0.85 + Math.random() * 0.3)) : bar.height}%`,
            }}
          />
        ))}

        {/* Current playback position indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Timeline Scrubber */}
      <div className="space-y-1 mb-3">
        <input
          type="range"
          min="0"
          max={duration}
          step="0.5"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:bg-slate-600 transition-colors"
        />
        <div className="flex justify-between text-xs text-slate-400 font-mono tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span className="text-slate-500">Duration: {formatTime(duration)}</span>
        </div>
      </div>

      {/* Player Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => skipSeconds(-5)}
            className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="p-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shadow-sm transition-transform active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => skipSeconds(5)}
            className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Playback speed buttons */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 ml-2">
            {[0.75, 1, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                  playbackRate === rate ? 'bg-sky-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Audio Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
