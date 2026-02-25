import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Database, Tag, Calendar, Type, Hash, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { CustomFieldDefinition } from '../types';

export default function CustomFieldsSettings() {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'string' | 'number' | 'date' | 'boolean'>('string');
  const [newEntityType, setNewEntityType] = useState<'epic' | 'feature' | 'sprint' | 'task' | 'bug' | 'issue'>('task');

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const fetchDefinitions = async () => {
    try {
      const res = await fetch('/api/custom-fields/definitions');
      const data = await res.json();
      setDefinitions(data);
    } catch (error) {
      console.error('Failed to fetch definitions:', error);
    }
  };

  const handleAddDefinition = async () => {
    if (!newFieldName.trim()) return;

    const definition = {
      id: Math.random().toString(36).substr(2, 9),
      entity_type: newEntityType,
      name: newFieldName,
      type: newFieldType
    };

    try {
      await fetch('/api/custom-fields/definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(definition)
      });
      setNewFieldName('');
      fetchDefinitions();
    } catch (error) {
      console.error('Failed to add definition:', error);
    }
  };

  const handleDeleteDefinition = async (id: string) => {
    if (!confirm('Are you sure? This will delete all values for this field across all entities.')) return;
    try {
      await fetch(`/api/custom-fields/definitions/${id}`, { method: 'DELETE' });
      fetchDefinitions();
    } catch (error) {
      console.error('Failed to delete definition:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string': return <Type size={14} />;
      case 'number': return <Hash size={14} />;
      case 'date': return <Calendar size={14} />;
      case 'boolean': return <CheckSquare size={14} />;
      default: return <Database size={14} />;
    }
  };

  const entities = ['epic', 'feature', 'sprint', 'task', 'bug', 'issue'];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-700">Add New Custom Field</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Entity Type</label>
            <select 
              value={newEntityType}
              onChange={(e) => setNewEntityType(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {entities.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Field Name</label>
            <input 
              type="text"
              placeholder="e.g. Budget, Priority Score..."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Type</label>
            <select 
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="boolean">Checkbox</option>
            </select>
          </div>
          <button 
            onClick={handleAddDefinition}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Field
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {entities.map(entity => {
          const entityFields = definitions.filter(d => d.entity_type === entity);
          if (entityFields.length === 0) return null;

          return (
            <div key={entity} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-indigo-600" />
                  <h4 className="font-bold text-gray-700 uppercase tracking-wider text-xs">{entity} Fields</h4>
                </div>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{entityFields.length}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {entityFields.map(field => (
                  <div key={field.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        {getTypeIcon(field.type)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700">{field.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{field.type}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteDefinition(field.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
