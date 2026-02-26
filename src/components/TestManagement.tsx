import { useState, useEffect } from 'react';
import {
  Beaker, Plus, Play, CheckCircle2, XCircle, Clock, ChevronRight,
  FileCode, TestTube, X, Wand2, Link, AlertTriangle, ChevronDown, Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TestSuite, TestCase, Task } from '../types';
import { apiFetch } from '../auth';

// ─── Severity helpers ────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  blocking: { label: 'Bloccante', className: 'bg-rose-100 text-rose-700' },
  high:     { label: 'Alto',      className: 'bg-orange-100 text-orange-700' },
  medium:   { label: 'Medio',     className: 'bg-amber-100 text-amber-700' },
  low:      { label: 'Basso',     className: 'bg-emerald-100 text-emerald-700' },
} as const;

function SeverityBadge({ severity }: { severity?: TestCase['severity'] }) {
  const cfg = SEVERITY_CONFIG[severity ?? 'medium'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Empty modal form state ───────────────────────────────────────────────────

const EMPTY_FORM: Partial<TestCase> = {
  title: '',
  severity: 'medium',
  preconditions: '',
  steps: '',
  expected_result: '',
  test_data: '',
  linked_task_id: '',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function TestManagement() {
  const [suites, setSuites]               = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [testCases, setTestCases]         = useState<TestCase[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isRunning, setIsRunning]         = useState(false);

  // Detail panel
  const [selectedTest, setSelectedTest]   = useState<TestCase | null>(null);
  const [activeTab, setActiveTab]         = useState<'details' | 'automation' | 'traceability'>('details');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError]     = useState<string | null>(null);
  const [runningScript, setRunningScript] = useState(false);
  const [runOutput, setRunOutput]         = useState<{ status: 'passed' | 'failed'; output: string } | null>(null);

  // Create / edit modal
  const [showForm, setShowForm]   = useState(false);
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);
  const [formData, setFormData]   = useState<Partial<TestCase>>(EMPTY_FORM);
  const [savingForm, setSavingForm] = useState(false);

  // Tasks for traceability
  const [tasks, setTasks] = useState<Pick<Task, 'id' | 'title'>[]>([]);

  useEffect(() => {
    fetchSuites();
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedSuite) fetchTestCases(selectedSuite.id);
  }, [selectedSuite]);

  // Keep selectedTest in sync after list updates
  useEffect(() => {
    if (selectedTest) {
      const updated = testCases.find(t => t.id === selectedTest.id);
      if (updated) setSelectedTest(updated);
    }
  }, [testCases]);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchSuites = async () => {
    try {
      const res  = await apiFetch('/api/test-suites');
      const data = await res.json();
      setSuites(data);
      if (data.length > 0) setSelectedSuite(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestCases = async (suiteId: string) => {
    try {
      const res  = await apiFetch(`/api/test-cases/${suiteId}`);
      const data = await res.json();
      setTestCases(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res  = await apiFetch('/api/tasks');
      const data = await res.json();
      setTasks(data.map((t: Task) => ({ id: t.id, title: t.title })));
    } catch { /* tasks non critici */ }
  };

  // ── Suite creation ──────────────────────────────────────────────────────────

  const createSuite = async () => {
    const name = prompt('Suite Name:');
    if (!name) return;
    await apiFetch('/api/test-suites', {
      method: 'POST',
      body: JSON.stringify({ name, description: '' }),
    });
    fetchSuites();
  };

  // ── Test Case CRUD ──────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingTest(null);
    setFormData({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEditForm = (test: TestCase) => {
    setEditingTest(test);
    setFormData({ ...test });
    setShowForm(true);
  };

  const saveTestCase = async () => {
    if (!selectedSuite || !formData.title) return;
    setSavingForm(true);
    try {
      if (editingTest) {
        await apiFetch(`/api/test-cases/${editingTest.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/api/test-cases', {
          method: 'POST',
          body: JSON.stringify({ ...formData, suite_id: selectedSuite.id }),
        });
      }
      setShowForm(false);
      fetchTestCases(selectedSuite.id);
    } finally {
      setSavingForm(false);
    }
  };

  // ── Run all tests (simulated) ───────────────────────────────────────────────

  const runTests = async () => {
    setIsRunning(true);
    for (const test of testCases) {
      await new Promise(r => setTimeout(r, 800));
      const status = Math.random() > 0.2 ? 'passed' : 'failed';
      await apiFetch(`/api/test-cases/${test.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setTestCases(prev =>
        prev.map(t => t.id === test.id ? { ...t, status, last_run: new Date().toISOString() } : t)
      );
    }
    setIsRunning(false);
  };

  // ── AI script generation ────────────────────────────────────────────────────

  const generateScript = async () => {
    if (!selectedTest) return;
    setGeneratingScript(true);
    setScriptError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    try {
      const res  = await apiFetch(`/api/test-cases/${selectedTest.id}/generate-script`, {
        method: 'POST',
        signal: controller.signal,
      } as RequestInit);
      const data = await res.json();
      if (!res.ok) {
        setScriptError(data.error || 'Errore durante la generazione dello script.');
        return;
      }
      if (data.script) {
        setTestCases(prev =>
          prev.map(t => t.id === selectedTest.id ? { ...t, automation_script: data.script } : t)
        );
      }
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? 'Timeout: la richiesta AI ha impiegato troppo tempo.'
        : (err.message || 'Errore di rete.');
      setScriptError(msg);
    } finally {
      clearTimeout(timeout);
      setGeneratingScript(false);
    }
  };

  // ── Run automation script ───────────────────────────────────────────────────

  const runScript = async () => {
    if (!selectedTest) return;
    setRunningScript(true);
    setRunOutput(null);
    try {
      const res  = await apiFetch(`/api/test-cases/${selectedTest.id}/run-script`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRunOutput({ status: 'failed', output: data.error || 'Errore durante l\'esecuzione.' });
        return;
      }
      setRunOutput(data);
      setTestCases(prev =>
        prev.map(t => t.id === selectedTest.id
          ? { ...t, status: data.status, last_run: new Date().toISOString() }
          : t)
      );
    } catch (err: any) {
      setRunOutput({ status: 'failed', output: err.message || 'Errore di rete.' });
    } finally {
      setRunningScript(false);
    }
  };

  // ── Inline actual_result save ───────────────────────────────────────────────

  const saveActualResult = async (value: string) => {
    if (!selectedTest) return;
    await apiFetch(`/api/test-cases/${selectedTest.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ actual_result: value }),
    });
    setTestCases(prev =>
      prev.map(t => t.id === selectedTest.id ? { ...t, actual_result: value } : t)
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6 relative">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="w-72 bg-white rounded-3xl border border-gray-200 p-6 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Beaker className="text-indigo-600" size={20} />
            Test Suites
          </h2>
          <button onClick={createSuite} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {suites.map(suite => (
            <button
              key={suite.id}
              onClick={() => setSelectedSuite(suite)}
              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                selectedSuite?.id === suite.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCode size={18} className={selectedSuite?.id === suite.id ? 'text-indigo-200' : 'text-gray-400'} />
                <span className="font-semibold text-sm">{suite.name}</span>
              </div>
              <ChevronRight
                size={16}
                className={`transition-transform ${selectedSuite?.id === suite.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedSuite?.name || 'Seleziona una Suite'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {testCases.length} Test Case &bull; {testCases.filter(t => t.status === 'passed').length} Passati
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Aggiungi Test
            </button>
            <button
              onClick={runTests}
              disabled={isRunning || testCases.length === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
            >
              {isRunning
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Play size={18} fill="currentColor" />}
              Esegui Suite
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-5 pl-4">Test Case</div>
            <div className="col-span-2 text-center">Severità</div>
            <div className="col-span-2 text-center">Ultima Esecuzione</div>
            <div className="col-span-3 text-center">Stato</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence>
              {testCases.map((test, i) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => { setSelectedTest(test); setActiveTab('details'); setScriptError(null); setRunOutput(null); }}
                  className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-50 hover:bg-gray-50/50 transition-all items-center cursor-pointer ${selectedTest?.id === test.id ? 'bg-indigo-50/40' : ''}`}
                >
                  <div className="col-span-5 flex items-center gap-4 pl-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      test.status === 'passed' ? 'bg-emerald-50 text-emerald-600'
                      : test.status === 'failed' ? 'bg-rose-50 text-rose-600'
                      : 'bg-gray-50 text-gray-400'
                    }`}>
                      <TestTube size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-800 text-sm truncate">{test.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">Atteso: {test.expected_result}</p>
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <SeverityBadge severity={test.severity} />
                  </div>

                  <div className="col-span-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                      <Clock size={13} />
                      {test.last_run ? new Date(test.last_run).toLocaleTimeString() : 'Mai'}
                    </div>
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      test.status === 'passed' ? 'bg-emerald-100 text-emerald-700'
                      : test.status === 'failed' ? 'bg-rose-100 text-rose-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {test.status === 'passed' && <CheckCircle2 size={12} />}
                      {test.status === 'failed' && <XCircle size={12} />}
                      {test.status === 'pending' && <Clock size={12} />}
                      {test.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {testCases.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-12">
                <Beaker size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Nessun test case in questa suite</p>
                <button onClick={openCreateForm} className="text-indigo-600 text-sm font-bold mt-2 hover:underline">
                  Crea il primo test
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail slide-in panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTest && (
          <motion.div
            key="detail-panel"
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-[480px] flex-shrink-0 bg-white rounded-3xl border border-gray-200 flex flex-col overflow-hidden shadow-xl shadow-gray-200/60"
          >
            {/* Panel header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={selectedTest.severity} />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedTest.status === 'passed' ? 'bg-emerald-100 text-emerald-700'
                    : selectedTest.status === 'failed' ? 'bg-rose-100 text-rose-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>{selectedTest.status}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">{selectedTest.title}</h3>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEditForm(selectedTest)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                >
                  Modifica
                </button>
                <button onClick={() => setSelectedTest(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {(['details', 'automation', 'traceability'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 pt-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'details' ? 'Dettagli' : tab === 'automation' ? 'Automazione' : 'Tracciabilità'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── Details tab ── */}
              {activeTab === 'details' && (
                <>
                  {selectedTest.preconditions && (
                    <Section title="Precondizioni">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTest.preconditions}</p>
                    </Section>
                  )}

                  <Section title="Steps di esecuzione">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{selectedTest.steps}</pre>
                  </Section>

                  <Section title="Risultato atteso">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTest.expected_result}</p>
                  </Section>

                  <Section title="Risultato effettivo">
                    <ActualResultEditor
                      value={selectedTest.actual_result || ''}
                      onSave={saveActualResult}
                    />
                  </Section>

                  {selectedTest.test_data && (
                    <Section title="Dati di test">
                      <pre className="text-sm text-gray-700 font-mono bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">{selectedTest.test_data}</pre>
                    </Section>
                  )}
                </>
              )}

              {/* ── Automation tab ── */}
              {activeTab === 'automation' && (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm text-gray-500">Script Playwright TypeScript generato via AI.</p>
                    <div className="flex items-center gap-2">
                      {selectedTest.automation_script && (
                        <button
                          onClick={runScript}
                          disabled={runningScript || generatingScript}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-60 shadow-lg shadow-emerald-100 flex-shrink-0"
                        >
                          {runningScript
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Terminal size={16} />}
                          {runningScript ? 'Esecuzione…' : 'Esegui script'}
                        </button>
                      )}
                      <button
                        onClick={() => { setRunOutput(null); generateScript(); }}
                        disabled={generatingScript || runningScript}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 shadow-lg shadow-indigo-100 flex-shrink-0"
                      >
                        {generatingScript
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <Wand2 size={16} />}
                        {generatingScript ? 'Generazione…' : 'Genera con AI'}
                      </button>
                    </div>
                  </div>

                  {scriptError && (
                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{scriptError}</span>
                    </div>
                  )}

                  {runOutput && (
                    <div className={`rounded-xl border p-3 text-sm ${runOutput.status === 'passed' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <div className={`flex items-center gap-2 font-bold mb-2 ${runOutput.status === 'passed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {runOutput.status === 'passed' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {runOutput.status === 'passed' ? 'Test PASSATO' : 'Test FALLITO'}
                      </div>
                      {runOutput.output && (
                        <pre className="text-xs font-mono text-gray-700 bg-white/70 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-48">
                          {runOutput.output}
                        </pre>
                      )}
                    </div>
                  )}

                  {selectedTest.automation_script ? (
                    <pre className="text-xs font-mono bg-gray-900 text-green-400 rounded-2xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {selectedTest.automation_script}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <FileCode size={40} className="opacity-20 mb-3" />
                      <p className="text-sm">Nessuno script generato</p>
                      <p className="text-xs mt-1">Clicca "Genera con AI" per creare lo script Playwright</p>
                    </div>
                  )}
                </>
              )}

              {/* ── Traceability tab ── */}
              {activeTab === 'traceability' && (
                <>
                  <Section title="Task collegato">
                    <LinkedTaskSelect
                      tasks={tasks}
                      value={selectedTest.linked_task_id || ''}
                      onChange={async (taskId) => {
                        await apiFetch(`/api/test-cases/${selectedTest.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ linked_task_id: taskId || null }),
                        });
                        setTestCases(prev =>
                          prev.map(t => t.id === selectedTest.id ? { ...t, linked_task_id: taskId } : t)
                        );
                      }}
                    />
                  </Section>

                  {selectedTest.linked_task_id && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl text-sm text-indigo-700">
                      <Link size={14} />
                      <span className="font-medium">
                        {tasks.find(t => t.id === selectedTest.linked_task_id)?.title || selectedTest.linked_task_id}
                      </span>
                    </div>
                  )}

                  {tasks.length === 0 && (
                    <p className="text-sm text-gray-400 italic">Nessun task disponibile. Crea dei task prima.</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create / Edit modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingTest ? 'Modifica Test Case' : 'Nuovo Test Case'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <FormField label="Titolo *">
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                    placeholder="es. Login con credenziali valide"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </FormField>

                <FormField label="Severità">
                  <div className="relative">
                    <select
                      value={formData.severity || 'medium'}
                      onChange={e => setFormData(f => ({ ...f, severity: e.target.value as TestCase['severity'] }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 pr-10 bg-white"
                    >
                      <option value="blocking">Bloccante</option>
                      <option value="high">Alto</option>
                      <option value="medium">Medio</option>
                      <option value="low">Basso</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </FormField>

                <FormField label="Precondizioni">
                  <textarea
                    rows={2}
                    value={formData.preconditions || ''}
                    onChange={e => setFormData(f => ({ ...f, preconditions: e.target.value }))}
                    placeholder="es. Utente non autenticato, browser Chrome"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </FormField>

                <FormField label="Steps di esecuzione *">
                  <textarea
                    rows={4}
                    value={formData.steps || ''}
                    onChange={e => setFormData(f => ({ ...f, steps: e.target.value }))}
                    placeholder={"1. Aprire la pagina di login\n2. Inserire email e password\n3. Cliccare su Accedi"}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </FormField>

                <FormField label="Risultato atteso *">
                  <textarea
                    rows={2}
                    value={formData.expected_result || ''}
                    onChange={e => setFormData(f => ({ ...f, expected_result: e.target.value }))}
                    placeholder="es. L'utente viene reindirizzato alla dashboard"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </FormField>

                <FormField label="Dati di test">
                  <textarea
                    rows={2}
                    value={formData.test_data || ''}
                    onChange={e => setFormData(f => ({ ...f, test_data: e.target.value }))}
                    placeholder={"email: test@example.com\npassword: Passw0rd!"}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                </FormField>

                <FormField label="Task collegato">
                  <LinkedTaskSelect
                    tasks={tasks}
                    value={formData.linked_task_id || ''}
                    onChange={v => setFormData(f => ({ ...f, linked_task_id: v }))}
                  />
                </FormField>
              </div>

              {/* Modal footer */}
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={saveTestCase}
                  disabled={savingForm || !formData.title}
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  {savingForm ? 'Salvataggio…' : editingTest ? 'Aggiorna' : 'Crea Test Case'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ActualResultEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value); setEditing(true); }}
        className="min-h-[2.5rem] px-3 py-2 border border-dashed border-gray-200 rounded-xl text-sm text-gray-600 cursor-text hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
      >
        {value || <span className="text-gray-300 italic">Clicca per inserire il risultato effettivo…</span>}
      </div>
    );
  }

  return (
    <div>
      <textarea
        autoFocus
        rows={3}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="w-full px-3 py-2 border border-indigo-400 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => { onSave(draft); setEditing(false); }}
          className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all"
        >
          Salva
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}

function LinkedTaskSelect({
  tasks,
  value,
  onChange,
}: {
  tasks: Pick<Task, 'id' | 'title'>[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 pr-10 bg-white"
      >
        <option value="">— Nessun task —</option>
        {tasks.map(t => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
