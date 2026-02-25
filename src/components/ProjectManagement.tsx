import { useState } from 'react';
import { Folder, Plus, Trash2, History, User as UserIcon, Calendar } from 'lucide-react';
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
  const [newAdmins, setNewAdmins] = useState<string[]>([]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const newProject: Project = {
      id: 'PRJ-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      name: newName,
      description: newDescription,
      creator_id: currentUser.id,
      admin_ids: newAdmins,
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      if (res.ok) {
        onAddProject(newProject);
        setNewName('');
        setNewDescription('');
        setIsAdding(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
          <p className="text-gray-500 mt-2">Manage project containers and high-level initiatives.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl space-y-4"
          >
            <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Project Name" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Description" 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            {currentUser.role_name === 'superadmin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Admins</label>
                <select 
                  multiple
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newAdmins}
                  onChange={(e) => setNewAdmins(Array.from(e.target.selectedOptions, option => option.value))}
                >
                  {users.filter(u => u.role_name === 'admin').map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.full_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
              <button onClick={handleAdd} className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md">Create Project</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <motion.div 
            key={project.id}
            layout
            className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Folder size={24} />
              </div>
              <div className="flex items-center gap-2">
                {currentUser.id === project.creator_id && (
                  <button 
                    onClick={() => { if(confirm('Delete this project?')) onDeleteProject(project.id); }}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">{project.name}</h3>
            <p className="text-sm text-gray-500 mb-6 line-clamp-2">{project.description || 'No description provided.'}</p>
            
            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar size={14} />
                {new Date(project.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
                <UserIcon size={14} />
                {users.find(u => u.id === project.creator_id)?.full_name || 'Unknown'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {projects.length === 0 && !isAdding && (
        <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
          <Folder size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No projects found</h3>
          <p className="text-gray-500 mt-2">Create your first project to start organizing your work.</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-6 text-indigo-600 font-bold hover:underline"
          >
            Create Project
          </button>
        </div>
      )}
    </div>
  );
}
