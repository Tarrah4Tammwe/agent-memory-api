import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface ExtractRequest {
  text: string
  extract?: string[]
}

const VALID_FIELDS = ['decisions', 'open_questions', 'entities', 'next_actions', 'key_facts', 'timeline', 'constraints']

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 })
  }

  let body: ExtractRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { text, extract } = body

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: '"text" must be a non-empty string' },
      { status: 400 }
    )
  }

  if (text.length > 100000) {
    return NextResponse.json(
      { success: false, error: `text exceeds 100,000 character limit (received ${text.length.toLocaleString()}). Split into smaller chunks.` },
      { status: 400 }
    )
  }

  // Validate extract fields — error on invalid, don't silently drop
  let requestedFields: string[]
  if (extract !== undefined) {
    if (!Array.isArray(extract) || extract.length === 0) {
      return NextResponse.json(
        { success: false, error: '"extract" must be a non-empty array of field names' },
        { status: 400 }
      )
    }
    const invalidFields = extract.filter(f => !VALID_FIELDS.includes(f))
    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid field(s): ${invalidFields.join(', ')}. Valid options are: ${VALID_FIELDS.join(', ')}`,
        },
        { status: 400 }
      )
    }
    requestedFields = extract
  } else {
    requestedFields = VALID_FIELDS
  }

  const fieldDescriptions: Record<string, string> = {
    decisions: '"decisions": ["array of concrete decisions, conclusions, or commitments"]',
    open_questions: '"open_questions": ["array of unresolved questions or outstanding items"]',
    entities: '"entities": {"people": [], "organisations": [], "projects": [], "tools": [], "locations": [], "other": []}',
    next_actions: '"next_actions": ["array of action items or next steps, with owner if mentioned"]',
    key_facts: '"key_facts": ["specific facts, numbers, dates, constraints, or requirements"]',
    timeline: '"timeline": [{"event": "string", "date_or_order": "string"}]',
    constraints: '"constraints": ["hard limitations, blockers, or non-negotiable requirements"]',
  }

  const requestedSchema = requestedFields
    .map(f => fieldDescriptions[f])
    .join(',\n  ')

  const systemPrompt = `You are a precise information extractor for AI agent pipelines.
Extract only what is explicitly present or directly implied in the text. Do not invent or infer beyond what is stated.
Respond ONLY with a valid JSON object — no preamble, no markdown fences.

Return this exact structure (only the fields requested):
{
  ${requestedSchema}
}`

  // Scale max_tokens to input size — floor 800, ceil 2000
  const scaledMaxTokens = Math.min(2000, Math.max(800, Math.round(text.length / 50)))

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
        max_tokens: scaledMaxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Extract from the following text:\n\n${text}` }],
      }),
      signal: AbortSignal.timeout(25000),
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

  // Only return the explicitly requested fields — never spread unknown keys from Claude's output
  const safeOutput: Record<string, unknown> = {}
  for (const field of requestedFields) {
    safeOutput[field] = parsed[field] ?? null
  }

  return NextResponse.json({
    success: true,
    ...safeOutput,
    meta: {
      fields_extracted: requestedFields,
      approx_input_tokens: Math.round(text.length / 4),
    },
  })
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/extract',
    description: 'Extract structured facts from any unstructured text — meeting notes, documents, transcripts, agent outputs. Use this for free-form text. For structured conversation histories (user/assistant turns), use /api/summarise instead.',
    body: {
      text: 'string (required) — any text up to 100,000 characters',
      extract: `array (optional) — specific fields to return. Omit to return all. Must be valid field names only — invalid fields return a 400 error. Options: ${VALID_FIELDS.join(', ')}`,
    },
    returns: [
      'decisions: concrete conclusions or commitments',
      'open_questions: unresolved items',
      'entities: people, organisations, projects, tools, locations, other',
      'next_actions: tasks or action items with owner if mentioned',
      'key_facts: numbers, dates, constraints, requirements',
      'timeline: ordered events with dates or sequence',
      'constraints: hard limits, blockers, non-negotiables',
      'meta: fields_extracted, approx_input_tokens',
    ],
    example: {
      text: 'Meeting notes 10 June: Sarah confirmed the budget is capped at £50k. We decided to go with AWS over GCP. John to send contract by Friday. Still unclear on GDPR compliance approach.',
      extract: ['decisions', 'key_facts', 'next_actions', 'open_questions'],
    },
  })
}
