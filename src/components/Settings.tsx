import { useState, useEffect } from 'react';
import { User, Shield, Database, Bell, Save, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '../types';
import CustomFieldsSettings from './CustomFieldsSettings';

interface SettingsProps {
  user: UserType;
}

export default function Settings({ user }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<'users' | 'roles' | 'database' | 'notifications' | 'custom-fields'>('users');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user.role_id === 'superadmin';
  const isAdmin = user.role_id === 'admin' || isSuperAdmin;

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('dev');

  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    'Task Assigned': true,
    'Bug Reported': true,
    'Test Failed': false,
    'AI Insights': true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) return;
    const newUser = {
      id: 'u' + Math.random().toString(36).substr(2, 9),
      username: newUsername,
      password: newPassword,
      full_name: newFullName,
      email: newEmail,
      role_id: newRole
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        fetchUsers();
        setIsAddingUser(false);
        setNewUsername('');
        setNewPassword('');
        setNewFullName('');
        setNewEmail('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const NavButton = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveSection(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
        activeSection === id ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-2">Manage your workspace, users, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation */}
        <div className="space-y-1">
          <NavButton id="users" icon={User} label="User Management" />
          <NavButton id="roles" icon={Shield} label="Roles & Permissions" />
          {isAdmin && <NavButton id="custom-fields" icon={Tag} label="Custom Fields" />}
          <NavButton id="database" icon={Database} label="Database & API" />
          <NavButton id="notifications" icon={Bell} label="Notifications" />
        </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          {activeSection === 'users' && (
            <>
              <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">User Management</h2>
                
                <div className="space-y-4">
                  {loading ? (
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-100 rounded-2xl"></div>
                      ))}
                    </div>
                  ) : (
                    users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
                            {user.username.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{user.full_name}</p>
                            <p className="text-xs text-gray-500">@{user.username} • {user.role_id}</p>
                          </div>
                        </div>
                        <button className="text-indigo-600 text-sm font-bold hover:underline">Edit</button>
                      </div>
                    ))
                  )}
                </div>

                  <button 
                    onClick={() => setIsAddingUser(true)}
                    className="mt-8 w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:border-indigo-200 hover:text-indigo-600 transition-all"
                  >
                    + Add New User
                  </button>
                </section>

                {isAddingUser && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-4"
                    >
                      <h3 className="text-xl font-bold text-gray-900">Add New User</h3>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Username" 
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Full Name" 
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                        />
                        <input 
                          type="email" 
                          placeholder="Email" 
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                        <input 
                          type="password" 
                          placeholder="Password" 
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <select 
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                        >
                          <option value="dev">Developer</option>
                          <option value="qa">QA Engineer</option>
                          <option value="admin">Administrator</option>
                          <option value="superadmin">Super Administrator</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                        <button onClick={handleAddUser} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Create User</button>
                      </div>
                    </motion.div>
                  </div>
                )}

              <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Workspace Preferences</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Workspace Name</label>
                    <input 
                      type="text" 
                      defaultValue="AgileFlow AI Workspace"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div>
                      <p className="font-bold text-indigo-900">AI Features</p>
                      <p className="text-xs text-indigo-700">Enable Gemini-powered task generation and analysis.</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              </section>
            </>
          )}

          {activeSection === 'roles' && (
            <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Roles & Permissions</h2>
              <div className="space-y-6">
                {[
                  { id: 'admin', name: 'Administrator', desc: 'Full access to all features and settings.' },
                  { id: 'dev', name: 'Developer', desc: 'Can manage tasks, bugs, and view dashboard.' },
                  { id: 'qa', name: 'QA Engineer', desc: 'Can manage test suites, cases, and report bugs.' }
                ].map(role => (
                  <div key={role.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{role.name}</h3>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">System Role</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{role.desc}</p>
                    <div className="flex gap-2">
                      <button className="text-xs font-bold text-indigo-600 hover:underline">View Permissions</button>
                      <span className="text-gray-300">|</span>
                      <button className="text-xs font-bold text-gray-400 cursor-not-allowed">Edit Role</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'database' && (
            <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Database & API</h2>
              <div className="space-y-6">
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <h3 className="font-bold text-emerald-900">Database Connected</h3>
                  </div>
                  <p className="text-sm text-emerald-700">Using SQLite (agileflow.db). All data is stored locally.</p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">API Access</h3>
                  <div className="p-4 bg-gray-50 rounded-xl font-mono text-xs text-gray-600 break-all">
                    Endpoint: https://ais-dev-z55kyajo2okqblzx6dyq3e-288043431789.europe-west2.run.app/api
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-bold text-gray-800">API Token</p>
                      <p className="text-xs text-gray-500">Used for external integrations.</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all">
                      Generate New Token
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <button className="text-rose-600 text-sm font-bold hover:underline">
                    Danger Zone: Reset Database
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Notifications</h2>
              <div className="space-y-6">
                {[
                  { title: 'Task Assigned', desc: 'Notify me when a task is assigned to me.' },
                  { title: 'Bug Reported', desc: 'Notify me when a new bug is created.' },
                  { title: 'Test Failed', desc: 'Notify me when a test case fails.' },
                  { title: 'AI Insights', desc: 'Weekly summary of AI-generated project insights.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-bold text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <div 
                      onClick={() => setNotificationSettings(prev => ({ ...prev, [item.title]: !prev[item.title] }))}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${notificationSettings[item.title] ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notificationSettings[item.title] ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'custom-fields' && isAdmin && (
            <CustomFieldsSettings />
          )}
        </div>
      </div>
    </div>
  );
}
