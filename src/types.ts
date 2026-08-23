export type Role = "user" | "assistant";
export type Theme = "system" | "light" | "dark";
export type ReasoningMode = "instant" | "low" | "medium" | "xhigh";
export type AgentName =
  | "grace"
  | "ada"
  | "knuth"
  | "margaret"
  | "linus"
  | "turing";
export type AgentStatus = "working" | "waiting" | "done" | "failed";
export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  elapsedMs?: number;
  tokensPerSecond?: number;
}
export interface Checkpoint {
  summary: string;
  throughMessageId: string;
  estimatedTokens: number;
  updatedAt: number;
}
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  parentChatId?: string;
  parentMessageId?: string;
  checkpoint?: Checkpoint;
}
export interface Settings {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  theme: Theme;
  reasoningMode: ReasoningMode;
  webSearchEnabled: boolean;
  searxngUrl: string;
}
export interface AppData {
  version: 2;
  settings: Settings;
  conversations: Conversation[];
  activeId: string | null;
  onboarded: boolean;
}
export interface ChatRequestMessage {
  role: "system" | Role;
  content: string;
}
export interface StreamResult {
  content: string;
  elapsedMs: number;
  tokensPerSecond?: number;
}
export interface ContextState {
  messages: ChatRequestMessage[];
  usedTokens: number;
  checkpoint?: Checkpoint;
  compacted: boolean;
}
export interface AgentRun {
  id: string;
  name: AgentName;
  label: string;
  role: string;
  status: AgentStatus;
  result?: string;
  error?: string;
}
export interface ArchiveHit {
  chatId: string;
  chatTitle: string;
  messageId: string;
  role: Role;
  content: string;
  createdAt: number;
}
export type InstallState =
  | "applications"
  | "disk-image"
  | "elsewhere"
  | "other";
export interface UpdateInfo {
  current: string;
  latest: string;
  available: boolean;
  notes: string;
  assetName: string | null;
  assetSize: number | null;
  supported: boolean;
  installState: InstallState;
}
export interface UpdateProgress {
  received: number;
  total: number;
  percent: number | null;
}
export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}
