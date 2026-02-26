import { useState, useEffect } from 'react';
import { Bot, Save, Eye, EyeOff, Zap, Brain, Cpu, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../auth';
import { User } from '../types';

interface AIConfigProps { currentUser: User; }

type Provider = 'gemini' | 'openai' | 'claude';
type Tone = 'professional' | 'casual' | 'technical' | 'friendly';

const PROVIDERS: { id: Provider; label: string; icon: string; color: string }[] = [
  { id: 'gemini', label: 'Google Gemini', icon: '✦', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'openai', label: 'OpenAI / GPT',  icon: '◎', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'claude', label: 'Anthropic Claude', icon: '◈', color: 'bg-amber-50 border-amber-200 text-amber-700' },
];

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: 'professional', label: 'Professional', desc: 'Formal and precise' },
  { id: 'casual',       label: 'Casual',       desc: 'Friendly and relaxed' },
  { id: 'technical',    label: 'Technical',    desc: 'Detailed and technical' },
  { id: 'friendly',     label: 'Friendly',     desc: 'Warm and encouraging' },
];

export default function AIConfig({ currentUser }: AIConfigProps) {
  const [provider, setProvider]     = useState<Provider>('gemini');
  const [models, setModels]         = useState<Record<Provider, { id: string; label: string }[]>>({ gemini: [], openai: [], claude: [] });
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKey, setApiKey]         = useState('');
  const [showKey, setShowKey]       = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [tone, setTone]             = useState<Tone>('professional');
  const [autoActions, setAutoActions] = useState<string[]>([]);
  const [newAction, setNewAction]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      const [configRes, modelsRes] = await Promise.all([
        apiFetch('/api/ai-config'),
        apiFetch('/api/ai-config/models'),
      ]);
      const config = await configRes.json();
      const modelsData = await modelsRes.json();
      setModels(modelsData);
      if (config) {
        setProvider(config.provider || 'gemini');
        setSelectedModel(config.model || '');
        setApiKey(config.api_key_encrypted || '');
        setSystemPrompt(config.system_prompt || '');
        setTemperature(config.temperature || 0.7);
        setTone(config.tone || 'professional');
        setAutoActions(JSON.parse(config.auto_actions || '[]'));
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await apiFetch('/api/ai-config', {
      method: 'PUT',
      body: JSON.stringify({ provider, model: selectedModel, api_key: apiKey, system_prompt: systemPrompt, temperature, tone, auto_actions: autoActions })
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  const currentModels = models[provider] || [];

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">AI Configuration</h2>
        <p className="text-gray-500 text-sm">Choose your AI provider, model, and customize the assistant's behavior.</p>
      </div>

      {/* Provider selection */}
      <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Cpu size={18} className="text-indigo-500" /> AI Provider</h3>
        <div className="grid grid-cols-3 gap-3">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => { setProvider(p.id); setSelectedModel(''); }}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${provider === p.id ? p.color + ' border-opacity-100' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}>
              <span className="text-2xl mb-2 block">{p.icon}</span>
              <p className="font-bold text-sm">{p.label}</p>
            </button>
          ))}
        </div>

        {/* Model picker */}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">— Use default —</option>
            {currentModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        {/* API Key */}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">API Key <span className="text-gray-400 font-normal">(leave blank to use server env key)</span></label>
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-... or AIza..."
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showKey ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>
      </section>

      {/* Behavior */}
      <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Brain size={18} className="text-indigo-500" /> Assistant Behavior</h3>

        {/* Tone */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Tone</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TONES.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${tone === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                <p className="font-bold text-sm text-gray-800">{t.label}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Temperature */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Creativity / Temperature: <span className="text-indigo-600">{temperature}</span></label>
          <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-indigo-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Precise</span><span>Balanced</span><span>Creative</span></div>
        </div>

        {/* System prompt */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">System Prompt</label>
          <textarea rows={5} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
            placeholder="You are an expert Agile project manager..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
        </div>
      </section>

      {/* Auto-actions */}
      <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Zap size={18} className="text-indigo-500" /> Auto-Actions</h3>
        <p className="text-sm text-gray-500 mb-4">Define triggers for automatic AI actions (e.g., "When a bug is created, generate test cases").</p>
        <div className="space-y-2 mb-3">
          {autoActions.map((a, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <span className="flex-1 text-sm text-gray-700">{a}</span>
              <button onClick={() => setAutoActions(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-rose-500"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newAction} onChange={e => setNewAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && newAction && (setAutoActions(p => [...p, newAction]), setNewAction(''))}
            placeholder="Describe an auto-action trigger..."
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          <button onClick={() => { if (newAction) { setAutoActions(p => [...p, newAction]); setNewAction(''); }}}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"><Plus size={18}/></button>
        </div>
      </section>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50">
        <Save size={18}/> {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save AI Configuration'}
      </button>
    </div>
  );
}
