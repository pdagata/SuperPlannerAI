import { useState, useEffect } from 'react';
import { LayoutDashboard, Kanban, MessageSquare, Settings, Plus, Search, Bell, User, Zap, Bug, Beaker, LogOut, Layers, BookOpen, AlertCircle, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import AIAssistant from './components/AIAssistant';
import TestManagement from './components/TestManagement';
import ProjectManagement from './components/ProjectManagement';
import Planning from './components/Planning';
import SettingsView from './components/Settings';
import Login from './components/Login';
import ProjectSelection from './components/ProjectSelection';
import { Task, Column, User as UserType, Epic, Feature, Sprint, Project } from './types';

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'ai' | 'bugs' | 'testing' | 'settings' | 'planning' | 'stories' | 'issues' | 'projects'>('board');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [adminSelectedProject, setAdminSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setActiveTab('board');
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const fetchData = async () => {
    try {
      const [colsRes, tasksRes, usersRes, epicsRes, featuresRes, sprintsRes, projectsRes] = await Promise.all([
        fetch('/api/columns'),
        fetch('/api/tasks'),
        fetch('/api/users'),
        fetch('/api/epics'),
        fetch('/api/features'),
        fetch('/api/sprints'),
        fetch('/api/projects')
      ]);
      const cols = await colsRes.json();
      const tks = await tasksRes.json();
      const usrs = await usersRes.json();
      setColumns(cols);
      setTasks(tks);
      setUsers(usrs);
      setEpics(await epicsRes.json());
      setFeatures(await featuresRes.json());
      setSprints(await sprintsRes.json());
      setProjects(await projectsRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (task: Task) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      setTasks(prev => [...prev, task]);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const deleteEpic = async (id: string) => {
    try {
      await fetch(`/api/epics/${id}`, { method: 'DELETE' });
      setEpics(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete epic:', error);
    }
  };

  const deleteFeature = async (id: string) => {
    try {
      await fetch(`/api/features/${id}`, { method: 'DELETE' });
      setFeatures(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to delete feature:', error);
    }
  };

  const deleteSprint = async (id: string) => {
    try {
      await fetch(`/api/sprints/${id}`, { method: 'DELETE' });
      setSprints(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete sprint:', error);
    }
  };

  const addProject = async (project: Project) => {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
      setProjects(prev => [...prev, project]);
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const filteredEpics = selectedProjectId === 'all' 
    ? epics 
    : epics.filter(e => e.project_id === selectedProjectId);

  const filteredFeatures = selectedProjectId === 'all'
    ? features
    : features.filter(f => {
        const epic = epics.find(e => e.id === f.epic_id);
        return epic?.project_id === selectedProjectId;
      });

  const filteredTasks = selectedProjectId === 'all'
    ? tasks
    : tasks.filter(t => {
        if (t.epic_id) {
          const epic = epics.find(e => e.id === t.epic_id);
          return epic?.project_id === selectedProjectId;
        }
        if (t.feature_id) {
          const feature = features.find(f => f.id === t.feature_id);
          const epic = epics.find(e => e.id === feature?.epic_id);
          return epic?.project_id === selectedProjectId;
        }
        return false;
      });

  const filteredSprints = selectedProjectId === 'all'
    ? sprints
    : sprints.filter(s => s.project_id === selectedProjectId);

  if (user.role_name === 'admin' && !adminSelectedProject) {
    const adminProjects = projects.filter(p => p.admin_ids?.includes(user.id));
    return <ProjectSelection projects={adminProjects} onSelectProject={setAdminSelectedProject} />;
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AgileFlow AI</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          {user.role_id === 'superadmin' && (
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'projects' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Folder size={20} />
              <span className="font-medium">Projects</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('board')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'board' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Kanban size={20} />
            <span className="font-medium">Kanban Board</span>
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'planning' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Layers size={20} />
            <span className="font-medium">Planning</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <MessageSquare size={20} />
            <span className="font-medium">AI Assistant</span>
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'stories' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <BookOpen size={20} />
            <span className="font-medium">User Stories</span>
          </button>
          <button
            onClick={() => setActiveTab('bugs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'bugs' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Bug size={20} />
            <span className="font-medium">Bug Tracking</span>
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'issues' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <AlertCircle size={20} />
            <span className="font-medium">Issues</span>
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'testing' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Beaker size={20} />
            <span className="font-medium">Testing</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-bottom border-gray-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks, projects..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <Folder size={18} className="text-gray-400" />
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-gray-50 border-none text-sm font-bold text-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.role_name}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
                {user.username.substring(0, 2)}
              </div>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'dashboard' && <Dashboard tasks={filteredTasks} users={users} sprints={filteredSprints} epics={filteredEpics} />}
                {activeTab === 'board' && (
                  <KanbanBoard
                    tasks={filteredTasks.filter(t => t.type === 'task' as any)}
                    columns={columns}
                    users={users}
                    epics={filteredEpics}
                    features={filteredFeatures}
                    sprints={filteredSprints}
                    onUpdateTask={updateTask}
                    onAddTask={(t) => addTask({ ...t, type: 'task' })}
                    onDeleteTask={deleteTask}
                    currentUser={user}
                  />
                )}
                {activeTab === 'stories' && (
                  <KanbanBoard
                    tasks={filteredTasks.filter(t => t.type === 'story')}
                    columns={columns}
                    users={users}
                    epics={filteredEpics}
                    features={filteredFeatures}
                    sprints={filteredSprints}
                    onUpdateTask={updateTask}
                    onAddTask={(t) => addTask({ ...t, type: 'story' })}
                    onDeleteTask={deleteTask}
                    currentUser={user}
                  />
                )}
                {activeTab === 'bugs' && (
                  <KanbanBoard
                    tasks={filteredTasks.filter(t => t.type === 'bug')}
                    columns={columns}
                    users={users}
                    epics={filteredEpics}
                    features={filteredFeatures}
                    sprints={filteredSprints}
                    onUpdateTask={updateTask}
                    onAddTask={(t) => addTask({ ...t, type: 'bug' })}
                    onDeleteTask={deleteTask}
                    currentUser={user}
                  />
                )}
                {activeTab === 'issues' && (
                  <KanbanBoard
                    tasks={filteredTasks.filter(t => t.type === 'issue')}
                    columns={columns}
                    users={users}
                    epics={filteredEpics}
                    features={filteredFeatures}
                    sprints={filteredSprints}
                    onUpdateTask={updateTask}
                    onAddTask={(t) => addTask({ ...t, type: 'issue' })}
                    onDeleteTask={deleteTask}
                    currentUser={user}
                  />
                )}
                {activeTab === 'ai' && <AIAssistant tasks={filteredTasks} onAddTask={addTask} />}
                {activeTab === 'testing' && <TestManagement />}
                {activeTab === 'projects' && (
                  <ProjectManagement 
                    projects={projects}
                    users={users}
                    currentUser={user}
                    onAddProject={addProject}
                    onDeleteProject={deleteProject}
                  />
                )}

          {activeTab === 'planning' && (
                  <Planning 
                    epics={filteredEpics}
                    features={filteredFeatures}
                    sprints={filteredSprints}
                    users={users}
                    projects={projects}
                    onAddEpic={(e) => setEpics(prev => [...prev, e])}
                    onAddFeature={(f) => setFeatures(prev => [...prev, f])}
                    onAddSprint={(s) => setSprints(prev => [...prev, s])}
                    onDeleteEpic={deleteEpic}
                    onDeleteFeature={deleteFeature}
                    onDeleteSprint={deleteSprint}
                    currentUser={user}
                    selectedProjectId={selectedProjectId}
                  />
                )}
                {activeTab === 'settings' && <SettingsView user={user} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
