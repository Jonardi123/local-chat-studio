You are the lead product engineer building a polished, production-quality local-AI chat application in the current empty directory. Work autonomously: inspect your work, create all files, run available checks, and fix failures. Do not merely describe code—implement it.

Product goal
Build a Git-ready web application inspired by the usability and visual refinement of ChatGPT and Claude, without copying their trademarks, logos, proprietary assets, or exact styling. It must let a nontechnical user connect to any OpenAI-compatible API by entering a server URL and API key in an onboarding/settings screen. The initial target is llama.cpp at http://192.168.100.6:8080/v1 using bearer-token authentication.

Technical constraints
- Use React, TypeScript, and Vite. Keep dependencies modest and well justified.
- The app must run with `npm install` and `npm run dev`, and build with `npm run build`.
- This is a static client application; do not add a database or mandatory backend.
- Never hard-code an API key. Never commit secrets. Store the entered key only in browser localStorage, clearly explain that tradeoff, mask it by default, and provide show/hide, replace, test-connection, and clear controls.
- Centralize OpenAI-compatible API access in a typed service module.
- Support `/v1/models` for connection testing/model selection and streaming `/v1/chat/completions` via SSE. Provide clear errors for unreachable server, 401, malformed stream, cancellation, and timeouts.
- Avoid unsafe HTML rendering. Render Markdown safely, including fenced code blocks with language labels and copy buttons.
- Do not enable or call llama.cpp host filesystem/shell tools. This client is a chat interface only.

Core experience
- First-run onboarding asks for API base URL, API key, optional model ID, and offers Test Connection and Save & Continue.
- Responsive desktop/mobile shell with collapsible conversation sidebar, New Chat, rename, delete confirmation, search/filter, and settings.
- Main chat contains a tasteful empty state, suggestion cards, user/assistant message styling, Markdown, code blocks, copy response, regenerate, stop generation, edit-and-resend user message, and scroll-to-bottom behavior.
- Stream assistant text live. Show a subtle generating indicator, elapsed time if practical, token/s when llama.cpp returns timings, and meaningful status messages.
- Persist conversations and preferences locally with a versioned storage schema. Include import/export JSON and a destructive Clear All confirmation.
- Settings include endpoint, API key, model selector/manual model ID, temperature, maximum output tokens, system prompt, theme (system/light/dark), and reduced-motion-friendly behavior.
- Accessibility: keyboard navigation, visible focus, semantic labels, sufficient contrast, Escape behavior for dialogs, and sensible ARIA attributes.
- Design: original neutral premium aesthetic, restrained color, excellent spacing/typography, subtle motion, no visual clutter, and no remote images/fonts required.

Engineering quality
- Separate UI, state/storage, API, and type concerns cleanly without overengineering.
- Add an error boundary and actionable empty/error states.
- Add ESLint/typecheck/build scripts and at least focused tests for storage migration and SSE parsing if test tooling can remain lightweight.
- Include `.gitignore`, `.env.example` only if genuinely useful (never containing a key), an MIT `LICENSE`, and a thorough `README.md` covering setup, LAN server URL, where to enter the key, security warning about HTTP on trusted LAN only, build, troubleshooting for 401/CORS/timeout, architecture, and privacy behavior.
- Ensure the final repository contains no generated build output, dependency directory, credentials, or references to hidden local paths.

Execution rules
1. First inspect the directory and available runtime.
2. Scaffold and implement the complete application.
3. Install dependencies if network access permits. If it does not, still create a correct dependency manifest and continue.
4. Run typecheck, tests, lint, and production build; fix all issues you can reproduce.
5. Review the final UX and code for missing states, secret leakage, and mobile problems.
6. Finish with a concise report of what was built, checks run, remaining limitations, and exact local startup commands.

Do not ask follow-up questions. Make sound product decisions and complete as much as possible in this turn.
