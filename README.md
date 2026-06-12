# Agent Memory API

Compress AI agent conversation history into structured memory. Extract decisions, open questions, entities, next actions, and key facts from any conversation or text block.

Deployed on Vercel. Calls are proxied through this service using the host's Anthropic API key — developers access it via RapidAPI without needing their own Anthropic account.

## Endpoints

### POST /api/summarise
Structured conversation history (user/assistant/system turns) → structured memory object.

**When to use:** You have a multi-turn agent conversation stored as a messages array.

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

**Returns:** `summary`, `decisions`, `open_questions`, `entities`, `next_actions`, `key_facts`, `meta`

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
| max_tokens output | 50–1000 (configurable) | 800–2000 (auto-scaled) |
| Timeout | 30s | 25s |

## Environment Variables

- `ANTHROPIC_API_KEY` — Anthropic API key for the hosting deployment. Consumers of this API do not need their own key; they authenticate via RapidAPI.

## Deploy

```bash
npm install
npm run dev
```

Add `ANTHROPIC_API_KEY` in Vercel environment variables. Trigger a manual redeploy after adding — Vercel does not auto-redeploy on env var changes.
