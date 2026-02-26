import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Kanban, MessageSquare, Settings, Search, Bell, Zap, Bug, Beaker, LogOut, Layers, BookOpen, AlertCircle, Folder, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import AIAssistant from './components/AIAssistant';
import TestManagement from './components/TestManagement';
import ProjectManagement from './components/ProjectManagement';
import Planning from './components/Planning';
import SettingsView from './components/Settings';
import Login from './components/Login';
import { Task, Column, User as UserType, Epic, Feature, Sprint, Project } from './types';
import { authStorage, apiFetch } from './auth';

type TabType = 'dashboard' | 'board' | 'ai' | 'bugs' | 'testing' | 'settings' | 'planning' | 'stories' | 'issues' | 'projects';

export default function App() {
  // Try to restore session from localStorage
  const [user, setUser] = useState<UserType | null>(() => authStorage.getUser<UserType>());
  const [activeTab, setActiveTab] = useState<TabType>('board');
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [columns, setColumns]   = useState<Column[]>([]);
  const [users, setUsers]       = useState<UserType[]>([]);
  const [epics, setEpics]       = useState<Epic[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [sprints, setSprints]   = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading]   = useState(true);

  const isSuperAdmin = user?.role_id === 'superadmin';
  const isAdmin      = user?.role_id === 'admin' || isSuperAdmin;

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [colsRes, tasksRes, usersRes, epicsRes, featuresRes, sprintsRes, projectsRes] = await Promise.all([
        apiFetch('/api/columns'),
        apiFetch('/api/tasks'),
        apiFetch('/api/users'),
        apiFetch('/api/epics'),
        apiFetch('/api/features'),
        apiFetch('/api/sprints'),
        apiFetch('/api/projects'),
      ]);
      setColumns(await colsRes.json());
      setTasks(await tasksRes.json());
      setUsers(await usersRes.json());
      setEpics(await epicsRes.json());
      setFeatures(await featuresRes.json());
      setSprints(await sprintsRes.json());
      setProjects(await projectsRes.json());
    } catch (e) { console.error('fetchData error:', e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (user) fetchData(); else setLoading(false); }, [user]);

  const handleLogout = async () => {
    try { await apiFetch('/api/logout', { method: 'POST' }); } catch {}
    authStorage.clear();
    localStorage.removeItem('agileflow_refresh');
    setUser(null);
    setTasks([]); setColumns([]); setUsers([]); setEpics([]); setFeatures([]); setSprints([]); setProjects([]);
  };

  if (!user) return <Login onLogin={setUser} />;

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addTask = async (task: Task) => {
    await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(task) });
    setTasks(prev => [...prev, task]);
  };
  const updateTask = async (id: string, updates: Partial<Task>) => {
    await apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  const deleteTask = async (id: string) => {
    await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
  };
  const deleteEpic = async (id: string) => {
    await apiFetch(`/api/epics/${id}`, { method: 'DELETE' });
    setEpics(prev => prev.filter(e => e.id !== id));
  };
  const deleteFeature = async (id: string) => {
    await apiFetch(`/api/features/${id}`, { method: 'DELETE' });
    setFeatures(prev => prev.filter(f => f.id !== id));
  };
  const deleteSprint = async (id: string) => {
    await apiFetch(`/api/sprints/${id}`, { method: 'DELETE' });
    setSprints(prev => prev.filter(s => s.id !== id));
  };
  const addProject = async (project: Project) => {
    await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(project) });
    const res = await apiFetch('/api/projects');
    setProjects(await res.json());
  };
  const deleteProject = async (id: string) => {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredEpics    = selectedProjectId === 'all' ? epics : epics.filter(e => e.project_id === selectedProjectId);
  const filteredFeatures = selectedProjectId === 'all' ? features : features.filter(f => epics.find(e => e.id === f.epic_id)?.project_id === selectedProjectId);
  const filteredTasks    = selectedProjectId === 'all' ? tasks : tasks.filter(t => {
    if (t.epic_id) return epics.find(e => e.id === t.epic_id)?.project_id === selectedProjectId;
    if (t.feature_id) { const f = features.find(f => f.id === t.feature_id); return epics.find(e => e.id === f?.epic_id)?.project_id === selectedProjectId; }
    return false;
  });
  const filteredSprints = selectedProjectId === 'all' ? sprints : sprints.filter(s => s.project_id === selectedProjectId);

  // ── Nav ───────────────────────────────────────────────────────────────────

  const navItems = [
    { id: 'dashboard' as TabType, icon: LayoutDashboard, label: 'Dashboard',    show: true },
    { id: 'projects'  as TabType, icon: Folder,          label: 'Projects',      show: isSuperAdmin },
    { id: 'board'     as TabType, icon: Kanban,          label: 'Kanban Board',  show: true },
    { id: 'planning'  as TabType, icon: Layers,          label: 'Planning',      show: isAdmin },
    { id: 'stories'   as TabType, icon: BookOpen,        label: 'User Stories',  show: true },
    { id: 'bugs'      as TabType, icon: Bug,             label: 'Bug Tracking',  show: true },
    { id: 'issues'    as TabType, icon: AlertCircle,     label: 'Issues',        show: true },
    { id: 'ai'        as TabType, icon: MessageSquare,   label: 'AI Assistant',  show: true },
    { id: 'testing'   as TabType, icon: Beaker,          label: 'Testing',       show: true },
  ];

  const roleColor: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    dev: 'bg-emerald-100 text-emerald-700',
    qa: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><Zap className="text-white w-5 h-5" /></div>
          <h1 className="text-xl font-bold tracking-tight">AgileFlow AI</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.filter(n => n.show).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon size={20} /><span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-1">
          {isAdmin && (
            <button onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Users size={20} /><span className="font-medium">User Management</span>
            </button>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <LogOut size={20} /><span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search tasks, projects..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-2">
              <Folder size={18} className="text-gray-400" />
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-gray-50 border-none text-sm font-bold text-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                <option value="all">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{user.full_name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor[user.role_id] || 'bg-gray-100 text-gray-600'}`}>{user.role_name}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
                {user.username.substring(0, 2)}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="h-full">
                {activeTab === 'dashboard' && <Dashboard tasks={filteredTasks} users={users} sprints={filteredSprints} epics={filteredEpics} />}
                {activeTab === 'board'     && <KanbanBoard tasks={filteredTasks.filter(t => t.type === 'task' as any)} columns={columns} users={users} epics={filteredEpics} features={filteredFeatures} sprints={filteredSprints} onUpdateTask={updateTask} onAddTask={(t) => addTask({ ...t, type: 'task' })} onDeleteTask={deleteTask} currentUser={user} />}
                {activeTab === 'stories'  && <KanbanBoard tasks={filteredTasks.filter(t => t.type === 'story')} columns={columns} users={users} epics={filteredEpics} features={filteredFeatures} sprints={filteredSprints} onUpdateTask={updateTask} onAddTask={(t) => addTask({ ...t, type: 'story' })} onDeleteTask={deleteTask} currentUser={user} />}
                {activeTab === 'bugs'     && <KanbanBoard tasks={filteredTasks.filter(t => t.type === 'bug')} columns={columns} users={users} epics={filteredEpics} features={filteredFeatures} sprints={filteredSprints} onUpdateTask={updateTask} onAddTask={(t) => addTask({ ...t, type: 'bug' })} onDeleteTask={deleteTask} currentUser={user} />}
                {activeTab === 'issues'   && <KanbanBoard tasks={filteredTasks.filter(t => t.type === 'issue')} columns={columns} users={users} epics={filteredEpics} features={filteredFeatures} sprints={filteredSprints} onUpdateTask={updateTask} onAddTask={(t) => addTask({ ...t, type: 'issue' })} onDeleteTask={deleteTask} currentUser={user} />}
                {activeTab === 'ai'       && <AIAssistant tasks={filteredTasks} onAddTask={addTask} />}
                {activeTab === 'testing'  && <TestManagement />}
                {activeTab === 'projects' && isSuperAdmin && <ProjectManagement projects={projects} users={users} currentUser={user} onAddProject={addProject} onDeleteProject={deleteProject} />}
                {activeTab === 'planning' && isAdmin && <Planning epics={filteredEpics} features={filteredFeatures} sprints={filteredSprints} users={users} projects={projects} onAddEpic={e => setEpics(prev => [...prev, e])} onAddFeature={f => setFeatures(prev => [...prev, f])} onAddSprint={s => setSprints(prev => [...prev, s])} onDeleteEpic={deleteEpic} onDeleteFeature={deleteFeature} onDeleteSprint={deleteSprint} currentUser={user} selectedProjectId={selectedProjectId} />}
                {activeTab === 'settings' && isAdmin && <SettingsView user={user} projects={projects} selectedProjectId={selectedProjectId} onUsersChange={fetchData} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
