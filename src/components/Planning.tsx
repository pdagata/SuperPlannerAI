import { useState, useEffect } from 'react';
import { Layers, Target, Calendar, Plus, ChevronRight, ChevronDown, Trash2, User as UserIcon, Clock, CheckCircle2, Database, History, TrendingUp, AlertCircle, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Epic, Feature, Sprint, User as UserType, CustomFieldDefinition, CustomFieldValue, Priority, RoughEstimate, AuditLog, Project } from '../types';

interface PlanningProps {
  epics: Epic[];
  features: Feature[];
  sprints: Sprint[];
  users: UserType[];
  projects: Project[];
  onAddEpic: (epic: Epic) => void;
  onAddFeature: (feature: Feature) => void;
  onAddSprint: (sprint: Sprint) => void;
  onDeleteEpic: (id: string) => void;
  onDeleteFeature: (id: string) => void;
  onDeleteSprint: (id: string) => void;
  currentUser: UserType;
  selectedProjectId?: string;
}

export default function Planning({ 
  epics, 
  features, 
  sprints, 
  users, 
  projects,
  onAddEpic, 
  onAddFeature, 
  onAddSprint, 
  onDeleteEpic,
  onDeleteFeature,
  onDeleteSprint,
  currentUser,
  selectedProjectId
}: PlanningProps) {
  const [activeView, setActiveView] = useState<'epics' | 'sprints'>('epics');
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, CustomFieldValue[]>>({});
  const [expandedEpic, setExpandedEpic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAuditModal, setShowAuditModal] = useState<{ type: string, id: string } | null>(null);
  
  // Inline add states
  const [isAddingEpic, setIsAddingEpic] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [newEpicBusinessValue, setNewEpicBusinessValue] = useState('');
  const [newEpicPriority, setNewEpicPriority] = useState<Priority>('P3');
  const [newEpicOwner, setNewEpicOwner] = useState(currentUser.id);
  const [newEpicProject, setNewEpicProject] = useState(selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : (projects[0]?.id || ''));

  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      setNewEpicProject(selectedProjectId);
    }
  }, [selectedProjectId]);
  
  const [isAddingSprint, setIsAddingSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintGoal, setNewSprintGoal] = useState('');
  const [newSprintCapacity, setNewSprintCapacity] = useState(0);
  const [newSprintProject, setNewSprintProject] = useState(selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : (projects[0]?.id || ''));
  
  const [addingFeatureToEpic, setAddingFeatureToEpic] = useState<string | null>(null);
  const [newFeatureTitle, setNewFeatureTitle] = useState('');
  const [newFeatureBenefit, setNewFeatureBenefit] = useState('');
  const [newFeatureEstimate, setNewFeatureEstimate] = useState<RoughEstimate>('M');
  const [newFeatureAssignee, setNewFeatureAssignee] = useState(currentUser.id);

  useEffect(() => {
    fetchCustomFields();
  }, []);

  const fetchCustomFields = async () => {
    try {
      const res = await fetch('/api/custom-fields/definitions');
      const data = await res.json();
      setCustomFields(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomValues = async (entityId: string) => {
    try {
      const res = await fetch(`/api/custom-fields/values/${entityId}`);
      const data = await res.json();
      setCustomValues(prev => ({ ...prev, [entityId]: data }));
    } catch (error) {
      console.error('Failed to fetch custom values:', error);
    }
  };

  const handleUpdateCustomValue = async (entityId: string, fieldId: string, value: string) => {
    try {
      await fetch('/api/custom-fields/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: entityId,
          field_definition_id: fieldId,
          value
        })
      });
      fetchCustomValues(entityId);
    } catch (error) {
      console.error('Failed to update custom value:', error);
    }
  };

  useEffect(() => {
    if (expandedEpic) {
      fetchCustomValues(expandedEpic);
      features.filter(f => f.epic_id === expandedEpic).forEach(f => fetchCustomValues(f.id));
    }
  }, [expandedEpic]);

  useEffect(() => {
    if (activeView === 'sprints') {
      sprints.forEach(s => fetchCustomValues(s.id));
    }
  }, [activeView, sprints]);

  const fetchAuditLogs = async (type: string, id: string) => {
    try {
      const res = await fetch(`/api/audit-logs/${type}/${id}`);
      const data = await res.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  useEffect(() => {
    if (showAuditModal) {
      fetchAuditLogs(showAuditModal.type, showAuditModal.id);
    }
  }, [showAuditModal]);

  const handleAddEpic = async () => {
    if (!newEpicTitle.trim()) return;
    const newEpic: Epic = {
      id: 'EP-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      project_id: newEpicProject || undefined,
      title: newEpicTitle,
      business_value: newEpicBusinessValue,
      description: '',
      status: 'Backlog',
      priority: newEpicPriority,
      owner_id: newEpicOwner || undefined,
      creator_id: currentUser.id,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 2592000000 * 3).toISOString(), // 3 months
      progress: 0
    };
    try {
      const res = await fetch('/api/epics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEpic, user_id: currentUser.id })
      });
      if (res.ok) {
        onAddEpic(newEpic);
        setNewEpicTitle('');
        setNewEpicBusinessValue('');
        setIsAddingEpic(false);
      } else {
        const errorData = await res.json();
        console.error('Failed to create epic:', errorData);
        alert('Failed to create epic. Please check console for details.');
      }
    } catch (err) {
      console.error('Error in handleAddEpic:', err);
      alert('An error occurred while creating the epic.');
    }
  };

  const handleAddFeature = async (epicId: string) => {
    if (!newFeatureTitle.trim()) return;
    const newFeature: Feature = {
      id: 'FT-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      epic_id: epicId,
      title: newFeatureTitle,
      benefit_hypothesis: newFeatureBenefit,
      rough_estimate: newFeatureEstimate,
      status: 'Draft',
      assignee_id: newFeatureAssignee || undefined,
      creator_id: currentUser.id
    };
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newFeature, user_id: currentUser.id })
      });
      if (res.ok) {
        onAddFeature(newFeature);
        setNewFeatureTitle('');
        setNewFeatureBenefit('');
        setAddingFeatureToEpic(null);
      } else {
        const errorData = await res.json();
        console.error('Failed to create feature:', errorData);
        alert('Failed to create feature.');
      }
    } catch (err) {
      console.error('Error in handleAddFeature:', err);
    }
  };

  const handleAddSprint = async () => {
    if (!newSprintName.trim()) return;
    const newSprint: Sprint = {
      id: 'SP-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      project_id: newSprintProject || undefined,
      name: newSprintName,
      goal: newSprintGoal,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 1209600000).toISOString(), // 2 weeks
      status: 'Pianificato',
      target_capacity: newSprintCapacity,
      actual_velocity: 0,
      assignee_id: currentUser.id,
      creator_id: currentUser.id
    };
    try {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSprint, user_id: currentUser.id })
      });
      if (res.ok) {
        onAddSprint(newSprint);
        setNewSprintName('');
        setNewSprintGoal('');
        setIsAddingSprint(false);
      } else {
        const errorData = await res.json();
        console.error('Failed to create sprint:', errorData);
        alert('Failed to create sprint.');
      }
    } catch (err) {
      console.error('Error in handleAddSprint:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planning & Roadmap</h1>
          <p className="text-gray-500 mt-2">Manage Epics, Features, and Sprints.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveView('epics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'epics' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Layers size={18} />
            Epics & Features
          </button>
          <button
            onClick={() => setActiveView('sprints')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'sprints' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Calendar size={18} />
            Sprints
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {activeView === 'epics' ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                {isAddingEpic ? (
                  <div className="flex flex-col gap-3 bg-white p-6 rounded-2xl border border-indigo-200 shadow-xl w-full max-w-lg">
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Epic Title (e.g. Mobile App Launch)"
                        className="px-4 py-2 text-sm border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        value={newEpicTitle}
                        onChange={(e) => setNewEpicTitle(e.target.value)}
                      />
                      <textarea
                        placeholder="Business Value Hypothesis..."
                        className="px-4 py-2 text-xs border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                        value={newEpicBusinessValue}
                        onChange={(e) => setNewEpicBusinessValue(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Project</label>
                        <select
                          className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none"
                          value={newEpicProject}
                          onChange={(e) => setNewEpicProject(e.target.value)}
                        >
                          <option value="">Select Project</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Priority</label>
                        <select
                          className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none"
                          value={newEpicPriority}
                          onChange={(e) => setNewEpicPriority(e.target.value as Priority)}
                        >
                          <option value="P1">P1 - Critical</option>
                          <option value="P2">P2 - High</option>
                          <option value="P3">P3 - Medium</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Owner (PM)</label>
                        <select
                          className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none"
                          value={newEpicOwner}
                          onChange={(e) => setNewEpicOwner(e.target.value)}
                        >
                          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => setIsAddingEpic(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl">
                        Cancel
                      </button>
                      <button onClick={handleAddEpic} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md">
                        Create Epic
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingEpic(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <Plus size={18} />
                    New Epic
                  </button>
                )}
              </div>
              {epics.map(epic => (
                <div key={epic.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div 
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all"
                    onClick={() => setExpandedEpic(expandedEpic === epic.id ? null : epic.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Layers size={20} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900">{epic.title}</h3>
                          <div className="flex items-center gap-2">
                            {epic.project_id && (
                              <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                                {projects.find(p => p.id === epic.project_id)?.name || 'Unknown Project'}
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              epic.priority === 'P1' ? 'bg-red-100 text-red-600' :
                              epic.priority === 'P2' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {epic.priority}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{epic.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{features.filter(f => f.epic_id === epic.id).length} Features</p>
                          <span className="text-[10px] text-gray-300">•</span>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock size={10} />
                            {epic.start_date ? new Date(epic.start_date).toLocaleDateString() : 'N/A'} - {epic.end_date ? new Date(epic.end_date).toLocaleDateString() : 'N/A'}
                          </div>
                          {epic.owner_id && (
                            <>
                              <span className="text-[10px] text-gray-300">•</span>
                              <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
                                <UserIcon size={10} />
                                {users.find(u => u.id === epic.owner_id)?.full_name}
                              </div>
                            </>
                          )}
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-3 w-full max-w-[200px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Progress</span>
                            <span className="text-[9px] font-bold text-indigo-600">{Math.round(epic.progress || 0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 transition-all duration-500" 
                              style={{ width: `${epic.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowAuditModal({ type: 'epic', id: epic.id }); }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                        >
                          <History size={18} />
                        </button>
                        {currentUser.id === epic.creator_id && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm('Delete this epic?')) onDeleteEpic(epic.id); }}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">{epic.status}</span>
                        {expandedEpic === epic.id ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                      </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedEpic === epic.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="border-t border-gray-100 bg-gray-50/50"
                      >
                        <div className="p-6 space-y-6">
                          {/* Epic Business Value */}
                          {epic.business_value && (
                            <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={14} className="text-indigo-600" />
                                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Business Value Hypothesis</h4>
                              </div>
                              <p className="text-xs text-indigo-900 italic">{epic.business_value}</p>
                            </div>
                          )}

                          {/* Epic Custom Fields */}
                          {customFields.filter(f => f.entity_type === 'epic').length > 0 && (
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                              <div className="flex items-center gap-2 mb-4">
                                <Database size={14} className="text-indigo-600" />
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Epic Custom Fields</h4>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {customFields.filter(f => f.entity_type === 'epic').map(field => {
                                  const value = customValues[epic.id]?.find(v => v.field_definition_id === field.id)?.value || '';
                                  return (
                                    <div key={field.id}>
                                      <label className="block text-[10px] font-bold text-gray-500 mb-1">{field.name}</label>
                                      <input 
                                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                        value={value}
                                        onChange={(e) => handleUpdateCustomValue(epic.id, field.id, e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Features</h4>
                            {addingFeatureToEpic === epic.id ? (
                              <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-indigo-100 shadow-lg w-full max-w-md">
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Feature Title (e.g. Auth Module)"
                                  className="px-3 py-2 text-xs border border-gray-100 rounded-lg outline-none font-bold"
                                  value={newFeatureTitle}
                                  onChange={(e) => setNewFeatureTitle(e.target.value)}
                                />
                                <textarea
                                  placeholder="Benefit Hypothesis..."
                                  className="px-3 py-2 text-[10px] border border-gray-100 rounded-lg outline-none min-h-[50px]"
                                  value={newFeatureBenefit}
                                  onChange={(e) => setNewFeatureBenefit(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Estimate</label>
                                    <select
                                      className="w-full text-[10px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none"
                                      value={newFeatureEstimate}
                                      onChange={(e) => setNewFeatureEstimate(e.target.value as RoughEstimate)}
                                    >
                                      <option value="XS">XS - Tiny</option>
                                      <option value="S">S - Small</option>
                                      <option value="M">M - Medium</option>
                                      <option value="L">L - Large</option>
                                      <option value="XL">XL - Huge</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Assignee</label>
                                    <select
                                      className="w-full text-[10px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none"
                                      value={newFeatureAssignee}
                                      onChange={(e) => setNewFeatureAssignee(e.target.value)}
                                    >
                                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setAddingFeatureToEpic(null)} className="px-3 py-1 text-[10px] font-bold text-gray-500">Cancel</button>
                                  <button onClick={() => handleAddFeature(epic.id)} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">Add Feature</button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAddingFeatureToEpic(epic.id); }}
                                className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
                              >
                                <Plus size={14} />
                                Add Feature
                              </button>
                            )}
                          </div>
                          {features.filter(f => f.epic_id === epic.id).map(feature => (
                            <div key={feature.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col shadow-sm group hover:border-indigo-100 transition-all">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <Target size={16} />
                                  </div>
                                  <div>
                                    <span className="font-bold text-gray-800 block">{feature.title}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">#{feature.id}</span>
                                      <span className="text-[9px] text-gray-300">•</span>
                                      <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-bold">
                                        <UserIcon size={10} />
                                        {users.find(u => u.id === feature.assignee_id)?.full_name}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                    <AlertCircle size={10} className="text-gray-400" />
                                    <span className="text-[9px] font-bold text-gray-600 uppercase">{feature.rough_estimate}</span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    feature.status === 'Verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {feature.status}
                                  </span>
                                  <button 
                                    onClick={() => setShowAuditModal({ type: 'feature', id: feature.id })}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  >
                                    <History size={14} />
                                  </button>
                                  {currentUser.id === feature.creator_id && (
                                    <button 
                                      onClick={() => { if(confirm('Delete this feature?')) onDeleteFeature(feature.id); }}
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {feature.benefit_hypothesis && (
                                <div className="mb-4 text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                                  <span className="font-bold text-gray-400 uppercase text-[8px] block mb-1">Benefit Hypothesis</span>
                                  {feature.benefit_hypothesis}
                                </div>
                              )}
                              
                              {/* Feature Custom Fields Inline */}
                              <div className="flex-1 flex gap-4 px-8">
                                {customFields.filter(f => f.entity_type === 'feature').map(field => {
                                  const value = customValues[feature.id]?.find(v => v.field_definition_id === field.id)?.value || '';
                                  return (
                                    <div key={field.id} className="min-w-[80px]">
                                      <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">{field.name}</label>
                                      <input 
                                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                        value={value}
                                        onChange={(e) => handleUpdateCustomValue(feature.id, field.id, e.target.value)}
                                        className="w-full bg-transparent border-b border-gray-100 text-[10px] outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{feature.status}</span>
                                <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {features.filter(f => f.epic_id === epic.id).length === 0 && !addingFeatureToEpic && (
                            <p className="text-center py-4 text-sm text-gray-400 italic">No features defined for this epic.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                {isAddingSprint ? (
                  <div className="flex flex-col gap-3 bg-white p-6 rounded-2xl border border-indigo-200 shadow-xl w-full max-w-lg">
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Sprint Name (e.g. Sprint 24.1)"
                        className="px-4 py-2 text-sm border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        value={newSprintName}
                        onChange={(e) => setNewSprintName(e.target.value)}
                      />
                      <textarea
                        placeholder="Sprint Goal..."
                        className="px-4 py-2 text-xs border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                        value={newSprintGoal}
                        onChange={(e) => setNewSprintGoal(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Target Capacity (SP)</label>
                        <input
                          type="number"
                          className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none"
                          value={newSprintCapacity}
                          onChange={(e) => setNewSprintCapacity(parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assignee (Scrum Master)</label>
                        <select
                          className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none"
                          value={currentUser.id}
                          disabled
                        >
                          <option value={currentUser.id}>{currentUser.full_name}</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => setIsAddingSprint(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl">
                        Cancel
                      </button>
                      <button onClick={handleAddSprint} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md">
                        Create Sprint
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingSprint(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <Plus size={18} />
                    New Sprint
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sprints.map(sprint => (
                  <div key={sprint.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Calendar size={20} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowAuditModal({ type: 'sprint', id: sprint.id })}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <History size={14} />
                        </button>
                        {currentUser.id === sprint.creator_id && (
                          <button 
                            onClick={() => { if(confirm('Delete this sprint?')) onDeleteSprint(sprint.id); }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          sprint.status === 'Attivo' ? 'bg-emerald-100 text-emerald-600' : 
                          sprint.status === 'Chiuso' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {sprint.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{sprint.name}</h3>
                      {sprint.project_id && (
                        <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                          {projects.find(p => p.id === sprint.project_id)?.name || 'Unknown Project'}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      {sprint.goal && (
                        <p className="text-[11px] text-gray-500 mt-2 italic line-clamp-2">"{sprint.goal}"</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                      <div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase block mb-1">Capacity</span>
                        <div className="flex items-center gap-1.5">
                          <Target size={12} className="text-gray-400" />
                          <span className="text-xs font-bold text-gray-700">{sprint.target_capacity || 0} SP</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase block mb-1">Velocity</span>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={12} className="text-emerald-500" />
                          <span className="text-xs font-bold text-gray-700">{sprint.actual_velocity || 0} SP</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sprint Custom Fields */}
                    {customFields.filter(f => f.entity_type === 'sprint').length > 0 && (
                      <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-2">
                        {customFields.filter(f => f.entity_type === 'sprint').map(field => {
                          const value = customValues[sprint.id]?.find(v => v.field_definition_id === field.id)?.value || '';
                          return (
                            <div key={field.id}>
                              <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">{field.name}</label>
                              <input 
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                value={value}
                                onChange={(e) => handleUpdateCustomValue(sprint.id, field.id, e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400">0 Tasks</span>
                      <button className="text-indigo-600 text-xs font-bold hover:underline">View Sprint</button>
                    </div>
                  </div>
                ))}
              </div>
              {sprints.length === 0 && !isAddingSprint && (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No sprints planned yet.</p>
                  <button onClick={() => setIsAddingSprint(true)} className="text-indigo-600 font-bold hover:underline mt-2">Create your first sprint</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Audit Log Modal */}
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <History className="text-indigo-600" size={20} />
                  <h3 className="font-bold text-gray-800">Audit Log: {showAuditModal.type.toUpperCase()} #{showAuditModal.id}</h3>
                </div>
                <button onClick={() => setShowAuditModal(null)} className="p-2 hover:bg-gray-200 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  <p className="text-center py-12 text-gray-400 italic">No history found.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
