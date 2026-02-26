/**
 * Universal AI provider abstraction.
 * Supports Gemini, OpenAI, and Anthropic Claude.
 * Config is per-tenant and stored in ai_configurations table.
 */
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type AIProvider = 'gemini' | 'openai' | 'claude';

export interface AIConfig {
  provider: AIProvider;
  model?: string;
  apiKey?: string;          // per-tenant key (overrides env)
  systemPrompt?: string;
  temperature?: number;
  tone?: 'professional' | 'casual' | 'technical' | 'friendly';
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-5',
};

export const DEFAULT_SYSTEM_PROMPT = `You are an expert Agile Project Manager and AI assistant for a software team.
You help with: task breakdown, sprint planning, bug analysis, test case generation, and team productivity.
Be concise, actionable, and professional. Use bullet points when listing items.`;

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callAI(
  config: AIConfig,
  messages: AIMessage[],
  taskContext?: string
): Promise<string> {
  const provider  = config.provider || 'gemini';
  const model     = config.model || DEFAULT_MODELS[provider];
  const sysPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const tone      = config.tone || 'professional';

  const fullSystem = `${sysPrompt}\n\nTone: ${tone}.${taskContext ? `\n\nProject context:\n${taskContext}` : ''}`;

  try {
    switch (provider) {
      case 'gemini': return await callGemini(config.apiKey || process.env.GEMINI_API_KEY || '', model, fullSystem, messages);
      case 'openai': return await callOpenAI(config.apiKey || process.env.OPENAI_API_KEY || '', model, fullSystem, messages);
      case 'claude': return await callClaude(config.apiKey || process.env.ANTHROPIC_API_KEY || '', model, fullSystem, messages);
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (err: any) {
    console.error(`AI error (${provider}):`, err.message);
    throw new Error(`AI provider error: ${err.message}`);
  }
}

async function callGemini(apiKey: string, model: string, system: string, messages: AIMessage[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const response = await ai.models.generateContent({
    model,
    contents,
    config: { systemInstruction: system, temperature: 0.7 }
  });
  return response.text || '';
}

async function callOpenAI(apiKey: string, model: string, system: string, messages: AIMessage[]): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    ],
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content || '';
}

async function callClaude(apiKey: string, model: string, system: string, messages: AIMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

// ── Available models per provider ─────────────────────────────────────────────
export const AVAILABLE_MODELS: Record<AIProvider, { id: string; label: string }[]> = {
  gemini: [
    { id: 'gemini-2.0-flash',       label: 'Gemini 2.0 Flash (fast)' },
    { id: 'gemini-2.0-pro',         label: 'Gemini 2.0 Pro' },
    { id: 'gemini-1.5-flash',       label: 'Gemini 1.5 Flash' },
  ],
  openai: [
    { id: 'gpt-4o-mini',            label: 'GPT-4o Mini (fast)' },
    { id: 'gpt-4o',                 label: 'GPT-4o' },
    { id: 'gpt-4-turbo',            label: 'GPT-4 Turbo' },
  ],
  claude: [
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku (fast)' },
    { id: 'claude-sonnet-4-5',      label: 'Claude Sonnet' },
    { id: 'claude-opus-4-5',        label: 'Claude Opus (powerful)' },
  ],
};
