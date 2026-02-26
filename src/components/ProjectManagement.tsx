import { apiFetch } from '../auth';
import { useState } from 'react';
import { Folder, Plus, Trash2, Calendar, User as UserIcon, Crown, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, User } from '../types';

interface ProjectManagementProps {
  projects: Project[];
  users: User[];
  currentUser: User;
  onAddProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

export default function ProjectManagement({ projects, users, currentUser, onAddProject, onDeleteProject }: ProjectManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAdminIds, setNewAdminIds] = useState<string[]>([]);

  const admins = users.filter(u => u.role_id === 'admin');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const newProject: Project = {
      id: 'PRJ-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      name: newName,
      description: newDescription,
      creator_id: currentUser.id,
      admin_ids: newAdminIds,
      created_at: new Date().toISOString()
    };
    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      if (res.ok) {
        onAddProject(newProject);
        setNewName(''); setNewDescription(''); setNewAdminIds([]); setIsAdding(false);
      }
    } catch (err) { console.error(err); }
  };

  const toggleAdmin = (id: string) => {
    setNewAdminIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-2">Create projects and assign admin managers.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
        >
          <Plus size={20} /> New Project
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl space-y-5"
          >
            <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Project Name *"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={newName} onChange={e => setNewName(e.target.value)} />
              <input type="text" placeholder="Description"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={newDescription} onChange={e => setNewDescription(e.target.value)} />
            </div>

            {admins.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Shield size={14} className="inline mr-1" /> Assign Admin(s)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {admins.map(admin => (
                    <button
                      key={admin.id}
                      onClick={() => toggleAdmin(admin.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${newAdminIds.includes(admin.id) ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase flex-shrink-0">
                        {admin.username?.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{admin.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">@{admin.username}</p>
                      </div>
                    </button>
                  ))}
                  {admins.length === 0 && (
                    <p className="text-sm text-gray-400">No admin users created yet. Create admin users first in User Management.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
              <button onClick={handleAdd} disabled={!newName.trim()}
                className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md disabled:opacity-40">
                Create Project
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => {
          const assignedAdmins = users.filter(u => project.admin_ids?.includes(u.id));
          return (
            <motion.div
              key={project.id} layout
              className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Folder size={24} />
                </div>
                <button
                  onClick={() => { if (confirm('Delete this project and all its data?')) onDeleteProject(project.id); }}
                  className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">{project.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description || 'No description.'}</p>

              {/* Admins assigned */}
              {assignedAdmins.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Admins</p>
                  <div className="flex flex-wrap gap-2">
                    {assignedAdmins.map(a => (
                      <span key={a.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                        <Crown size={10} /> {a.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar size={14} />
                  {project.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
                  <UserIcon size={14} />
                  {users.find(u => u.id === project.creator_id)?.full_name || 'System'}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {projects.length === 0 && !isAdding && (
        <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
          <Folder size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No projects yet</h3>
          <p className="text-gray-500 mt-2">Create your first project and assign an admin to manage it.</p>
          <button onClick={() => setIsAdding(true)} className="mt-6 text-indigo-600 font-bold hover:underline">
            Create Project
          </button>
        </div>
      )}
    </div>
  );
}
