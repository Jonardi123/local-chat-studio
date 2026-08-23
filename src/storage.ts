import type { AppData, ArchiveHit, Settings } from "./types";
export const STORAGE_KEY = "sudon:v2",
  LEGACY_KEY = "local-chat-studio:v1";
export const defaultSettings: Settings = {
  baseUrl: "http://192.168.100.6:8080/v1",
  apiKey: "",
  model: "",
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: "You are sudoN, a focused local AI engineering assistant.",
  theme: "system",
  reasoningMode: "medium",
  webSearchEnabled: true,
  searxngUrl: "http://192.168.100.6:8888",
};
export const defaultData = (): AppData => ({
  version: 2,
  settings: { ...defaultSettings },
  conversations: [],
  activeId: null,
  onboarded: false,
});
export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").replace(/\/v1$/, "") + "/v1";
}
export function migrateData(value: unknown): AppData {
  const fallback = defaultData();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<AppData>,
    settings =
      raw.settings && typeof raw.settings === "object"
        ? { ...defaultSettings, ...raw.settings }
        : fallback.settings;
  return {
    version: 2,
    settings: { ...settings, baseUrl: normalizeBaseUrl(settings.baseUrl) },
    conversations: Array.isArray(raw.conversations) ? raw.conversations : [],
    activeId: typeof raw.activeId === "string" ? raw.activeId : null,
    onboarded: Boolean(raw.onboarded),
  };
}
export function loadData(): AppData {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    return raw ? migrateData(JSON.parse(raw)) : defaultData();
  } catch {
    return defaultData();
  }
}
export async function loadNativeData(): Promise<AppData | null> {
  try {
    const value = await window.sudoNStore?.load();
    return value ? migrateData(value) : null;
  } catch {
    return null;
  }
}
let nativeTimer: ReturnType<typeof setTimeout> | undefined,
  nativePending: AppData | undefined;
export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (window.sudoNStore) {
    nativePending = data;
    if (nativeTimer) clearTimeout(nativeTimer);
    nativeTimer = setTimeout(() => {
      if (nativePending) void window.sudoNStore?.sync(nativePending);
      nativePending = undefined;
    }, 450);
  }
}
export async function clearData(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
  await window.sudoNStore?.clear();
}
export async function searchArchive(
  data: AppData,
  query: string,
  chatId?: string,
): Promise<ArchiveHit[]> {
  if (window.sudoNStore) return window.sudoNStore.search(query, chatId);
  const q = query.toLowerCase();
  return data.conversations
    .flatMap((c) =>
      c.id !== chatId && chatId
        ? []
        : c.messages
            .filter((m) => m.content.toLowerCase().includes(q))
            .map((m) => ({
              chatId: c.id,
              chatTitle: c.title,
              messageId: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            })),
    )
    .slice(-12);
}
export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `sudon-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
