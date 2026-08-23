import type {
  AppData,
  ArchiveHit,
  UpdateInfo,
  UpdateProgress,
  WebSearchResult,
} from "./types";
declare global {
  interface Window {
    sudoNStore?: {
      load: () => Promise<AppData | null>;
      sync: (data: AppData) => Promise<boolean>;
      search: (query: string, chatId?: string) => Promise<ArchiveHit[]>;
      skill: (name: string) => Promise<string | null>;
      modelSkills: (model: string, task: string) => Promise<string>;
      webSearch: (query: string, baseUrl: string) => Promise<WebSearchResult[]>;
      clear: () => Promise<boolean>;
      checkUpdate: () => Promise<UpdateInfo>;
      downloadUpdate: () => Promise<{
        path: string;
        installState: UpdateInfo["installState"];
      }>;
      onUpdateProgress: (
        callback: (progress: UpdateProgress) => void,
      ) => () => void;
    };
  }
}
export {};
