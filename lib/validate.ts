import {
  DEFAULT_MAX_SUMMARY_TOKENS,
  EXTRACT_MAX_INPUT_CHARS,
  MAX_FOCUS_CHARS,
  MAX_MESSAGES,
  MAX_SUMMARY_TOKENS_MAX,
  MAX_SUMMARY_TOKENS_MIN,
  SUMMARISE_MAX_INPUT_CHARS,
  VALID_EXTRACT_FIELDS,
  VALID_ROLES,
  type ExtractField,
  type MessageRole,
} from './constants'

export type Message = { role: MessageRole; content: string }

export type ValidationFailure = { error: string }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```(?:json)?/gi, '```').replace(/```/g, '').trim()
  try {
    const parsed: unknown = JSON.parse(cleaned)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function contentTypeIsJson(header: string | null): boolean {
  if (!header) return false
  const media = header.split(';')[0]?.trim().toLowerCase()
  return media === 'application/json'
}

export function contentLengthTooLarge(header: string | null, maxBytes: number): boolean {
  if (!header) return false
  const n = Number(header)
  return Number.isFinite(n) && n > maxBytes
}

export function validateMessages(raw: unknown): { ok: true; messages: Message[] } | { ok: false } & ValidationFailure {
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      ok: false,
      error: '"messages" must be a non-empty array of {role, content} objects',
    }
  }
  if (raw.length > MAX_MESSAGES) {
    return {
      ok: false,
      error: `"messages" exceeds ${MAX_MESSAGES} items. Batch or compress first.`,
    }
  }

  const messages: Message[] = []
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (!isRecord(item)) {
      return { ok: false, error: `messages[${i}] must be an object with "role" and "content"` }
    }
    if (typeof item.role !== 'string' || !VALID_ROLES.includes(item.role as MessageRole)) {
      return {
        ok: false,
        error: `Invalid role at messages[${i}]. Must be user, assistant, or system.`,
      }
    }
    if (typeof item.content !== 'string' || item.content.length === 0) {
      return {
        ok: false,
        error: `messages[${i}].content must be a non-empty string`,
      }
    }
    messages.push({ role: item.role as MessageRole, content: item.content })
  }
  return { ok: true, messages }
}

export function validateFocus(raw: unknown): { ok: true; focus?: string } | { ok: false } & ValidationFailure {
  if (raw === undefined || raw === null) return { ok: true }
  if (typeof raw !== 'string') {
    return { ok: false, error: '"focus" must be a string' }
  }
  if (raw.length > MAX_FOCUS_CHARS) {
    return {
      ok: false,
      error: `"focus" exceeds ${MAX_FOCUS_CHARS.toLocaleString()} characters`,
    }
  }
  const trimmed = raw.trim()
  return { ok: true, focus: trimmed.length > 0 ? trimmed : undefined }
}

export function validateMaxSummaryTokens(
  raw: unknown
): { ok: true; maxSummaryTokens: number } | { ok: false } & ValidationFailure {
  if (raw === undefined || raw === null) {
    return { ok: true, maxSummaryTokens: DEFAULT_MAX_SUMMARY_TOKENS }
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || !Number.isFinite(raw)) {
    return {
      ok: false,
      error: 'max_summary_tokens must be an integer between 50 and 1000',
    }
  }
  if (raw < MAX_SUMMARY_TOKENS_MIN || raw > MAX_SUMMARY_TOKENS_MAX) {
    return {
      ok: false,
      error: 'max_summary_tokens must be an integer between 50 and 1000',
    }
  }
  return { ok: true, maxSummaryTokens: raw }
}

export function validateConversationSize(messages: Message[]): ValidationFailure | null {
  const rawText = messages.map((m) => `${m.role}: ${m.content}`).join('\n')
  if (rawText.length > SUMMARISE_MAX_INPUT_CHARS) {
    return {
      error: `Input exceeds ${SUMMARISE_MAX_INPUT_CHARS.toLocaleString()} character limit (received ${rawText.length.toLocaleString()}). Truncate or batch your messages.`,
    }
  }
  return null
}

export function validateExtractText(raw: unknown): { ok: true; text: string } | { ok: false } & ValidationFailure {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: false, error: '"text" must be a non-empty string' }
  }
  if (raw.length > EXTRACT_MAX_INPUT_CHARS) {
    return {
      ok: false,
      error: `text exceeds ${EXTRACT_MAX_INPUT_CHARS.toLocaleString()} character limit (received ${raw.length.toLocaleString()}). Split into smaller chunks.`,
    }
  }
  return { ok: true, text: raw }
}

export function validateExtractFields(
  raw: unknown
): { ok: true; fields: ExtractField[] } | { ok: false } & ValidationFailure {
  if (raw === undefined || raw === null) {
    return { ok: true, fields: [...VALID_EXTRACT_FIELDS] }
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: '"extract" must be a non-empty array of field names' }
  }
  const invalid: string[] = []
  const valid: ExtractField[] = []
  for (const item of raw) {
    if (typeof item !== 'string' || !(VALID_EXTRACT_FIELDS as readonly string[]).includes(item)) {
      invalid.push(typeof item === 'string' ? item : typeof item)
    } else {
      valid.push(item as ExtractField)
    }
  }
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `Invalid field(s): ${invalid.join(', ')}. Valid options are: ${VALID_EXTRACT_FIELDS.join(', ')}`,
    }
  }
  return { ok: true, fields: uniqueStrings(valid) as ExtractField[] }
}

export function summariseEntities(value: unknown): {
  people: string[]
  projects: string[]
  tools: string[]
  other: string[]
} {
  const rec = isRecord(value) ? value : {}
  return {
    people: asStringArray(rec.people),
    projects: asStringArray(rec.projects),
    tools: asStringArray(rec.tools),
    other: asStringArray(rec.other),
  }
}

export function extractEntities(value: unknown): {
  people: string[]
  organisations: string[]
  projects: string[]
  tools: string[]
  locations: string[]
  other: string[]
} {
  const rec = isRecord(value) ? value : {}
  return {
    people: asStringArray(rec.people),
    organisations: asStringArray(rec.organisations),
    projects: asStringArray(rec.projects),
    tools: asStringArray(rec.tools),
    locations: asStringArray(rec.locations),
    other: asStringArray(rec.other),
  }
}

export function asTimeline(value: unknown): Array<{ event: string; date_or_order: string }> {
  if (!Array.isArray(value)) return []
  const out: Array<{ event: string; date_or_order: string }> = []
  for (const item of value) {
    if (!isRecord(item)) continue
    if (typeof item.event !== 'string') continue
    out.push({
      event: item.event,
      date_or_order: typeof item.date_or_order === 'string' ? item.date_or_order : '',
    })
  }
  return out
}

export function compressionRatio(inputTokens: number, outputTokens: number): number {
  if (inputTokens <= 0 || outputTokens >= inputTokens) return 0
  return Math.round((1 - outputTokens / inputTokens) * 100)
}

export function approxTokensFromChars(chars: number): number {
  return Math.round(chars / 4)
}
