# Agent Memory API

Compress AI agent conversation history into structured memory. Extract decisions, open questions, entities, next actions, and key facts from any conversation or text block.

## Endpoints

### POST /api/summarise
Full conversation history → structured memory object.

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
Any text block → selectable structured fields.

**Body:**
```json
{
  "text": "Meeting notes, transcript, document...",
  "extract": ["decisions", "key_facts", "next_actions"]
}
```

Available fields: `decisions`, `open_questions`, `entities`, `next_actions`, `key_facts`, `timeline`, `constraints`

## Environment Variables

- `ANTHROPIC_API_KEY` — Claude API key (required)

## Deploy

```bash
npm install
npm run dev
```

Set `ANTHROPIC_API_KEY` in Vercel environment variables before deploying.
