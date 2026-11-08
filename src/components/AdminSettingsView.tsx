import React, { useState } from 'react';
import { RubricCategory, User, AuditLogEntry } from '../types';
import {
  Settings,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Search,
  KeyRound,
  Lock,
  UserCheck,
  UserX,
  History,
} from 'lucide-react';

interface AdminSettingsViewProps {
  rubricCategories: RubricCategory[];
  onUpdateRubricCategories: (categories: RubricCategory[]) => void;
  passThreshold: number;
  onUpdatePassThreshold: (threshold: number) => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  auditLogs: AuditLogEntry[];
  hipaaMasking: boolean;
  onToggleHipaaMasking: (enabled: boolean) => void;
  onLogAudit: (action: string, entityId: string, details: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  rubricCategories,
  onUpdateRubricCategories,
  passThreshold,
  onUpdatePassThreshold,
  users,
  onUpdateUsers,
  auditLogs,
  hipaaMasking,
  onToggleHipaaMasking,
  onLogAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'rubric' | 'users' | 'hipaa' | 'audit'>('rubric');

  // Rubric local state
  const [localCategories, setLocalCategories] = useState<RubricCategory[]>(rubricCategories);
  const [localThreshold, setLocalThreshold] = useState<number>(passThreshold);
  const [rubricSaveSuccess, setRubricSaveSuccess] = useState<boolean>(false);

  // New category inputs
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newCatWeight, setNewCatWeight] = useState<number>(10);

  // Users state
  const [userList, setUserList] = useState<User[]>(users);
  const [userSearch, setUserSearch] = useState<string>('');
  const [selectedUserForReset, setSelectedUserForReset] = useState<User | null>(null);

  // New user form modal
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('agent');
  const [newUserTeam, setNewUserTeam] = useState<string>('General Scheduling');
  const [newUserTitle, setNewUserTitle] = useState<string>('Patient Care Representative');

  // Retention setting
  const [retentionDays, setRetentionDays] = useState<number>(365);

  // Audit search
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Total weight calculation
  const totalWeight = localCategories.reduce((acc, c) => acc + c.defaultWeight, 0);

  const handleSaveRubric = () => {
    onUpdateRubricCategories(localCategories);
    onUpdatePassThreshold(localThreshold);
    onLogAudit(
      'RUBRIC_CONFIG_UPDATED',
      'Rubric_V2',
      `Rubric updated with ${localCategories.length} categories, total weight ${totalWeight}%, pass threshold ${localThreshold}`
    );
    setRubricSaveSuccess(true);
    setTimeout(() => setRubricSaveSuccess(false), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: RubricCategory = {
      id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      measureDescription: newCatDesc.trim() || 'Evaluates compliance with clinical standards.',
      defaultWeight: Number(newCatWeight),
    };

    setLocalCategories([...localCategories, newCat]);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatWeight(10);
  };

  const handleRemoveCategory = (id: string) => {
    setLocalCategories(localCategories.filter((c) => c.id !== id));
  };

  const handleToggleUserActive = (userId: string) => {
    const updated = userList.map((u) => {
      if (u.id === userId) {
        const nextState = !u.isActive;
        onLogAudit(
          'USER_STATUS_TOGGLED',
          u.id,
          `User ${u.name} status updated to ${nextState ? 'Active' : 'Inactive'}`
        );
        return { ...u, isActive: nextState };
      }
      return u;
    });
    setUserList(updated);
    onUpdateUsers(updated);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      team: newUserTeam,
      isActive: true,
      title: newUserTitle,
    };

    const updated = [...userList, newUser];
    setUserList(updated);
    onUpdateUsers(updated);
    onLogAudit('USER_STATUS_TOGGLED', newUser.id, `Created new user ${newUser.name} with role ${newUser.role}`);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
  };

