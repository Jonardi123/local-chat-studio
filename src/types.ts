export type Role = 'user' | 'assistant'
export type Theme = 'system' | 'light' | 'dark'
export interface Message { id:string; role:Role; content:string; createdAt:number; elapsedMs?:number; tokensPerSecond?:number }
export interface Conversation { id:string; title:string; messages:Message[]; createdAt:number; updatedAt:number }
export interface Settings { baseUrl:string; apiKey:string; model:string; temperature:number; maxTokens:number; systemPrompt:string; theme:Theme }
export interface AppData { version:1; settings:Settings; conversations:Conversation[]; activeId:string|null; onboarded:boolean }
export interface ChatRequestMessage { role:'system'|Role; content:string }
export interface StreamResult { content:string; elapsedMs:number; tokensPerSecond?:number }
