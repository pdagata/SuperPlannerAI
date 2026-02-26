import { useState, useEffect } from 'react';
import { User, Shield, Database, Bell, Tag, UserPlus, Trash2, Link, Bot, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, Project } from '../types';
import { apiFetch } from '../auth';
import CustomFieldsSettings from './CustomFieldsSettings';
import AIConfig from './AIConfig';
import Billing from './Billing';

interface SettingsProps {
  user: UserType;
  projects: Project[];
  selectedProjectId: string;
  onUsersChange: () => void;
}

interface ProjectMember extends UserType { project_role: string; }

export default function Settings({ user, projects, selectedProjectId, onUsersChange }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<string>('users');
  const [allUsers, setAllUsers]           = useState<UserType[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(selectedProjectId !== 'all' ? selectedProjectId : (projects[0]?.id || ''));
  const [loading, setLoading]             = useState(true);
  const [invitations, setInvitations]     = useState<any[]>([]);

  const isSuperAdmin = user.role_id === 'superadmin';
  const isAdmin      = user.role_id === 'admin' || isSuperAdmin;

  const [isAddingUser, setIsAddingUser]   = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isInviting, setIsInviting]       = useState(false);
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteRole, setInviteRole]       = useState('dev');
  const [inviteSent, setInviteSent]       = useState(false);
  const [newUsername, setNewUsername]     = useState('');
  const [newFullName, setNewFullName]     = useState('');
  const [newEmail, setNewEmail]           = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [newRole, setNewRole]             = useState('dev');
  const [selectedUserId, setSelectedUserId] = useState('');

  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({ 'Task Assigned': true, 'Bug Reported': true, 'Test Failed': false, 'AI Insights': true });

  useEffect(() => { fetchAllUsers(); fetchInvitations(); }, []);
  useEffect(() => { if (activeProjectId) fetchProjectMembers(activeProjectId); }, [activeProjectId]);

  const fetchAllUsers = async () => {
    try { setAllUsers(await (await apiFetch(`/api/users`)).json()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const fetchProjectMembers = async (pid: string) => {
    try { const d = await (await apiFetch(`/api/projects/${pid}/members`)).json(); setProjectMembers(d.map((m: any) => ({ ...m, project_role: m.role }))); }
    catch (e) { console.error(e); }
  };
  const fetchInvitations = async () => {
    try { if (isAdmin) setInvitations(await (await apiFetch('/api/invitations')).json()); }
    catch (e) { console.error(e); }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) return;
    const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ id: undefined, username: newUsername, password: newPassword, full_name: newFullName, email: newEmail, role_id: newRole, project_id: activeProjectId }) });
    if (res.ok) { setIsAddingUser(false); setNewUsername(''); setNewPassword(''); setNewFullName(''); setNewEmail(''); await fetchAllUsers(); if (activeProjectId) await fetchProjectMembers(activeProjectId); onUsersChange(); }
  };
  const handleAddMember = async () => {
    if (!selectedUserId || !activeProjectId) return;
    await apiFetch(`/api/projects/${activeProjectId}/members`, { method: 'POST', body: JSON.stringify({ user_id: selectedUserId, role: 'member' }) });
    setIsAddingMember(false); setSelectedUserId(''); await fetchProjectMembers(activeProjectId); onUsersChange();
  };
  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove from project?')) return;
    await apiFetch(`/api/projects/${activeProjectId}/members/${userId}`, { method: 'DELETE' });
    await fetchProjectMembers(activeProjectId); onUsersChange();
  };
  const handleDeleteUser = async (userId: string) => {
    if (userId === user.id || !confirm('Delete user permanently?')) return;
    await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
    await fetchAllUsers(); if (activeProjectId) await fetchProjectMembers(activeProjectId); onUsersChange();
  };
  const handleInvite = async () => {
    if (!inviteEmail) return;
    const res = await apiFetch('/api/invitations', { method: 'POST', body: JSON.stringify({ email: inviteEmail, role_id: inviteRole, project_id: activeProjectId }) });
    if (res.ok) { setInviteSent(true); setInviteEmail(''); setTimeout(() => { setInviteSent(false); setIsInviting(false); }, 2500); await fetchInvitations(); }
  };

  const roleLabel: Record<string, { label: string; color: string }> = {
    superadmin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
    admin:      { label: 'Admin',       color: 'bg-blue-100 text-blue-700' },
    dev:        { label: 'Developer',   color: 'bg-emerald-100 text-emerald-700' },
    qa:         { label: 'QA',          color: 'bg-amber-100 text-amber-700' },
  };

  const nonMembers = allUsers.filter(u => !projectMembers.find(m => m.id === u.id));

  const NAV = [
    { id: 'users',         icon: User,       label: 'Users & Access',     show: true },
    { id: 'invitations',   icon: Link,       label: 'Invitations',        show: isAdmin },
    { id: 'ai-config',     icon: Bot,        label: 'AI Configuration',   show: isAdmin },
    { id: 'billing',       icon: CreditCard, label: 'Billing & Plans',    show: isSuperAdmin },
    { id: 'roles',         icon: Shield,     label: 'Roles',              show: true },
    { id: 'custom-fields', icon: Tag,        label: 'Custom Fields',      show: isAdmin },
    { id: 'notifications', icon: Bell,       label: 'Notifications',      show: true },
    { id: 'database',      icon: Database,   label: 'Database & API',     show: isSuperAdmin },
  ].filter(n => n.show);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-2">Manage users, AI, billing, and workspace settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeSection === id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon size={20}/>{label}
            </button>
          ))}
        </div>

        <div className="md:col-span-2 space-y-6">
          {activeSection === 'ai-config'     && <AIConfig currentUser={user} />}
          {activeSection === 'billing'       && isSuperAdmin && <Billing currentUser={user} />}
          {activeSection === 'custom-fields' && <CustomFieldsSettings />}

          {activeSection === 'users' && (
            <>
              {projects.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900 mb-4">Project</h2>
                  <select value={activeProjectId} onChange={e => setActiveProjectId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {activeProjectId && (
                <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Project Members</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setIsInviting(true)} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 border border-emerald-200">
                        <Link size={14}/> Invite by Email
                      </button>
                      {isSuperAdmin && <button onClick={() => setIsAddingMember(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"><Link size={14}/> Add Existing</button>}
                      <button onClick={() => setIsAddingUser(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"><UserPlus size={14}/> New User</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {loading ? [1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"/>) :
                      projectMembers.length === 0 ? <div className="text-center py-10 text-gray-400">No members yet.</div> :
                      projectMembers.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">{m.username?.substring(0,2)}</div>
                            <div><p className="font-bold text-gray-800">{m.full_name}</p><p className="text-xs text-gray-500">@{m.username} · {m.email}</p></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${roleLabel[m.role_id]?.color || 'bg-gray-100 text-gray-600'}`}>{roleLabel[m.role_id]?.label || m.role_id}</span>
                            {m.id !== user.id && <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 text-gray-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </section>
              )}

              {isSuperAdmin && (
                <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">All Users</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-bold">{allUsers.length} total</span>
                  </div>
                  <div className="space-y-3">
                    {allUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">{u.username?.substring(0,2)}</div>
                          <div><p className="font-bold text-gray-800">{u.full_name}</p><p className="text-xs text-gray-500">@{u.username} · {u.email}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${roleLabel[u.role_id]?.color || 'bg-gray-100 text-gray-600'}`}>{roleLabel[u.role_id]?.label || u.role_id}</span>
                          {u.id !== user.id && <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-gray-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {activeSection === 'invitations' && (
            <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Pending Invitations</h2>
              {invitations.length === 0 ? <div className="text-center py-10 text-gray-400">No pending invitations.</div> :
                <div className="space-y-3">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-bold text-gray-800">{inv.email}</p>
                        <p className="text-xs text-gray-500">Role: {inv.role_id} · Expires: {new Date(inv.expires_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${inv.accepted_at ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inv.accepted_at ? 'Accepted' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              }
            </section>
          )}

          {activeSection === 'roles' && (
            <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Roles & Permissions</h2>
              <div className="space-y-4">
                {[
                  { id: 'superadmin', name: 'Super Admin', desc: 'Full access. Creates projects, assigns admins, manages billing.', perms: ['Create/delete projects','Manage all users','Billing & plans','AI configuration','All data access'] },
                  { id: 'admin',      name: 'Admin',       desc: 'Manages assigned projects and team members.', perms: ['Manage project members','Invite users','Planning access','Custom fields','Project data only'] },
                  { id: 'dev',        name: 'Developer',   desc: 'Works on tasks in assigned projects.', perms: ['View & update tasks','Create bugs/issues','AI assistant','Assigned projects only'] },
                  { id: 'qa',         name: 'QA Engineer', desc: 'Manages tests and reports bugs.', perms: ['Test management','Report bugs','View dashboard','Assigned projects only'] },
                ].map(role => (
                  <div key={role.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{role.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleLabel[role.id]?.color}`}>{roleLabel[role.id]?.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{role.desc}</p>
                    <div className="flex flex-wrap gap-2">{role.perms.map(p => <span key={p} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{p}</span>)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Notifications</h2>
              {[{ title: 'Task Assigned', desc: 'When a task is assigned to me.' }, { title: 'Bug Reported', desc: 'When a new bug is created.' }, { title: 'Test Failed', desc: 'When a test case fails.' }, { title: 'AI Insights', desc: 'Weekly AI-generated insights.' }].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                  <div><p className="font-bold text-gray-800">{item.title}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                  <div onClick={() => setNotifSettings(p => ({ ...p, [item.title]: !p[item.title] }))} className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${notifSettings[item.title] ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notifSettings[item.title] ? 'right-1' : 'left-1'}`}/>
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeSection === 'database' && isSuperAdmin && (
            <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Database & API</h2>
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
                <div className="flex items-center gap-3"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/><p className="font-bold text-emerald-900">Database Connected</p></div>
                <p className="text-sm text-emerald-700 mt-1">{process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite (local)'}</p>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddingUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-xl font-bold">Create New User</h3>
              <div className="space-y-3">
                {[['Username *', newUsername, setNewUsername, 'text'], ['Full Name', newFullName, setNewFullName, 'text'], ['Email', newEmail, setNewEmail, 'email'], ['Password *', newPassword, setNewPassword, 'password']].map(([ph, val, set, type]) => (
                  <input key={ph as string} type={type as string} placeholder={ph as string} value={val as string} onChange={e => (set as any)(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
                ))}
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none">
                  <option value="dev">Developer</option><option value="qa">QA Engineer</option>
                  {isSuperAdmin && <><option value="admin">Administrator</option><option value="superadmin">Super Admin</option></>}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                <button onClick={handleCreateUser} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Create</button>
              </div>
            </motion.div>
          </div>
        )}
        {isAddingMember && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-xl font-bold">Add Existing User</h3>
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none">
                <option value="">Select user...</option>
                {nonMembers.map(u => <option key={u.id} value={u.id}>{u.full_name} (@{u.username})</option>)}
              </select>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsAddingMember(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                <button onClick={handleAddMember} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Add</button>
              </div>
            </motion.div>
          </div>
        )}
        {isInviting && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-xl font-bold">Invite by Email</h3>
              {inviteSent ? (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-center font-bold">✓ Invitation sent!</div>
              ) : (
                <>
                  <input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none">
                    <option value="dev">Developer</option><option value="qa">QA Engineer</option>
                    {isSuperAdmin && <option value="admin">Administrator</option>}
                  </select>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setIsInviting(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                    <button onClick={handleInvite} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Send Invite</button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
