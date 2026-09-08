import {
  ANTHROPIC_MESSAGES_URL,
  ANTHROPIC_VERSION,
  MODEL_ID,
} from './constants'
import { parseJsonObject } from './validate'

export type ClaudeJsonSuccess = {
  ok: true
  parsed: Record<string, unknown>
  usage: { input_tokens: number; output_tokens: number }
  stopReason: string | null
}

export type ClaudeJsonFailure = {
  ok: false
  kind: 'timeout' | 'upstream' | 'auth' | 'rate_limit' | 'parse' | 'refusal'
  status: number
  logReason: string
}

export type ClaudeJsonResult = ClaudeJsonSuccess | ClaudeJsonFailure

function usageFrom(data: Record<string, unknown>, fallbackInput: number, fallbackOutput: number) {
  const usage = data.usage
  if (usage && typeof usage === 'object' && !Array.isArray(usage)) {
    const rec = usage as Record<string, unknown>
    const input = typeof rec.input_tokens === 'number' ? rec.input_tokens : fallbackInput
    const output = typeof rec.output_tokens === 'number' ? rec.output_tokens : fallbackOutput
    return { input_tokens: input, output_tokens: output }
  }
  return { input_tokens: fallbackInput, output_tokens: fallbackOutput }
}

function textFromContent(data: Record<string, unknown>): string {
  const content = data.content
  if (!Array.isArray(content) || content.length === 0) return ''
  const first = content[0]
  if (first && typeof first === 'object' && !Array.isArray(first) && typeof (first as { text?: unknown }).text === 'string') {
    return (first as { text: string }).text
  }
  return ''
}

export async function callClaudeJson(opts: {
  apiKey: string
  system: string
  user: string
  maxTokens: number
  schema: Record<string, unknown>
  timeoutMs: number
  approxInputTokens: number
}): Promise<ClaudeJsonResult> {
  let response: Response
  try {
    response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: opts.schema,
          },
        },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    })
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { ok: false, kind: 'timeout', status: 504, logReason: 'anthropic_timeout' }
    }
    return { ok: false, kind: 'upstream', status: 502, logReason: 'anthropic_network_error' }
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, kind: 'auth', status: 503, logReason: `anthropic_auth_${response.status}` }
  }
  if (response.status === 429) {
    return { ok: false, kind: 'rate_limit', status: 429, logReason: 'anthropic_rate_limited' }
  }
  if (!response.ok) {
    return { ok: false, kind: 'upstream', status: 502, logReason: `anthropic_http_${response.status}` }
  }

  let data: Record<string, unknown>
  try {
    const json: unknown = await response.json()
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return { ok: false, kind: 'parse', status: 502, logReason: 'anthropic_invalid_envelope' }
    }
    data = json as Record<string, unknown>
  } catch {
    return { ok: false, kind: 'parse', status: 502, logReason: 'anthropic_invalid_json' }
  }

  const stopReason = typeof data.stop_reason === 'string' ? data.stop_reason : null
  if (stopReason === 'refusal') {
    return { ok: false, kind: 'refusal', status: 422, logReason: 'anthropic_refusal' }
  }

  const rawContent = textFromContent(data)
  const parsed = parseJsonObject(rawContent)
  if (!parsed) {
    return { ok: false, kind: 'parse', status: 502, logReason: 'structured_output_parse_failed' }
  }

  const approxOutput = Math.round(rawContent.length / 4)
  return {
    ok: true,
    parsed,
    usage: usageFrom(data, opts.approxInputTokens, approxOutput),
    stopReason,
  }
}

export function clientErrorFor(kind: ClaudeJsonFailure['kind']): string {
  switch (kind) {
    case 'timeout':
      return 'Upstream model request timed out'
    case 'auth':
      return 'Upstream model is not configured'
    case 'rate_limit':
      return 'Upstream model is rate limited. Retry shortly.'
    case 'refusal':
      return 'The model declined to process this input'
    case 'parse':
      return 'Failed to parse structured response'
    default:
      return 'Upstream model request failed'
  }
}
