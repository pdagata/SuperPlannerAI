import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Wand2, ListChecks, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from '../types';
import Markdown from 'react-markdown';

interface AIAssistantProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
}

export default function AIAssistant({ tasks, onAddTask }: AIAssistantProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "Hello! I'm your Agile Assistant. I can help you break down projects, generate tasks, or analyze your current board. What's on your mind?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are an expert Agile Project Manager and QA Lead. 
            Current tasks in the project: ${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, type: t.type })))}
            
            User request: ${userMessage}
            
            Provide a helpful, professional response. If the user asks about bugs, provide debugging strategies. If they ask about testing, suggest test cases.` }]
          }
        ],
        config: {
          systemInstruction: "You are AgileFlow AI. You help with project management, bug tracking, and quality assurance. You can analyze issues and suggest test suites."
        }
      });

      setMessages(prev => [...prev, { role: 'ai', content: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error connecting to my brain. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateTaskBreakdown = async () => {
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Suggest 5 common tasks for a new SaaS product launch, including title, short description, and priority (P1, P2, P3). Return as JSON.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING }
              },
              required: ["title", "description", "priority"]
            }
          }
        }
      });

      const suggestedTasks = JSON.parse(response.text || "[]");
      
      suggestedTasks.forEach((t: any) => {
        onAddTask({
          id: Math.random().toString(36).substr(2, 9),
          title: t.title,
          description: t.description,
          status: 'todo',
          priority: (t.priority === 'P1' || t.priority === 'P2' || t.priority === 'P3' ? t.priority : 'P3') as any,
          assignee_id: 'u2', // Assign to dev
          story_points: Math.floor(Math.random() * 5) + 1,
          column_id: 'todo',
          type: t.title.toLowerCase().includes('bug') || t.title.toLowerCase().includes('fix') ? 'bug' : 'task',
          feature_id: 'FT-001' // Default feature
        });
      });

      setMessages(prev => [...prev, { role: 'ai', content: "I've analyzed your project and added 5 suggested tasks to your 'To Do' column to get you started!" }]);
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
      {/* AI Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">AgileFlow Assistant</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-500 font-medium">Online & Ready</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={generateTaskBreakdown}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-all shadow-sm"
          >
            <Sparkles size={16} />
            Auto-Generate Tasks
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-100 text-gray-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100'}`}>
                <div className="markdown-body">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl rounded-tl-none border border-gray-100 flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-gray-100">
        <div className="flex gap-4 items-center bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your project..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
          {['Suggest sprint goals', 'Analyze bottlenecks', 'Break down feature X'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:border-indigo-200 hover:text-indigo-600 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
