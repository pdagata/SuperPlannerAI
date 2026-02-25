import { useState, useEffect } from 'react';
import { Beaker, Plus, Play, CheckCircle2, XCircle, Clock, ChevronRight, FileCode, TestTube } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TestSuite, TestCase } from '../types';

export default function TestManagement() {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchSuites();
  }, []);

  useEffect(() => {
    if (selectedSuite) {
      fetchTestCases(selectedSuite.id);
    }
  }, [selectedSuite]);

  const fetchSuites = async () => {
    try {
      const res = await fetch('/api/test-suites');
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
      const res = await fetch(`/api/test-cases/${suiteId}`);
      const data = await res.json();
      setTestCases(data);
    } catch (err) {
      console.error(err);
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    for (const test of testCases) {
      // Simulate test execution
      await new Promise(r => setTimeout(r, 1000));
      const status = Math.random() > 0.2 ? 'passed' : 'failed';
      await fetch(`/api/test-cases/${test.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setTestCases(prev => prev.map(t => t.id === test.id ? { ...t, status, last_run: new Date().toISOString() } : t));
    }
    setIsRunning(false);
  };

  const createSuite = async () => {
    const name = prompt('Suite Name:');
    if (!name) return;
    const id = Math.random().toString(36).substr(2, 9);
    await fetch('/api/test-suites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, description: 'New test suite' })
    });
    fetchSuites();
  };

  const createTestCase = async () => {
    if (!selectedSuite) return;
    const title = prompt('Test Case Title:');
    if (!title) return;
    const id = Math.random().toString(36).substr(2, 9);
    await fetch('/api/test-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        suite_id: selectedSuite.id,
        title,
        steps: '1. Login\n2. Navigate to dashboard',
        expected_result: 'Dashboard is visible'
      })
    });
    fetchTestCases(selectedSuite.id);
  };

  return (
    <div className="flex h-full gap-8">
      {/* Sidebar - Suites */}
      <div className="w-80 bg-white rounded-3xl border border-gray-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Beaker className="text-indigo-600" size={20} />
            Test Suites
          </h2>
          <button 
            onClick={createSuite}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {suites.map(suite => (
            <button
              key={suite.id}
              onClick={() => setSelectedSuite(suite)}
              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${selectedSuite?.id === suite.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              <div className="flex items-center gap-3">
                <FileCode size={18} className={selectedSuite?.id === suite.id ? 'text-indigo-200' : 'text-gray-400'} />
                <span className="font-semibold text-sm">{suite.name}</span>
              </div>
              <ChevronRight size={16} className={`transition-transform ${selectedSuite?.id === suite.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Area - Test Cases */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedSuite?.name || 'Select a Suite'}</h1>
            <p className="text-sm text-gray-500 mt-1">{testCases.length} Test Cases • {testCases.filter(t => t.status === 'passed').length} Passed</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={createTestCase}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Add Test Case
            </button>
            <button 
              onClick={runTests}
              disabled={isRunning || testCases.length === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
            >
              {isRunning ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              Run Suite
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-6 pl-4">Test Case</div>
            <div className="col-span-3 text-center">Last Run</div>
            <div className="col-span-3 text-center">Status</div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence>
              {testCases.map((test, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={test.id}
                  className="grid grid-cols-12 gap-4 p-4 border-b border-gray-50 hover:bg-gray-50/50 transition-all items-center"
                >
                  <div className="col-span-6 flex items-center gap-4 pl-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${test.status === 'passed' ? 'bg-emerald-50 text-emerald-600' : test.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-400'}`}>
                      <TestTube size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{test.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Expected: {test.expected_result}</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <Clock size={14} />
                      {test.last_run ? new Date(test.last_run).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      test.status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                      test.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                      'bg-gray-100 text-gray-600'
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
                <p className="font-medium">No test cases in this suite</p>
                <button onClick={createTestCase} className="text-indigo-600 text-sm font-bold mt-2 hover:underline">Create your first test</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
