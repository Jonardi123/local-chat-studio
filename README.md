# sudoN

sudoN is a lightweight desktop and browser client for a locally hosted OpenAI-compatible model. It is designed around a 16k active Qwen context while preserving complete searchable chat history outside the model window.

Desktop builds include **Settings → Software update**. sudoN checks the public release feed without credentials, downloads only the official installer matching the current platform into Downloads, shows progress, and opens it. Unsigned macOS builds still require closing sudoN and dragging the replacement app into Applications.

## Download

Download the latest installer from **GitHub Releases**:

- macOS: universal `.dmg` for Apple Silicon and Intel
- Windows: `.exe` installer
- Linux: `.AppImage`

Releases are currently unsigned. On macOS, Control-click sudoN and choose **Open** on first launch. On Windows, use **More info → Run anyway** if SmartScreen appears.

## Connect to Qwen

Use the server URL `http://192.168.100.6:8080/v1`, enter the bearer API key, and select **Test connection**. Plain HTTP should only be used on a trusted private LAN.

## Features

- Four-level reasoning control: Instant, Low, Medium, and Extra High
- Live 16k active-context ring with automatic non-destructive checkpoints near 8k
- Raw persistent chat archives, separate checkpoints, full-text recall, and JSON backup
- Conversation branching with parent relationships and independent future context
- Explicit-only named specialists: Grace, Ada, Knuth, Margaret, Linus, and Turing
- Modular Qwen engineering skills shipped in `skills/`
- Streaming Markdown chat, editing, regeneration, search, themes, and mobile layout

## Local development

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run lint
npm run build
```

Desktop commands:

```bash
npm run desktop
npm run desktop:dist
```

## Storage and privacy

The desktop app stores data below Electron's platform application-data directory in `sudoN/chats/<chat-id>/`:

- `messages.jsonl`: append-only raw message archive
- `checkpoint.json`: compact active-context state
- `metadata.json`: versioned chat and branch relationships
- `attachments/`: reserved per-chat attachment storage

An active-message index keeps edits and regeneration correct without deleting raw archive records. Branches reference their parent prefix and store only their own future messages. The browser edition uses versioned localStorage as a fallback. API keys are never committed; there is no telemetry or model-side filesystem/shell access.

## Architecture

- `src/api.ts`: OpenAI-compatible model and SSE client
- `src/context.ts`: token estimation, checkpointing, and active-context assembly
- `src/storage.ts`: migration, browser fallback, native bridge, and archive retrieval
- `electron/main.cjs`: native append-friendly storage and indexed search
- `src/agents.ts`: explicit agent selection and specialist runtime prompts
- `skills/registry.json`: core and named-agent skill resolution

MIT licensed.
