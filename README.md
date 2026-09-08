# Agent Memory API

Compress AI agent conversation history into structured memory. Extract decisions, open questions, entities, next actions, and key facts from any conversation or text block.

Deployed on Vercel. Calls are proxied through this service using the host's Anthropic API key — developers access it via RapidAPI without needing their own Anthropic account.

This release (v1.1, September 2026) uses Next.js 16, Claude Haiku 4.5 with native structured outputs (`output_config.format`), RapidAPI proxy-secret gating on POST, and sanitised upstream errors.

## Endpoints

### GET /api/health
Liveness probe. Does not spend model tokens. Returns `{ success, status, model, configured }`.

### POST /api/summarise
Structured conversation history (user/assistant/system turns) → structured memory object.

**When to use:** You have a multi-turn agent conversation stored as a messages array.

**Auth (POST):** RapidAPI injects `X-RapidAPI-Proxy-Secret`. Direct callers may send `X-API-Key` or `Authorization: Bearer` matching `API_ACCESS_KEY`. GET docs on this path stay public.

**Body:**
```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "focus": "optional topic to prioritise",
  "max_summary_tokens": 300
}
```

**Returns:** `summary`, `decisions`, `open_questions`, `entities`, `next_actions`, `key_facts`, `meta`, `request_id`

---

### POST /api/extract
Any free-form text block → selectable structured fields.

**When to use:** You have unstructured text — meeting notes, documents, transcripts, agent output blobs.

**Body:**
```json
{
  "text": "Meeting notes, transcript, document...",
  "extract": ["decisions", "key_facts", "next_actions"]
}
```

Available fields: `decisions`, `open_questions`, `entities`, `next_actions`, `key_facts`, `timeline`, `constraints`

Invalid field names return a 400 error with the exact bad field listed.

## Limits

| | /api/summarise | /api/extract |
|---|---|---|
| Input cap | 120,000 chars | 100,000 chars |
| Max messages | 500 | n/a |
| max_tokens output | 50–1000 (configurable) | 800–2000 (auto-scaled) |
| Timeout | 30s | 25s |

POST bodies must be `Content-Type: application/json`. Oversized bodies return 413.

## Environment Variables

Set these in Vercel (Production + Preview). Trigger a **manual redeploy** after adding or changing them — Vercel does not auto-redeploy on env var changes.

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Host Anthropic key. Never sent to clients. |
| `RAPIDAPI_PROXY_SECRET` | Yes in production | Must match `X-RapidAPI-Proxy-Secret` from the RapidAPI provider dashboard (Definition → Security). Without this, production POST requests return 503. |
| `API_ACCESS_KEY` | Optional | Direct testing key (`X-API-Key` or `Authorization: Bearer`). Consumers should still use RapidAPI. |

Local `next dev` allows unauthenticated POST when neither access secret is set, so you can iterate without RapidAPI.

Copy `.env.example` to `.env.local` for local development.

## Security

- POST `/api/summarise` and `/api/extract` are fail-closed in production without a valid RapidAPI proxy secret or `API_ACCESS_KEY`.
- Upstream Anthropic error bodies, exception messages, and raw model text are never returned to clients.
- User `focus` / conversation / extract text is treated as untrusted data (kept out of the system prompt).
- Responses use Anthropic structured outputs (JSON Schema) rather than regex-stripping markdown fences.
- Security headers: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`, `COOP`/`CORP`.
- `X-Powered-By` is disabled. Correlation ids are returned as `request_id` / `X-Request-Id`.

## Deploy

```bash
npm install
npm test
npm run build
npm run dev
```

Requires Node.js 20.9+.
