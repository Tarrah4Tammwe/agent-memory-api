import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface SummariseRequest {
  messages: Message[]
  focus?: string
  max_summary_tokens?: number
}

const MAX_INPUT_CHARS = 120000

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 })
  }

  let body: SummariseRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { messages, focus, max_summary_tokens } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { success: false, error: '"messages" must be a non-empty array of {role, content} objects' },
      { status: 400 }
    )
  }

  for (const m of messages) {
    if (!m.role || !m.content || typeof m.content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Each message must have "role" (user|assistant|system) and "content" (string)' },
        { status: 400 }
      )
    }
    if (!['user', 'assistant', 'system'].includes(m.role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role "${m.role}". Must be user, assistant, or system.` },
        { status: 400 }
      )
    }
  }

  if (focus !== undefined && typeof focus !== 'string') {
    return NextResponse.json(
      { success: false, error: '"focus" must be a string' },
      { status: 400 }
    )
  }

  const maxSummaryTokens = max_summary_tokens ?? 300
  if (typeof maxSummaryTokens !== 'number' || maxSummaryTokens < 50 || maxSummaryTokens > 1000) {
    return NextResponse.json(
      { success: false, error: 'max_summary_tokens must be a number between 50 and 1000' },
      { status: 400 }
    )
  }

  const rawText = messages.map(m => `${m.role}: ${m.content}`).join('\n')

  if (rawText.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      {
        success: false,
        error: `Input exceeds ${MAX_INPUT_CHARS.toLocaleString()} character limit (received ${rawText.length.toLocaleString()}). Truncate or batch your messages.`,
      },
      { status: 400 }
    )
  }

  const approxInputTokens = Math.round(rawText.length / 4)

  const focusInstruction = focus
    ? `Pay special attention to anything related to: ${focus}.`
    : ''

  const systemPrompt = `You are a precise context summariser for AI agent pipelines.
Given a conversation history, extract structured memory so an AI agent can continue work without needing the full conversation.
Respond ONLY with a valid JSON object — no preamble, no markdown fences, no explanation.
${focusInstruction}

Return this exact structure:
{
  "summary": "2-4 sentence narrative summary of what happened and current state",
  "decisions": ["array of concrete decisions or conclusions reached"],
  "open_questions": ["array of unresolved questions or ambiguities"],
  "entities": {
    "people": ["named people mentioned"],
    "projects": ["projects, products, or systems mentioned"],
    "tools": ["tools, APIs, services, or technologies mentioned"],
    "other": ["other important named entities"]
  },
  "next_actions": ["array of explicit or implied next steps"],
  "key_facts": ["array of specific facts, numbers, or constraints that must not be lost"]
}`

  const conversationText = messages
    .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join('\n\n')

  const userMessage = `Here is the conversation to summarise:\n\n${conversationText}`

  let claudeResponse: Response
  try {
    claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxSummaryTokens + 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(30000),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upstream request failed'
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }

  if (!claudeResponse.ok) {
    const errBody = await claudeResponse.text()
    return NextResponse.json(
      { success: false, error: `Claude API error ${claudeResponse.status}: ${errBody}` },
      { status: 502 }
    )
  }

  const claudeData = await claudeResponse.json()
  const rawContent = claudeData?.content?.[0]?.text ?? ''
  const approxOutputTokens = Math.round(rawContent.length / 4)

  let parsed: Record<string, unknown>
  try {
    const cleaned = rawContent.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to parse structured response', raw: rawContent },
      { status: 502 }
    )
  }

  const compressionRatio = approxInputTokens > approxOutputTokens
    ? Math.round((1 - approxOutputTokens / approxInputTokens) * 100)
    : 0

  return NextResponse.json({
    success: true,
    summary: parsed.summary ?? '',
    decisions: parsed.decisions ?? [],
    open_questions: parsed.open_questions ?? [],
    entities: parsed.entities ?? { people: [], projects: [], tools: [], other: [] },
    next_actions: parsed.next_actions ?? [],
    key_facts: parsed.key_facts ?? [],
    meta: {
      message_count: messages.length,
      approx_input_tokens: approxInputTokens,
      approx_output_tokens: approxOutputTokens,
      compression_ratio: compressionRatio,
    },
  })
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/summarise',
    description: 'Compress a conversation history (messages array) into structured memory. Use this when you have a multi-turn conversation between user/assistant/system roles. For unstructured text (meeting notes, documents, transcripts), use /api/extract instead.',
    body: {
      messages: 'array (required) — conversation history as [{role: "user"|"assistant"|"system", content: "string"}]. Max ~120,000 characters total.',
      focus: 'string (optional) — topic or entity to prioritise in the summary',
      max_summary_tokens: 'number (optional, 50–1000, default 300) — controls summary depth',
    },
    returns: [
      'summary: 2–4 sentence narrative of current state',
      'decisions: concrete conclusions reached',
      'open_questions: unresolved questions or ambiguities',
      'entities: categorised named entities (people, projects, tools, other)',
      'next_actions: explicit or implied next steps',
      'key_facts: specific numbers, constraints, facts that must not be lost',
      'meta: message_count, approx_input_tokens, approx_output_tokens, compression_ratio',
    ],
    example: {
      messages: [
        { role: 'user', content: 'We need to build a payments integration using Stripe.' },
        { role: 'assistant', content: 'I can help with that. Are you using one-time payments or subscriptions?' },
        { role: 'user', content: 'Subscriptions, £9.99/month. We decided to use Stripe Checkout, not the Elements SDK.' },
      ],
      focus: 'Stripe integration',
    },
  })
}
