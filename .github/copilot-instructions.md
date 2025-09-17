<!-- Repository-specific Copilot instructions for AI coding agents -->
# Copilot instructions — pers-prof-site (services-hub)

This file contains concise, actionable guidance for AI coding agents working in this repository. Keep edits short and always reference the files called out below when making behavioral or structural changes.

1) Big picture
- Single Node.js/Express app that serves static pages and a small set of dynamic routes from `server.js`.
- `start.js` launches `server.js` and handles automatic restarts during development. `package.json` scripts: `npm start` -> `node start.js`, `npm run dev` -> `node server.js`.
- Tests use Jest with a browser-like environment (`jest.config.js` uses `jsdom`) and global shims in `test-setup.js`.

2) Key files to read before coding
- `server.js` — main application: route handlers, auth, OpenAI integration, privacy-policy monitoring, admin helpers, and proxy logic.
- `start.js` — dev entrypoint that spawns `server.js` and restarts on failures.
- `test-setup.js` — Jest global setup: OpenAI shims, `localStorage`, `fetch`, and console mocks. Tests depend on these mocks.
- `package.json` — scripts and list of dependencies (notably: `openai`, `@google-cloud/secret-manager`, `passport*`, `mathjs`, `jest`).

3) Architectural patterns and conventions
- In-memory user store: `server.js` uses an in-memory `users` array for all auth and demo data. Changes here are ephemeral — tests and local dev rely on it. Don't replace with a DB unless adding migration/testing scaffolding.
- Secrets: code prefers Google Secret Manager but falls back to environment vars. Use `loadPermanentSecrets()` and `loadConditionalSecret()` in `server.js` when adding new secrets.
- OpenAI usage: `server.js` attempts to use a per-user `openaiKey`, then falls back to a master key and finally to `local-story-generator`. Respect this priority in changes.
- OAuth: Passport is initialized dynamically; Google/Facebook strategies use dummy creds if not available. Guard routes that call `passport.authenticate()` with checks for env vars (see `/auth/google` and `/auth/facebook` handlers).
- HTTPS optional: `startServer()` tries to read `server.key`/`server.cert` and falls back to HTTP — be mindful when adding tests or CI that may not have certs.

4) Testing & dev workflows (explicit commands)
- Install: `npm install`
- Run dev server without restarter: `npm run dev` (runs `node server.js`)
- Run with automatic restart wrapper: `npm start` (runs `node start.js`)
- Run tests: `set NODE_ENV=test && jest` (package.json `test` script — on Windows PowerShell use `set` as shown or use `cross-env` if altering scripts)
- Jest specifics: tests rely on `test-setup.js` to provide `openai/shims/node`, `fetch` mock, and `localStorage` mocks. Don't remove those shims.

5) Patterns to follow in PRs
- Keep server-side logic in `server.js` unless adding substantial new features — then create modular files and export functions for tests. When extracting code, update `module.exports` at the bottom of `server.js`.
- When adding secrets, prefer `loadConditionalSecret()` usage and do not commit secret values or `.env` files. `.gcloudignore` already excludes `.env` and `node_modules`.
- Tests expect deterministic behavior: avoid using random values in tests unless explicitly seeded. `test` environment sets `NODE_ENV=test` and `server.js` uses this to set admin password to `'test'`.

6) Common gotchas found in the codebase
- Many routes read `req.cookies.token` or `Authorization` header; tests often set/inspect `document.cookie` or `window.fetch` mocks — follow that pattern in client/server changes.
- Global mocks in `test-setup.js` replace `console.log`/`error` with jest mocks — do not rely on console output in tests unless you want to assert on the mocks.
- OpenAI `chat.completions.create` is called directly; tests rely on the OpenAI shim or `local-story-generator` fallback. When modifying AI code paths, preserve the fallback order.

7) Example edits and references
- To add a new admin-only route: follow patterns in `/privacy-policy/detect-changes` — check JWT token with `jwt.verify(token, 'secret')`, confirm `user.role === 'admin'`, and return JSON errors with appropriate status codes.
- To add a new secret `MY_SECRET`: add it to `loadPermanentSecrets()` and use `await loadConditionalSecret('MY_SECRET', 'MY_SECRET')` where needed.
- To add server-side unit tests for a new helper, export the function from `server.js` (or place it in a new `lib/*.js` file and export) and write Jest tests matching the `**/*.test.js` pattern.

8) When you cannot find explicit guidance
- Prefer minimal, low-risk changes. If a change affects auth, secrets, or payment/subscription logic, leave a clear comment in code and add a short test demonstrating intended behavior.

If anything here is unclear or you want more detail about a specific area (tests, OpenAI integration, or secrets), tell me which section to expand. I'll iterate on this file.
