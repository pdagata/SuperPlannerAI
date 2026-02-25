import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Clock, User as UserIcon, AlertCircle, Check, Layers, Target, Calendar, Filter, X, MessageSquare, Send, Paperclip, FileText, ExternalLink, Database, History, ShieldAlert, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Column, Priority, User as UserType, Epic, Feature, Sprint, Comment, Attachment, CustomFieldDefinition, CustomFieldValue, AuditLog } from '../types';

interface KanbanBoardProps {
  tasks: Task[];
  columns: Column[];
  users: UserType[];
  epics: Epic[];
  features: Feature[];
  sprints: Sprint[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  currentUser: UserType;
}

export default function KanbanBoard({ tasks, columns, users, epics, features, sprints, onUpdateTask, onAddTask, onDeleteTask, currentUser }: KanbanBoardProps) {
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'story' | 'bug' | 'issue'>('story');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  const [newTaskReporter, setNewTaskReporter] = useState(currentUser.id);
  const [newTaskSprint, setNewTaskSprint] = useState('');
  const [newTaskFeature, setNewTaskFeature] = useState('');
  const [newTaskEpic, setNewTaskEpic] = useState('');
  const [newTaskParent, setNewTaskParent] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [customValues, setCustomValues] = useState<CustomFieldValue[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'audit'>('details');
  const [newComment, setNewComment] = useState('');
  
  // Filter states
  const [filterSprint, setFilterSprint] = useState('');
  const [filterEpic, setFilterEpic] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchCustomFields();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchComments(selectedTask.id);
      fetchAttachments(selectedTask.id);
      fetchCustomValues(selectedTask.id);
      fetchAuditLogs(selectedTask.id);
    }
  }, [selectedTask]);

  const fetchAuditLogs = async (taskId: string) => {
    try {
      const res = await fetch(`/api/audit-logs/task/${taskId}`);
      const data = await res.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const res = await fetch('/api/custom-fields/definitions');
      const data = await res.json();
      setCustomFields(data);
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    }
  };

  const fetchCustomValues = async (entityId: string) => {
    try {
      const res = await fetch(`/api/custom-fields/values/${entityId}`);
      const data = await res.json();
      setCustomValues(data);
    } catch (error) {
      console.error('Failed to fetch custom values:', error);
    }
  };

  const handleUpdateCustomValue = async (fieldId: string, value: string) => {
    if (!selectedTask) return;
    try {
      await fetch('/api/custom-fields/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: selectedTask.id,
          field_definition_id: fieldId,
          value
        })
      });
      fetchCustomValues(selectedTask.id);
    } catch (error) {
      console.error('Failed to update custom value:', error);
    }
  };

  const fetchComments = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const fetchAttachments = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`);
      const data = await res.json();
      setAttachments(data);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    }
  };

  const handleAddAttachment = async () => {
    if (!selectedTask) return;
    const name = prompt('Enter file name:');
    const url = prompt('Enter file URL:');
    if (!name || !url) return;

    const attachment: Attachment = {
      id: Math.random().toString(36).substr(2, 9),
      task_id: selectedTask.id,
      name,
      url,
      type: 'link',
      created_at: new Date().toISOString()
    };

    try {
      await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attachment)
      });
      fetchAttachments(selectedTask.id);
    } catch (error) {
      console.error('Failed to add attachment:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      task_id: selectedTask.id,
      user_id: currentUser.id,
      content: newComment,
      created_at: new Date().toISOString()
    };

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      setNewComment('');
      fetchComments(selectedTask.id);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterSprint && task.sprint_id !== filterSprint) return false;
    if (filterEpic && task.epic_id !== filterEpic) return false;
    if (filterAssignee && task.assignee_id !== filterAssignee) return false;
    if (filterType && task.type !== filterType) return false;
    return true;
  });

  const handleAddTask = (columnId: string) => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: `US-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      title: newTaskTitle,
      description: '',
      status: columnId,
      priority: 'P3',
      assignee_id: newTaskAssignee,
      reporter_id: newTaskReporter,
      creator_id: currentUser.id,
      sprint_id: newTaskSprint || undefined,
      feature_id: newTaskFeature || undefined,
      epic_id: newTaskEpic || undefined,
      parent_id: newTaskParent || undefined,
      story_points: 0,
      column_id: columnId,
      type: newTaskType
    };

    onAddTask(newTask);
    setNewTaskTitle('');
    setIsAddingTask(null);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'P1': return 'text-red-600 bg-red-50';
      case 'P2': return 'text-orange-600 bg-orange-50';
      case 'P3': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 text-gray-500 mr-2">
          <Filter size={18} />
          <span className="text-sm font-bold uppercase tracking-wider">Filters</span>
        </div>
        
        <select 
          value={filterSprint}
          onChange={(e) => setFilterSprint(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 min-w-[120px]"
        >
          <option value="">All Sprints</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select 
          value={filterEpic}
          onChange={(e) => setFilterEpic(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 min-w-[120px]"
        >
          <option value="">All Epics</option>
          {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>

        <select 
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 min-w-[120px]"
        >
          <option value="">All Assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>

        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 min-w-[120px]"
        >
          <option value="">All Types</option>
          <option value="task">Tasks</option>
          <option value="bug">Bugs</option>
          <option value="issue">Issues</option>
        </select>

        {(filterSprint || filterEpic || filterAssignee || filterType) && (
          <button 
            onClick={() => {
              setFilterSprint('');
              setFilterEpic('');
              setFilterAssignee('');
              setFilterType('');
            }}
            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
          >
            <X size={14} /> Clear All
          </button>
        )}
      </div>

      <div className="flex gap-6 h-full overflow-x-auto pb-4">
        {columns.map(column => (
          <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-700">{column.title}</h3>
                <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {filteredTasks.filter(t => t.column_id === column.id).length}
                </span>
              </div>
              <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="flex-1 bg-gray-100/50 rounded-2xl p-3 space-y-3 overflow-y-auto">
              {filteredTasks
                .filter(task => task.column_id === column.id)
                .map(task => (
                  <motion.div
                    layoutId={task.id}
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group"
                  >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <button 
                      onClick={() => onDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <AlertCircle size={14} />
                    </button>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1 leading-tight">{task.title}</h4>
                  
                  {task.blocker && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded mb-2 border border-red-100">
                      <ShieldAlert size={12} />
                      BLOCKER: {task.blocker}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {task.sprint_id && (
                      <span className="flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                        <Calendar size={10} />
                        Sprint: {sprints.find(s => s.id === task.sprint_id)?.name}
                      </span>
                    )}
                    {task.epic_id && (
                      <span className="flex items-center gap-1 text-[9px] font-bold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">
                        <Layers size={10} />
                        Epic: {epics.find(e => e.id === task.epic_id)?.title}
                      </span>
                    )}
                    {task.feature_id && (
                      <span className="flex items-center gap-1 text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                        <Target size={10} />
                        Feature: {features.find(f => f.id === task.feature_id)?.title}
                      </span>
                    )}
                    {task.parent_id && (
                      <span className="flex items-center gap-1 text-[9px] font-bold bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100">
                        <MoreVertical size={10} className="rotate-90" />
                        Parent: {tasks.find(t => t.id === task.parent_id)?.title}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description || 'No description provided.'}</p>
                  
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center justify-between text-[9px] text-gray-400">
                      <span>Opened: {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}</span>
                      {task.closed_at && <span className="text-emerald-500 font-bold">Closed: {new Date(task.closed_at).toLocaleDateString()}</span>}
                    </div>
                    {!task.closed_at && task.updated_at && (
                      <div className="text-[9px] text-gray-400">
                        Last Update: {new Date(task.updated_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-600">{task.story_points || 0}</span>
                        <span className="text-[8px] text-gray-400 uppercase font-bold">SP</span>
                      </div>
                      <div className="flex items-center gap-2 p-1">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[9px] font-bold">
                          {users.find(u => u.id === task.assignee_id)?.full_name.charAt(0) || 'U'}
                        </div>
                        <span className="text-[10px] font-medium text-gray-600">{users.find(u => u.id === task.assignee_id)?.full_name || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      task.priority === 'P1' ? 'bg-rose-50 text-rose-600' :
                      task.priority === 'P2' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {task.priority}
                    </div>
                  </div>
                </motion.div>
              ))}

            {isAddingTask === column.id ? (
              <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-200">
                <textarea
                  autoFocus
                  placeholder="What needs to be done?"
                  className="w-full text-sm border-none focus:ring-0 p-0 mb-2 resize-none"
                  rows={2}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddTask(column.id);
                    }
                    if (e.key === 'Escape') setIsAddingTask(null);
                  }}
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Type</label>
                    <select 
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value as any)}
                      className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="story">User Story</option>
                      <option value="bug">Bug</option>
                      <option value="issue">Issue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assignee</label>
                    <select 
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reporter</label>
                    <select 
                      value={newTaskReporter}
                      onChange={(e) => setNewTaskReporter(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sprint</label>
                    <select 
                      value={newTaskSprint}
                      onChange={(e) => setNewTaskSprint(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">No Sprint</option>
                      {sprints.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Epic</label>
                    <select 
                      value={newTaskEpic}
                      onChange={(e) => setNewTaskEpic(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">No Epic</option>
                      {epics.map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Feature</label>
                    <select 
                      value={newTaskFeature}
                      onChange={(e) => setNewTaskFeature(e.target.value)}
                      className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">No Feature</option>
                      {features.map(f => (
                        <option key={f.id} value={f.id}>{f.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Parent Task</label>
                  <select 
                    value={newTaskParent}
                    onChange={(e) => setNewTaskParent(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">No Parent</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingTask(null)}
                    className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddTask(column.id)}
                    className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTask(column.id)}
                className="w-full py-2 flex items-center justify-center gap-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all border border-dashed border-gray-300 hover:border-indigo-200"
              >
                <Plus size={16} />
                <span className="text-xs font-semibold">New Task</span>
              </button>
            )}
          </div>
        </div>
      ))}

      <button className="flex-shrink-0 w-80 h-12 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 transition-all">
        <Plus size={20} />
        <span className="font-bold">Add Column</span>
      </button>
    </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">#{selectedTask.id}</span>
                  </div>
                  
                  <div className="flex bg-gray-200 p-1 rounded-xl">
                    <button 
                      onClick={() => setActiveModalTab('details')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeModalTab === 'details' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Details
                    </button>
                    <button 
                      onClick={() => setActiveModalTab('audit')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeModalTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Audit Log
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {currentUser.id === selectedTask.creator_id && (
                    <button 
                      onClick={() => { if(confirm('Delete this task?')) { onDeleteTask(selectedTask.id); setSelectedTask(null); } }}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto flex">
                {/* Main Content */}
                <div className="flex-1 p-8 border-r border-gray-100">
                  {activeModalTab === 'details' ? (
                    <>
                      <input 
                        className="text-2xl font-bold text-gray-800 w-full border-none focus:ring-0 p-0 mb-4"
                        value={selectedTask.title}
                        onChange={(e) => {
                          const updated = { ...selectedTask, title: e.target.value };
                          setSelectedTask(updated);
                          onUpdateTask(selectedTask.id, { title: e.target.value, user_id: currentUser.id });
                        }}
                      />
                      
                      <div className="grid grid-cols-1 gap-6 mb-8">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">User Story Statement</label>
                          <textarea 
                            className="w-full text-sm text-gray-800 bg-indigo-50/30 rounded-xl p-4 border border-indigo-100 focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-none italic"
                            value={selectedTask.statement || ''}
                            placeholder="Come [ruolo], voglio [azione], affinché [valore]..."
                            onChange={(e) => {
                              const updated = { ...selectedTask, statement: e.target.value };
                              setSelectedTask(updated);
                              onUpdateTask(selectedTask.id, { statement: e.target.value, user_id: currentUser.id });
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Technical Description</label>
                          <textarea 
                            className="w-full text-sm text-gray-600 bg-gray-50 rounded-xl p-4 border-none focus:ring-1 focus:ring-indigo-500 min-h-[120px] resize-none"
                            value={selectedTask.description || ''}
                            placeholder="Add technical details for development..."
                            onChange={(e) => {
                              const updated = { ...selectedTask, description: e.target.value };
                              setSelectedTask(updated);
                              onUpdateTask(selectedTask.id, { description: e.target.value, user_id: currentUser.id });
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Acceptance Criteria (Micro)</label>
                            <textarea 
                              className="w-full text-sm text-gray-600 bg-gray-50 rounded-xl p-4 border-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
                              value={selectedTask.acceptance_criteria || ''}
                              placeholder="List specific test criteria..."
                              onChange={(e) => {
                                const updated = { ...selectedTask, acceptance_criteria: e.target.value };
                                setSelectedTask(updated);
                                onUpdateTask(selectedTask.id, { acceptance_criteria: e.target.value, user_id: currentUser.id });
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Definition of Done (DoD)</label>
                            <textarea 
                              className="w-full text-sm text-gray-600 bg-gray-50 rounded-xl p-4 border-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
                              value={selectedTask.definition_of_done || ''}
                              placeholder="Standard quality checklist..."
                              onChange={(e) => {
                                const updated = { ...selectedTask, definition_of_done: e.target.value };
                                setSelectedTask(updated);
                                onUpdateTask(selectedTask.id, { definition_of_done: e.target.value, user_id: currentUser.id });
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Impediments (Blocker)</label>
                          <div className="flex items-center gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                            <ShieldAlert className="text-red-500" size={20} />
                            <input 
                              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-red-900 placeholder:text-red-300"
                              value={selectedTask.blocker || ''}
                              placeholder="Signal any external blocks..."
                              onChange={(e) => {
                                const updated = { ...selectedTask, blocker: e.target.value };
                                setSelectedTask(updated);
                                onUpdateTask(selectedTask.id, { blocker: e.target.value, user_id: currentUser.id });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Attachments Section */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Paperclip size={18} className="text-gray-400" />
                            <h3 className="font-bold text-gray-700">Attachments</h3>
                          </div>
                          <button 
                            onClick={handleAddAttachment}
                            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            Add Attachment
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {attachments.map(file => (
                            <a 
                              key={file.id} 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-all group"
                            >
                              <div className="p-2 bg-white rounded-lg text-indigo-600">
                                <FileText size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-700 truncate">{file.name}</p>
                                <p className="text-[10px] text-gray-400 uppercase">{file.type}</p>
                              </div>
                              <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-600" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Custom Fields Section */}
                      {customFields.filter(f => f.entity_type === selectedTask.type).length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4">
                            <Database size={18} className="text-gray-400" />
                            <h3 className="font-bold text-gray-700">Custom Fields</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {customFields
                              .filter(f => f.entity_type === selectedTask.type)
                              .map(field => {
                                const value = customValues.find(v => v.field_definition_id === field.id)?.value || '';
                                return (
                                  <div key={field.id}>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{field.name}</label>
                                    {field.type === 'boolean' ? (
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="checkbox"
                                          checked={value === 'true'}
                                          onChange={(e) => handleUpdateCustomValue(field.id, e.target.checked.toString())}
                                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-xs text-gray-600">{field.name}</span>
                                      </div>
                                    ) : (
                                      <input 
                                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                        value={value}
                                        onChange={(e) => handleUpdateCustomValue(field.id, e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Comments Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <MessageSquare size={18} className="text-gray-400" />
                          <h3 className="font-bold text-gray-700">Comments</h3>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                          {comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
                                {comment.user_name?.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-gray-700">{comment.user_name}</span>
                                  <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                                <div className="bg-gray-50 rounded-2xl rounded-tl-none p-3 text-sm text-gray-600">
                                  {comment.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold flex-shrink-0">
                            {currentUser.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 relative">
                            <input 
                              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none pr-10"
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                            />
                            <button 
                              onClick={handleAddComment}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700 p-1"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <History size={18} className="text-gray-400" />
                        <h3 className="font-bold text-gray-700">Audit Log History</h3>
                      </div>
                      <div className="space-y-4">
                        {auditLogs.map(log => (
                          <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-700">{log.user_name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {log.action}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-100 overflow-x-auto">
                              {log.changes}
                            </div>
                          </div>
                        ))}
                        {auditLogs.length === 0 && (
                          <p className="text-center py-8 text-gray-400 italic text-sm">No history found for this item.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Details */}
                <div className="w-80 bg-gray-50/30 p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status Workflow</label>
                    <select 
                      value={selectedTask.column_id}
                      onChange={(e) => {
                        onUpdateTask(selectedTask.id, { column_id: e.target.value, user_id: currentUser.id });
                        setSelectedTask({ ...selectedTask, column_id: e.target.value });
                      }}
                      className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {columns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Story Points (Fibonacci)</label>
                    <select 
                      value={selectedTask.story_points || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onUpdateTask(selectedTask.id, { story_points: val, user_id: currentUser.id });
                        setSelectedTask({ ...selectedTask, story_points: val });
                      }}
                      className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {[0, 1, 2, 3, 5, 8, 13, 21].map(p => <option key={p} value={p}>{p} Points</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assignee</label>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                        {users.find(u => u.id === selectedTask.assignee_id)?.full_name.charAt(0)}
                      </div>
                      <select 
                        value={selectedTask.assignee_id}
                        onChange={(e) => onUpdateTask(selectedTask.id, { assignee_id: e.target.value, user_id: currentUser.id })}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-medium text-gray-700 p-0"
                      >
                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sprint Link</label>
                      <select 
                        value={selectedTask.sprint_id || ''}
                        onChange={(e) => onUpdateTask(selectedTask.id, { sprint_id: e.target.value || undefined, user_id: currentUser.id })}
                        className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">None</option>
                        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Feature Link</label>
                      <select 
                        value={selectedTask.feature_id || ''}
                        onChange={(e) => onUpdateTask(selectedTask.id, { feature_id: e.target.value || undefined, user_id: currentUser.id })}
                        className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">None</option>
                        {features.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Epic Link</label>
                      <select 
                        value={selectedTask.epic_id || ''}
                        onChange={(e) => onUpdateTask(selectedTask.id, { epic_id: e.target.value || undefined, user_id: currentUser.id })}
                        className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">None</option>
                        {epics.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
                      <span>Created</span>
                      <span className="font-medium text-gray-600">{new Date(selectedTask.created_at!).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>Last Updated</span>
                      <span className="font-medium text-gray-600">{selectedTask.updated_at ? new Date(selectedTask.updated_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
