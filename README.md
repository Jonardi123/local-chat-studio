# Local Chat Studio

A polished, private browser client for llama.cpp and other OpenAI-compatible chat servers. Conversations, preferences, and the API key stay in the browser's local storage; there is no application backend or analytics.

## Download the desktop app

Open the repository's **Releases** page and download the installer for your computer:

- **macOS:** `.dmg` (universal Intel and Apple Silicon build)
- **Windows:** `.exe` installer
- **Linux:** `.AppImage`

The first release is unsigned. On macOS, Control-click the app, choose **Open**, then confirm **Open**. On Windows, SmartScreen may require **More info → Run anyway**. Only download builds from this repository's Releases page.

## Start locally

Requires Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
npm run dev -- --host
```

Open the address Vite prints. On first launch, enter `http://192.168.100.6:8080/v1`, paste the bearer API key, optionally enter a model ID, click **Test connection**, then **Save & continue**.

The key is never included in this repository. It is stored unencrypted in that browser's localStorage so this static app can make requests. Do not use a shared browser profile. Plain HTTP exposes requests to devices that can observe the network, so use it only on a trusted private LAN. Prefer HTTPS or a VPN elsewhere.

## Verification and production build

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run preview -- --host
```

To launch or package the desktop edition from source:

```bash
npm run desktop
npm run desktop:dist
```

Deployable static files go to `dist/` (ignored by Git). The LLM endpoint must allow the web origin through CORS.

## Features

- Streaming OpenAI-compatible chat with stop, retry, edit, and regenerate
- `/models` connection testing and discovery
- Conversation search, rename, delete, and JSON import/export
- Safe Markdown, tables, links, and fenced code copy controls
- System prompt, temperature, output token, model, and theme settings
- Versioned local persistence, responsive layout, focus styles, and reduced motion

## Troubleshooting

- **Cannot reach server:** verify llama.cpp listens on `0.0.0.0`, port 8080 is reachable, and the URL includes `/v1`.
- **401:** replace the saved key in Settings with the exact server key.
- **CORS error:** permit the UI origin in your server/proxy. Successful terminal `curl` does not prove browser CORS works.
- **Slow output:** a 27B model on the RX 570 runs at roughly a few tokens/second. Reduce output tokens or history, or use a smaller model.
- **Wrong model:** use Test connection and select an advertised ID, or leave model blank for a single-model server.

## Architecture and privacy

`src/api.ts` is the typed fetch/SSE layer, `src/storage.ts` owns migration and local persistence, and `src/App.tsx` contains the dependency-light UI. `electron/main.cjs` is a sandboxed desktop shell with Node integration disabled. React Markdown escapes raw HTML by default. There is no model-side shell, filesystem tool, telemetry, remote font, or tracking integration. Requests go only to the endpoint entered in Settings.

MIT licensed; see [LICENSE](LICENSE).
