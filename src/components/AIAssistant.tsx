import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Wand2, ListChecks, BrainCircuit, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { Task } from '../types';
import { apiFetch } from '../auth';
import Markdown from 'react-markdown';

interface AIAssistantProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
}

interface Message { role: 'user' | 'ai'; content: string; }

const QUICK_PROMPTS = [
  { icon: Wand2,      label: 'Break down this sprint',    prompt: 'Analyze the current tasks and suggest how to break down the sprint into smaller, manageable pieces.' },
  { icon: ListChecks, label: 'Generate test cases',       prompt: 'Based on the current stories, generate comprehensive test cases for QA.' },
  { icon: BrainCircuit, label: 'Identify blockers',       prompt: 'Review the current tasks and identify potential blockers or risks for this sprint.' },
  { icon: Sparkles,   label: 'Suggest improvements',      prompt: 'Analyze the project structure and suggest process improvements for the team.' },
];

export default function AIAssistant({ tasks, onAddTask }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "Hello! I'm your Agile AI Assistant. I can help you break down projects, generate tasks, analyze your board, and more. What's on your mind?" }
  ]);
  const [input, setInput]     = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
      const taskContext = `Current tasks (${tasks.length} total): ${JSON.stringify(tasks.slice(0, 20).map(t => ({ title: t.title, status: t.status, type: t.type, priority: t.priority })))}`;

      const res  = await apiFetch('/api/ai/chat', { method: 'POST', body: JSON.stringify({ messages: history, taskContext }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply || data.error || 'No response.' }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${e.message}. Check your AI configuration in Settings.` }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-500 mt-1">Powered by your configured AI provider</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100">
          <Settings size={14} /> Configure in Settings → AI Config
        </div>
      </div>

      {/* Quick prompts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
          <button key={label} onClick={() => handleSend(prompt)}
            className="p-4 bg-white rounded-2xl border border-gray-200 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all group shadow-sm">
            <Icon size={20} className="text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-gray-700">{label}</p>
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                {msg.role === 'ai' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'ai' ? 'bg-gray-50 text-gray-800 border border-gray-100' : 'bg-indigo-600 text-white'}`}>
                {msg.role === 'ai' ? <Markdown>{msg.content}</Markdown> : msg.content}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center"><Bot size={18} className="text-indigo-600" /></div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex gap-1">
                {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask anything about your project..."
              className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
