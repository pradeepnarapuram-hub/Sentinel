import React from 'react';
import { User, Role } from '../types';
import { Shield, ChevronDown, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  allUsers: User[];
  activeView: string;
  onNavigate: (view: string) => void;
  pendingReviewsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectUser,
  allUsers,
  activeView,
  onNavigate,
  pendingReviewsCount,
}) => {
  const isAgent = currentUser.role === 'agent';
  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5 text-teal-100" />
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate(isAgent ? 'agent-portal' : 'dashboard');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
            >
              HealthQA Sentinel
            </a>
          </div>

          {/* Zone 2: 4–5 single-line clean text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {!isAgent ? (
              <>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`transition-colors whitespace-nowrap py-1 ${
                    activeView === 'dashboard'
                      ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => onNavigate('call-queue')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap py-1 ${
                    activeView === 'call-queue'
                      ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <span>Call Queue</span>
                  {pendingReviewsCount > 0 && (
                    <span className="text-xs font-mono font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {pendingReviewsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onNavigate('daily-report')}
                  className={`transition-colors whitespace-nowrap py-1 ${
                    activeView === 'daily-report'
                      ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Daily Report
                </button>

                <button
                  onClick={() => onNavigate('weekly-report')}
                  className={`transition-colors whitespace-nowrap py-1 ${
                    activeView === 'weekly-report'
                      ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Weekly Report
                </button>

                {isAdmin && (
                  <button
                    onClick={() => onNavigate('admin-settings')}
                    className={`transition-colors whitespace-nowrap py-1 ${
                      activeView === 'admin-settings'
                        ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Admin & Rubrics
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('agent-portal')}
                  className={`transition-colors whitespace-nowrap py-1 ${
                    activeView === 'agent-portal'
                      ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  My Calls & Scores
                </button>
                <button
                  onClick={() => onNavigate('agent-actions')}
                  className={`transition-colors whitespace-nowrap py-1 ${
                    activeView === 'agent-actions'
                      ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Action Items & Coaching
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: 1 primary action / Role Selector & User Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group">
              <button
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 text-left transition-colors"
                title="Switch active role / persona"
              >
                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-semibold flex items-center justify-center text-xs">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="hidden sm:block text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 font-bold px-1 py-0.2 bg-teal-50 border border-teal-200 rounded">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] truncate max-w-[140px]">{currentUser.team}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>

              {/* Persona Switcher Dropdown */}
              <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 p-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Switch Active Role & Persona
                </div>
                <div className="space-y-1">
                  {allUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onSelectUser(user)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                        user.id === currentUser.id
                          ? 'bg-teal-50 text-teal-900 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {user.title} · <span className="font-mono text-teal-700 uppercase">{user.role}</span>
                        </div>
                      </div>
                      {user.id === currentUser.id && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
