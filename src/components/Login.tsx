import { useState } from 'react';
import { LogIn, Shield, Zap, UserPlus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { authStorage } from '../auth';

interface LoginProps { onLogin: (user: User) => void; }

const DEMO = [
  { label: 'Super Admin', username: 'superadmin', password: 'super123', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { label: 'Admin',       username: 'admin1',     password: 'admin123', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { label: 'Developer',   username: 'dev1',        password: 'dev123',   color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { label: 'QA',          username: 'qa1',         password: 'qa123',    color: 'bg-amber-50 text-amber-700 border-amber-100' },
];

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode]         = useState<'login' | 'register' | 'forgot'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail]       = useState('');
  const [fullName, setFullName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);

  const doLogin = async (u: string, p: string) => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
      const data = await res.json();
      if (res.ok) {
        authStorage.saveSession(data.accessToken, data.user);
        localStorage.setItem('agileflow_refresh', data.refreshToken);
        onLogin(data.user);
      } else { setError(data.error || 'Invalid credentials'); }
    } catch { setError('Connection error.'); }
    finally { setLoading(false); }
  };

  const doRegister = async () => {
    if (!workspace || !fullName || !email || !password) return setError('All fields are required');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceName: workspace, fullName, email, password }) });
      const data = await res.json();
      if (res.ok) {
        authStorage.saveSession(data.accessToken, { email, full_name: fullName, role_id: 'superadmin', role_name: 'Super Administrator', username: email.split('@')[0] });
        localStorage.setItem('agileflow_refresh', data.refreshToken);
        window.location.reload();
      } else { setError(data.error || 'Registration failed'); }
    } catch { setError('Connection error.'); }
    finally { setLoading(false); }
  };

  const doForgot = async () => {
    if (!email) return setError('Enter your email');
    setLoading(true); setError('');
    try {
      await fetch('/api/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setInfo('If that email exists, a reset link has been sent.');
    } catch { setError('Connection error.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 p-8 md:p-10">

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-5">
            <Zap className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">AgileFlow AI</h1>
          <p className="text-gray-500 mt-2 text-center text-sm">
            {mode === 'login' ? 'Sign in to your workspace' : mode === 'register' ? 'Create your free workspace' : 'Reset your password'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2"><Shield size={16}/>{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username or Email</label>
                <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin(username, password)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button onClick={() => setMode('forgot')} className="text-xs text-indigo-600 hover:underline mt-1 float-right">Forgot password?</button>
              </div>
              <button onClick={() => doLogin(username, password)} disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><LogIn size={18}/> Sign In</>}
              </button>
              <p className="text-center text-sm text-gray-500">Don't have a workspace? <button onClick={() => setMode('register')} className="text-indigo-600 font-bold hover:underline">Sign up free</button></p>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">Quick Demo Access</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO.map(c => (
                    <button key={c.username} onClick={() => doLogin(c.username, c.password)}
                      className={`p-3 rounded-xl border text-left transition-all hover:opacity-80 ${c.color}`}>
                      <span className="block text-xs font-semibold opacity-70">{c.label}</span>
                      <span className="font-mono text-xs">{c.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <button onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"><ArrowLeft size={14}/> Back</button>
              {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>}
              <input type="text" placeholder="Workspace name *" value={workspace} onChange={e => setWorkspace(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="text" placeholder="Your full name *" value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="password" placeholder="Password (8+ chars) *" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              <button onClick={doRegister} disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><UserPlus size={18}/> Create Workspace — Free</>}
              </button>
              <p className="text-xs text-center text-gray-400">14-day free trial · No credit card required</p>
            </motion.div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <button onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft size={14}/> Back</button>
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
              {info  && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl">{info}</div>}
              <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              <button onClick={doForgot} disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Send Reset Link'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