  const filteredUsers = userList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.team.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(
    (a) =>
      a.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.entityId.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Administration & QA Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rubric category weighting, user role-based access control, HIPAA safe harbor rules, and audit trail.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('rubric')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'rubric' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scoring Rubric & Weights
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Users & Roles ({userList.length})
          </button>
          <button
            onClick={() => setActiveTab('hipaa')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'hipaa' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HIPAA & Governance
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SCORING RUBRIC & WEIGHTS */}
      {activeTab === 'rubric' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Configurable Scoring Rubric</h2>
              <p className="text-xs text-slate-500">
                Adjust category weights and target pass thresholds. Weights automatically calculate the final 100-point score.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500">Total Weight:</span>
                <span className={`font-bold ${totalWeight === 100 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {totalWeight}%
                </span>
                {totalWeight !== 100 && (
                  <span className="text-rose-700 text-[10px]">(Must equal 100%)</span>
                )}
              </div>

              <button
                onClick={handleSaveRubric}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Rubric Configuration</span>
              </button>
            </div>
          </div>

          {rubricSaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Rubric weights and pass threshold successfully saved & logged in audit history!</span>
            </div>
          )}

          {/* Pass Threshold Setting */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900">Standard Pass Threshold (out of 100)</div>
              <p className="text-slate-500 mt-0.5">Calls scoring at or above this threshold receive a passing grade.</p>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <input
                type="number"
                min="50"
                max="95"
                value={localThreshold}
                onChange={(e) => setLocalThreshold(Number(e.target.value))}
                className="w-20 px-2 py-1 text-center text-sm font-bold rounded border border-slate-300 bg-white"
              />
              <span className="text-slate-400">/ 100 Points</span>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Rubric Categories</div>

            {localCategories.map((cat, index) => (
              <div
                key={cat.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <span>{index + 1}. {cat.name}</span>
                  </div>
                  <input
                    type="text"
                    value={cat.measureDescription}
                    onChange={(e) => {
                      const updated = [...localCategories];
                      updated[index].measureDescription = e.target.value;
                      setLocalCategories(updated);
                    }}
                    className="w-full text-xs text-slate-600 p-1 border border-slate-200 rounded focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400 text-xs">Weight:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={cat.defaultWeight}
                      onChange={(e) => {
                        const updated = [...localCategories];
                        updated[index].defaultWeight = Number(e.target.value);
                        setLocalCategories(updated);
                      }}
                      className="w-16 px-2 py-1 text-center font-bold text-xs rounded border border-slate-300"
                    />
                    <span className="text-slate-500 font-semibold">%</span>
                  </div>

                  <button
                    onClick={() => handleRemoveCategory(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Category Form */}
          <div className="pt-4 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-800 mb-2">+ Add Custom Rubric Category</div>
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Category Name (e.g. De-escalation & Restraint)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                />
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="What it measures (diagnostic criteria)"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newCatWeight}
                  onChange={(e) => setNewCatWeight(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 text-center"
                />
                <span className="text-slate-500">%</span>
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-xs shadow-xs"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">User & Role Management</h2>
              <p className="text-xs text-slate-500">
                Configure role-based access: Admin, Manager/QA Reviewer, and Agent permissions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 text-xs rounded border border-slate-300"
                />
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                + Add User
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Team</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div>{user.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{user.title}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{user.email}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs uppercase font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{user.team}</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleUserActive(user.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {user.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedUserForReset(user);
                          alert(`Secure Password Reset Link dispatched to ${user.email} (Audit Record Logged)`);
                          onLogAudit('USER_STATUS_TOGGLED', user.id, `Password reset token initiated for ${user.email}`);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 text-xs inline-flex items-center gap-1 font-medium"
                        title="Send Password Reset"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Password</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HIPAA & GOVERNANCE */}
      {activeTab === 'hipaa' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="font-bold text-slate-900 text-sm">HIPAA & Clinical Data Governance</h2>
            <p className="text-slate-500 mt-0.5">
              Configure Protected Health Information (PHI) safe harbor masking and recording storage retention.
            </p>
          </div>

          {/* Masking Toggle */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>HIPAA Safe Harbor Patient Masking</span>
              </div>
              <p className="text-slate-500 mt-1 max-w-lg">
                When enabled, patient full names are masked (e.g. "E. V****"), dates of birth show only the birth year (**/**/1958), and telephone numbers conceal middle digits.
              </p>
            </div>

            <button
              onClick={() => onToggleHipaaMasking(!hipaaMasking)}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-xs ${
                hipaaMasking
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {hipaaMasking ? 'Masking Enabled (HIPAA)' : 'Full View (Testing)'}
            </button>
          </div>

          {/* Audio Download Restriction */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-600" />
                <span>Audio Recording Download Permissions</span>
              </div>
              <p className="text-slate-500 mt-1 max-w-lg">
                Raw audio recording downloads are strictly restricted to QA Managers and System Admins. Agents are allowed encrypted in-app streaming only.
              </p>
            </div>

            <span className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold">
              Enforced by RBAC
            </span>
          </div>

          {/* Data Retention Period */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900">Audio Recording & Transcript Retention Policy</div>
              <p className="text-slate-500 mt-1">Automatic archival and purge cadence for clinical contact logs.</p>
            </div>

            <select
              value={retentionDays}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRetentionDays(val);
                onLogAudit('RUBRIC_CONFIG_UPDATED', 'Retention_Policy', `Retention updated to ${val} days`);
              }}
              className="px-3 py-1.5 rounded border border-slate-300 font-mono font-semibold text-slate-800 bg-white"
            >
              <option value={90}>90 Days (Acute Triage)</option>
              <option value={180}>180 Days (Semi-Annual)</option>
              <option value={365}>1 Year (Default Clinical)</option>
              <option value={2555}>7 Years (Full HIPAA Record Retention)</option>
            </select>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Regulatory Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all QA score submissions, feedback edits, report exports, and user permissions.
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter audit logs..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs rounded border border-slate-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">User & Role</th>
                  <th className="py-2 px-3">Action Type</th>
                  <th className="py-2 px-3">Entity ID</th>
                  <th className="py-2 px-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {log.userName}{' '}
                      <span className="text-[10px] font-mono text-slate-400">({log.userRole})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{log.entityId}</td>
                    <td className="py-2.5 px-3 text-slate-600 leading-snug">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Add New System User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Blake"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Email Address:</label>
                <input
                  type="email"
                  required
                  placeholder="j.blake@medqa-health.org"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">System Role:</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    <option value="agent">Agent</option>
                    <option value="manager">Manager / QA</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Care Team:</label>
                  <select
                    value={newUserTeam}
                    onChange={(e) => setNewUserTeam(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    <option value="Cardiology Care Access">Cardiology Care Access</option>
                    <option value="Pharmacy & Prior-Auth">Pharmacy & Prior-Auth</option>
                    <option value="General Scheduling">General Scheduling</option>
                    <option value="Patient Financial Services">Patient Financial Services</option>
                    <option value="Patient Services QA">Patient Services QA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Title:</label>
                <input
                  type="text"
                  value={newUserTitle}
                  onChange={(e) => setNewUserTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-semibold shadow-xs"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
