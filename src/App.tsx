import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { listModels, streamChat } from "./api";
import { AGENTS, newAgentRun, requestedAgents } from "./agents";
import {
  buildContext,
  contextPercent,
  CONTEXT_LIMIT,
  createCheckpoint,
} from "./context";
import { makeId } from "./id";
import {
  clearData,
  exportData,
  loadData,
  loadNativeData,
  migrateData,
  normalizeBaseUrl,
  saveData,
  searchArchive,
  STORAGE_KEY,
} from "./storage";
import type {
  AgentRun,
  AppData,
  Conversation,
  Message,
  ReasoningMode,
  Settings,
} from "./types";
import "./App.css";
/* oxlint-disable react/purity -- Date.now is used only inside event and async action callbacks. */
const uid = makeId,
  suggestions = [
    "Explain quantum computing simply",
    "Draft a friendly project update",
    "Help me debug some code",
    "Plan a productive weekend",
  ],
  modes: { value: ReasoningMode; label: string }[] = [
    { value: "instant", label: "Instant" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "xhigh", label: "Extra High" },
  ];

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const block = Boolean(className),
            text = String(children).replace(/\n$/, "");
          return block ? (
            <span className="codebox">
              <span className="codehead">
                <span>{className?.replace("language-", "") || "code"}</span>
                <button onClick={() => navigator.clipboard.writeText(text)}>
                  Copy
                </button>
              </span>
              <code className={className}>{text}</code>
            </span>
          ) : (
            <code {...props}>{children}</code>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
function ReasoningControl({
  value,
  onChange,
}: {
  value: ReasoningMode;
  onChange: (v: ReasoningMode) => void;
}) {
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState(() =>
      Math.max(
        0,
        modes.findIndex((m) => m.value === value),
      ),
    ),
    [dragging, setDragging] = useState(false),
    root = useRef<HTMLDivElement>(null),
    index = Math.max(
      0,
      modes.findIndex((m) => m.value === value),
    ),
    nearest = Math.round(position),
    selected = modes[dragging ? nearest : index],
    ratio = position / 3,
    sliderStyle = {
      "--reasoning-progress": `${ratio * 100}%`,
      "--reasoning-position": `calc(${ratio * 100}% + ${14 - 28 * ratio}px)`,
    } as CSSProperties,
    commit = (next = position) => {
      const snapped = Math.max(0, Math.min(3, Math.round(next)));
      setDragging(false);
      setPosition(snapped);
      onChange(modes[snapped].value);
    };
  useEffect(() => {
    if (!dragging) setPosition(index);
  }, [index, dragging]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
        if (!root.current?.contains(e.target as Node)) setOpen(false);
      },
      key = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
    addEventListener("pointerdown", close);
    addEventListener("keydown", key);
    return () => {
      removeEventListener("pointerdown", close);
      removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="reasoning" ref={root}>
      {open && (
        <div
          className="reasoning-popover"
          role="dialog"
          aria-label="Thinking level"
        >
          <div className="reasoning-heading">
            <span>Thinking</span>
            <em>{selected.label}</em>
          </div>
          <div
            className={`reasoning-slider${dragging ? " dragging" : ""}`}
            style={sliderStyle}
          >
            <input
              aria-label={`Thinking: ${selected.label}`}
              type="range"
              min="0"
              max="3"
              step="0.01"
              value={position}
              onPointerDown={() => setDragging(true)}
              onChange={(e) => setPosition(Number(e.target.value))}
              onPointerUp={(e) => commit(Number(e.currentTarget.value))}
              onPointerCancel={() => commit()}
              onBlur={() => dragging && commit()}
              onKeyUp={(e) => {
                if (
                  [
                    "ArrowLeft",
                    "ArrowRight",
                    "Home",
                    "End",
                    "PageUp",
                    "PageDown",
                  ].includes(e.key)
                )
                  commit(Number(e.currentTarget.value));
              }}
            />
            <div className="reasoning-dots" aria-hidden="true">
              {modes.map((m, i) => (
                <i className={i === nearest ? "active" : ""} key={m.value} />
              ))}
            </div>
          </div>
          <div className="reasoning-scale" aria-hidden="true">
            {modes.map((m, i) => (
              <span className={i === nearest ? "active" : ""} key={m.value}>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        className="reasoning-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{modes[index].label}</span>
        <i className={open ? "open" : ""}>⌄</i>
      </button>
    </div>
  );
}
function ContextMeter({
  tokens,
  compacted,
}: {
  tokens: number;
  compacted: boolean;
}) {
  const percent = contextPercent(tokens),
    limitLabel = `${(CONTEXT_LIMIT / 1024).toFixed(0)}k`;
  return (
    <button
      type="button"
      className="context-meter"
      style={{ "--usage": `${percent * 3.6}deg` } as CSSProperties}
      aria-label={`${(tokens / 1000).toFixed(1)}k of ${limitLabel} context${compacted ? ", checkpoint saved" : ""}`}
    >
      <span />
      <span className="meter-tip">
        {(tokens / 1000).toFixed(1)}k / {limitLabel} context
        {compacted ? <small>Checkpoint saved</small> : null}
      </span>
    </button>
  );
}
function AgentPanel({
  runs,
  onClose,
}: {
  runs: AgentRun[];
  onClose: () => void;
}) {
  if (!runs.length) return null;
  return (
    <section className="agent-panel">
      <header>
        <b>Agents</b>
        {runs.every((r) => r.status === "done" || r.status === "failed") && (
          <button onClick={onClose}>×</button>
        )}
      </header>
      {runs.map((r) => (
        <div className="agent-row" key={r.id}>
          <span>
            {r.label}
            <small>{r.role}</small>
          </span>
          <em className={r.status}>
            {r.status[0].toUpperCase() + r.status.slice(1)}
          </em>
        </div>
      ))}
    </section>
  );
}

function ConfigForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Settings;
  onSave: (s: Settings) => void;
  onCancel?: () => void;
}) {
  const [s, setS] = useState(initial),
    [show, setShow] = useState(false),
    [models, setModels] = useState<string[]>([]),
    [status, setStatus] = useState("");
  const patch = (p: Partial<Settings>) => setS((v) => ({ ...v, ...p }));
  const test = async () => {
    setStatus("Testing…");
    try {
      const next = { ...s, baseUrl: normalizeBaseUrl(s.baseUrl) },
        found = await listModels(next);
      setModels(found);
      patch({ baseUrl: next.baseUrl, model: s.model || found[0] || "" });
      setStatus(
        `Connected${found.length ? ` · ${found.length} model${found.length === 1 ? "" : "s"}` : ""}`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Connection failed.");
    }
  };
  return (
    <form
      className="config"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...s, baseUrl: normalizeBaseUrl(s.baseUrl) });
      }}
    >
      <label>
        API base URL
        <input
          required
          value={s.baseUrl}
          onChange={(e) => patch({ baseUrl: e.target.value })}
        />
      </label>
      <label>
        API key
        <span className="secret">
          <input
            type={show ? "text" : "password"}
            value={s.apiKey}
            onChange={(e) => patch({ apiKey: e.target.value })}
            placeholder="Paste your key"
          />
          <button type="button" onClick={() => setShow((v) => !v)}>
            {show ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      <p className="security">
        Stored locally. Use HTTP only on a trusted private network.
      </p>
      <label>
        Model ID
        <input
          list="model-list"
          value={s.model}
          onChange={(e) => patch({ model: e.target.value })}
          placeholder="Auto-detect or enter manually"
        />
        <datalist id="model-list">
          {models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </datalist>
      </label>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={test}>
          Test connection
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button>Save{onCancel ? " changes" : " & continue"}</button>
      </div>
      {status && (
        <p className={status.startsWith("Connected") ? "success" : "status"}>
          {status}
        </p>
      )}
    </form>
  );
}
function UpdateSection() {
  const [info, setInfo] = useState<import("./types").UpdateInfo | null>(null),
    [status, setStatus] = useState("Checking for updates…"),
    [progress, setProgress] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  const check = async () => {
    if (!window.sudoNStore) {
      setStatus("Updates are available in the desktop app.");
      return;
    }
    setStatus("Checking for updates…");
    try {
      const result = await window.sudoNStore.checkUpdate();
      setInfo(result);
      setStatus(
        result.available
          ? `sudoN ${result.latest} is available.`
          : `sudoN ${result.current} is up to date.`,
      );
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Could not check for updates.",
      );
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => void check(), 0),
      off = window.sudoNStore?.onUpdateProgress((value) =>
        setProgress(value.percent),
      );
    return () => {
      clearTimeout(timer);
      off?.();
    };
  }, []);
  const download = async () => {
    setBusy(true);
    setStatus("Downloading update…");
    try {
      await window.sudoNStore!.downloadUpdate();
      setStatus(
        "Installer opened. Quit sudoN, drag the new sudoN onto Applications, and choose Replace. Then launch it from Applications—not from the installer.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Update download failed.");
    } finally {
      setBusy(false);
    }
  };
  const installNote =
    info?.installState === "disk-image"
      ? "You are running sudoN from the installer. Drag it into Applications before using it."
      : info?.installState === "elsewhere"
        ? "For one permanent copy, move sudoN into Applications and launch it there."
        : null;
  return (
    <section className="update-tools">
      <div>
        <h3>Software update</h3>
        {info && <small>Installed {info.current}</small>}
      </div>
      {installNote && <p className="install-warning">{installNote}</p>}
      <p>{status}</p>
      {busy && (
        <div className="update-progress">
          <i style={{ width: `${progress ?? 8}%` }} />
          <span>{progress === null ? "Downloading…" : `${progress}%`}</span>
        </div>
      )}
      <div>
        {info?.available && info.supported ? (
          <button type="button" onClick={download} disabled={busy}>
            {busy ? "Downloading…" : `Download ${info.latest}`}
          </button>
        ) : null}
        <button
          type="button"
          className="secondary"
          onClick={check}
          disabled={busy}
        >
          Check again
        </button>
      </div>
      {info?.available && (
        <small className="update-note">
          The verified installer is kept in temporary storage instead of
          creating duplicate files in Downloads. Updating preserves your chats
          and settings.
        </small>
      )}
    </section>
  );
}
function SettingsModal({
  data,
  onClose,
  onChange,
}: {
  data: AppData;
  onClose: () => void;
  onChange: (d: AppData) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    s = data.settings;
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div
      className="backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span className="eyebrow">Local preferences</span>
            <h2>sudoN settings</h2>
          </div>
          <button className="icon" onClick={onClose}>
            ×
          </button>
        </header>
        <ConfigForm
          initial={s}
          onCancel={onClose}
          onSave={(settings) => {
            onChange({ ...data, settings });
            onClose();
          }}
        />
        <div className="setting-grid">
          <label>
            Temperature <output>{s.temperature}</output>
            <input
              type="range"
              min="0"
              max="2"
              step=".1"
              value={s.temperature}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: { ...s, temperature: +e.target.value },
                })
              }
            />
          </label>
          <label>
            Max output tokens
            <input
              type="number"
              min="1"
              max="32768"
              value={s.maxTokens}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: { ...s, maxTokens: +e.target.value },
                })
              }
            />
          </label>
          <label>
            Theme
            <select
              value={s.theme}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: {
                    ...s,
                    theme: e.target.value as Settings["theme"],
                  },
                })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <label>
          System prompt
          <textarea
            rows={3}
            value={s.systemPrompt}
            onChange={(e) =>
              onChange({
                ...data,
                settings: { ...s, systemPrompt: e.target.value },
              })
            }
          />
        </label>
        <section className="web-tools">
          <div>
            <h3>Web search</h3>
            <label>
              <input
                type="checkbox"
                checked={s.webSearchEnabled}
                onChange={(e) =>
                  onChange({
                    ...data,
                    settings: { ...s, webSearchEnabled: e.target.checked },
                  })
                }
              />{" "}
              SearXNG
            </label>
          </div>
          <label>
            SearXNG address
            <input
              value={s.searxngUrl}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: { ...s, searxngUrl: e.target.value },
                })
              }
              placeholder="http://192.168.100.6:8888"
            />
          </label>
          <small>Keyless search through your private SearXNG service.</small>
        </section>
        <UpdateSection />
        <div className="data-tools">
          <h3>Your data</h3>
          <p>
            Desktop chats use the platform application-data folder. Raw history
            remains separate from compact checkpoints.
          </p>
          <div>
            <button className="secondary" onClick={() => exportData(data)}>
              Export
            </button>
            <button
              className="secondary"
              onClick={() => input.current?.click()}
            >
              Import
            </button>
            <input
              ref={input}
              hidden
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onChange(migrateData(JSON.parse(await f.text())));
                  onClose();
                }
              }}
            />
            <button
              className="danger"
              onClick={async () => {
                if (
                  confirm(
                    "Delete every local chat, setting, checkpoint, and API key?",
                  )
                ) {
                  await clearData();
                  location.reload();
                }
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData),
    [sidebar, setSidebar] = useState(false),
    [settings, setSettings] = useState(false),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [activity, setActivity] = useState(""),
    [generating, setGenerating] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [agents, setAgents] = useState<AgentRun[]>([]);
  const aborter = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null),
    textarea = useRef<HTMLTextAreaElement>(null);
  const change = (next: AppData) => {
    setData(next);
    saveData(next);
  };
  useEffect(() => {
    void loadNativeData().then((native) => {
      if (native) {
        setData(native);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(native));
      }
    });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);
  useEffect(() => {
    void bottom.current?.scrollIntoView({
      behavior: generating ? "auto" : "smooth",
    });
  }, [data.activeId, generating, data.conversations]);
  const active = data.conversations.find((c) => c.id === data.activeId),
    contextState = active
      ? buildContext(active, data.settings)
      : { messages: [], usedTokens: 0, compacted: false },
    visible = useMemo(
      () =>
        data.conversations
          .filter(
            (c) =>
              c.title.toLowerCase().includes(query.toLowerCase()) ||
              c.messages.some((m) =>
                m.content.toLowerCase().includes(query.toLowerCase()),
              ),
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      [data.conversations, query],
    );
  const updateConversation = (
    id: string,
    fn: (c: Conversation) => Conversation,
  ) =>
    setData((old) => {
      const next = {
        ...old,
        conversations: old.conversations.map((c) => (c.id === id ? fn(c) : c)),
      };
      saveData(next);
      return next;
    });
  const newChat = () => {
    const now = Date.now(),
      c: Conversation = {
        id: uid(),
        title: "New conversation",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
    change({
      ...data,
      conversations: [c, ...data.conversations],
      activeId: c.id,
    });
    setSidebar(false);
    setTimeout(() => textarea.current?.focus());
  };
  const branch = (chat: Conversation, message: Message) => {
    const index = chat.messages.findIndex((m) => m.id === message.id),
      now = Date.now(),
      c: Conversation = {
        id: uid(),
        title: `Branch · ${chat.title}`,
        messages: chat.messages.slice(0, index + 1),
        createdAt: now,
        updatedAt: now,
        parentChatId: chat.id,
        parentMessageId: message.id,
      };
    change({
      ...data,
      conversations: [c, ...data.conversations],
      activeId: c.id,
    });
  };
  const remove = (c: Conversation) => {
    if (confirm(`Delete “${c.title}”?`)) {
      const conversations = data.conversations.filter((x) => x.id !== c.id);
      change({
        ...data,
        conversations,
        activeId:
          data.activeId === c.id
            ? (conversations[0]?.id ?? null)
            : data.activeId,
      });
    }
  };
  const runAgents = async (text: string, ctl: AbortController) => {
    const names = requestedAgents(text);
    if (!names.length) return "";
    const runs = names.map(newAgentRun);
    setAgents(runs);
    const results: string[] = [];
    for (const run of runs) {
      setAgents((old) =>
        old.map((r) => (r.id === run.id ? { ...r, status: "working" } : r)),
      );
      try {
        const spec = AGENTS[run.name],
          skill = await window.sudoNStore?.skill(run.name),
          result = await streamChat({
            settings: { ...data.settings, reasoningMode: "medium" },
            messages: [
              {
                role: "system",
                content: `You are ${spec.label}, the ${spec.role}. ${skill ?? spec.prompt} Work only on the assignment; do not claim tool actions you did not perform.`,
              },
              { role: "user", content: text },
            ],
            signal: ctl.signal,
            onToken: () => {},
            maxTokens: 512,
          });
        results.push(`${spec.label} (${spec.role}): ${result.content}`);
        setAgents((old) =>
          old.map((r) =>
            r.id === run.id
              ? { ...r, status: "done", result: result.content }
              : r,
          ),
        );
      } catch (e) {
        setAgents((old) =>
          old.map((r) =>
            r.id === run.id
              ? {
                  ...r,
                  status: "failed",
                  error: e instanceof Error ? e.message : "Failed",
                }
              : r,
          ),
        );
      }
    }
    return results.join("\n\n");
  };
  const recall = async (text: string) => {
    if (
      !/(already told|but i said|we talked|remember when|you forgot)/i.test(
        text,
      )
    )
      return "";
    const words = text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [],
      term = words.at(-1) ?? "";
    if (!term) return "";
    const hits = await searchArchive(data, term);
    return hits.length
      ? `Relevant raw chat archive matches:\n${hits
          .slice(-6)
          .map((h) => `[${h.chatTitle}] ${h.role}: ${h.content.slice(0, 500)}`)
          .join("\n")}`
      : "";
  };
  const send = async (text = draft, truncateAt?: string) => {
    const content = text.trim();
    if (!content || generating) return;
    setError("");
    let chat = active;
    if (!chat) {
      const now = Date.now();
      chat = {
        id: uid(),
        title: content.slice(0, 48),
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      change({
        ...data,
        conversations: [chat, ...data.conversations],
        activeId: chat.id,
      });
    }
    const cut = truncateAt
        ? chat.messages.findIndex((m) => m.id === truncateAt)
        : -1,
      prior = cut >= 0 ? chat.messages.slice(0, cut) : chat.messages,
      user: Message = {
        id: uid(),
        role: "user",
        content,
        createdAt: Date.now(),
      },
      assistant: Message = {
        id: uid(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      },
      id = chat.id,
      title = prior.length ? chat.title : content.slice(0, 48),
      checkpoint = createCheckpoint([...prior, user]) ?? chat.checkpoint;
    updateConversation(id, (c) => ({
      ...c,
      title,
      checkpoint,
      messages: [...prior, user, assistant],
      updatedAt: Date.now(),
    }));
    setDraft("");
    setEditing(null);
    setGenerating(true);
    const ctl = new AbortController();
    aborter.current = ctl;
    try {
      const prepared = buildContext(
        { ...chat, messages: [...prior, user], checkpoint },
        data.settings,
      );
      setActivity("Reading skills…");
      const modelSkills =
          (await window.sudoNStore?.modelSkills(
            data.settings.model,
            content,
          )) ?? "",
        [agentNotes, archiveNotes] = await Promise.all([
          runAgents(content, ctl),
          recall(content),
        ]),
        messages = [...prepared.messages];
      if (modelSkills)
        messages.splice(messages[0]?.role === "system" ? 1 : 0, 0, {
          role: "system",
          content: `Active model skills:\n${modelSkills}`,
        });
      messages.push(
        ...(archiveNotes
          ? [{ role: "system" as const, content: archiveNotes }]
          : []),
        ...(agentNotes
          ? [
              {
                role: "system" as const,
                content: `Specialist findings requested by the user:\n${agentNotes}`,
              },
            ]
          : []),
      );
      const needsWeb =
        data.settings.webSearchEnabled &&
        /\b(search (the )?web|look up|online|latest|current|today|news|recent|right now|as of)\b/i.test(
          content,
        );
      if (needsWeb) {
        setActivity("Searching the web…");
        const results = await window.sudoNStore?.webSearch(
          content,
          data.settings.searxngUrl,
        );
        if (results?.length)
          messages.push({
            role: "system",
            content: `Current web search results. Cite these URLs in the answer and distinguish source facts from inference:\n${results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`).join("\n\n")}`,
          });
      }
      setActivity("Generating…");
      const result = await streamChat({
        settings: data.settings,
        messages,
        signal: ctl.signal,
        onToken: (full) =>
          updateConversation(id, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistant.id ? { ...m, content: full } : m,
            ),
          })),
      });
      updateConversation(id, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistant.id ? { ...m, ...result } : m,
        ),
        updatedAt: Date.now(),
      }));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Generation failed.");
        updateConversation(id, (c) => ({
          ...c,
          messages: c.messages.filter((m) => m.id !== assistant.id),
        }));
      }
    } finally {
      setGenerating(false);
      setActivity("");
      aborter.current = null;
    }
  };
  const regenerate = () => {
      const last = active?.messages.findLast((m) => m.role === "user");
      if (last) send(last.content, last.id);
    },
    setReasoning = (reasoningMode: ReasoningMode) =>
      change({ ...data, settings: { ...data.settings, reasoningMode } });
  if (!data.onboarded)
    return (
      <main className="onboarding">
        <div className="brandmark">N</div>
        <span className="eyebrow">Local intelligence, under your control</span>
        <h1>Meet sudoN</h1>
        <p className="lead">
          A focused workspace for the AI running on your own hardware.
        </p>
        <ConfigForm
          initial={data.settings}
          onSave={(s) => change({ ...data, settings: s, onboarded: true })}
        />
      </main>
    );
  return (
    <div className="app">
      <button className="mobile-menu" onClick={() => setSidebar(true)}>
        ☰
      </button>
      {sidebar && (
        <div className="sidebar-shade" onClick={() => setSidebar(false)} />
      )}
      <aside className={sidebar ? "open" : ""}>
        <div className="brand">
          <span className="brandmark">N</span>
          <b>sudoN</b>
          <button
            className="icon mobile-close"
            onClick={() => setSidebar(false)}
          >
            ×
          </button>
        </div>
        <button className="new" onClick={newChat}>
          <span>＋</span> New conversation
        </button>
        <label className="search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages"
          />
        </label>
        <nav>
          {visible.length === 0 ? (
            <p className="muted">No conversations yet.</p>
          ) : (
            visible.map((c) => (
              <div
                className={`chat-row ${c.id === data.activeId ? "active" : ""}`}
                key={c.id}
              >
                <button
                  onClick={() => {
                    change({ ...data, activeId: c.id });
                    setSidebar(false);
                  }}
                >
                  <span>
                    {c.parentChatId ? "⑂ " : ""}
                    {c.title}
                  </span>
                  <small>{new Date(c.updatedAt).toLocaleDateString()}</small>
                </button>
                <button
                  className="row-action"
                  onClick={() => {
                    const name = prompt("Conversation name", c.title);
                    if (name?.trim())
                      updateConversation(c.id, (x) => ({
                        ...x,
                        title: name.trim(),
                      }));
                  }}
                >
                  ✎
                </button>
                <button className="row-action" onClick={() => remove(c)}>
                  ×
                </button>
              </div>
            ))
          )}
        </nav>
        <div className="sidebar-foot">
          <button onClick={() => setSettings(true)}>⚙ Settings</button>
        </div>
      </aside>
      <AgentPanel runs={agents} onClose={() => setAgents([])} />
      <main className="chat">
        <header>
          <div>
            <span className="online-dot" />
            sudoN · local server
          </div>
          <button className="secondary" onClick={() => setSettings(true)}>
            Settings
          </button>
        </header>
        <section className="messages">
          {!active || !active.messages.length ? (
            <div className="empty">
              <div className="orb">N</div>
              <h1>What are we working on?</h1>
              <p>
                Private local reasoning, with persistent chats and context-aware
                recall.
              </p>
              <div className="suggestions">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)}>
                    {s}
                    <span>↗</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="thread">
              {active.messages.map((m) => (
                <article className={`message ${m.role}`} key={m.id}>
                  <div className="avatar">{m.role === "user" ? "Y" : "N"}</div>
                  <div className="bubble">
                    <div className="message-head">
                      <b>{m.role === "user" ? "You" : "sudoN"}</b>
                      <time>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    {editing === m.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          send(draft, m.id);
                        }}
                      >
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          autoFocus
                        />
                        <button>Save & send</button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : m.content ? (
                      <Markdown>{m.content}</Markdown>
                    ) : (
                      <span className="typing">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                    <div className="message-tools">
                      <button
                        onClick={() => navigator.clipboard.writeText(m.content)}
                      >
                        Copy
                      </button>
                      <button onClick={() => branch(active, m)}>Branch</button>
                      {m.role === "user" && !generating && (
                        <button
                          onClick={() => {
                            setEditing(m.id);
                            setDraft(m.content);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {m.role === "assistant" && m.elapsedMs && (
                        <small>
                          {(m.elapsedMs / 1000).toFixed(1)}s
                          {m.tokensPerSecond
                            ? ` · ${m.tokensPerSecond.toFixed(1)} tok/s`
                            : ""}
                        </small>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {error && (
                <div className="error">
                  {error} <button onClick={regenerate}>Try again</button>
                </div>
              )}
              <div ref={bottom} />
            </div>
          )}
        </section>
        <footer className="composer-wrap">
          <form
            className="composer"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              ref={textarea}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message sudoN…"
            />
            <div className="compose-foot">
              <span className="composer-controls">
                <ContextMeter
                  tokens={contextState.usedTokens}
                  compacted={contextState.compacted}
                />
                <ReasoningControl
                  value={data.settings.reasoningMode}
                  onChange={setReasoning}
                />
              </span>
              {generating ? (
                <button
                  type="button"
                  className="stop"
                  onClick={() => aborter.current?.abort()}
                >
                  ■ Stop
                </button>
              ) : (
                <button className="send" disabled={!draft.trim()}>
                  ↑
                </button>
              )}
            </div>
          </form>
          <p className={activity ? "activity active" : "activity"}>
            {activity ||
              "sudoN can make mistakes. Verify important information."}
          </p>
        </footer>
      </main>
      {settings && (
        <SettingsModal
          data={data}
          onClose={() => setSettings(false)}
          onChange={change}
        />
      )}
    </div>
  );
}
