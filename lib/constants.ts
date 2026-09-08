export const MODEL_ID = 'claude-haiku-4-5-20251001'
export const ANTHROPIC_VERSION = '2023-06-01'
export const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'

export const VALID_ROLES = ['user', 'assistant', 'system'] as const
export type MessageRole = (typeof VALID_ROLES)[number]

export const VALID_EXTRACT_FIELDS = [
  'decisions',
  'open_questions',
  'entities',
  'next_actions',
  'key_facts',
  'timeline',
  'constraints',
] as const
export type ExtractField = (typeof VALID_EXTRACT_FIELDS)[number]

export const SUMMARISE_MAX_INPUT_CHARS = 120_000
export const EXTRACT_MAX_INPUT_CHARS = 100_000
export const SUMMARISE_MAX_BODY_BYTES = 160_000
export const EXTRACT_MAX_BODY_BYTES = 130_000
export const MAX_MESSAGES = 500
export const MAX_FOCUS_CHARS = 2_000
export const MAX_SUMMARY_TOKENS_MIN = 50
export const MAX_SUMMARY_TOKENS_MAX = 1_000
export const DEFAULT_MAX_SUMMARY_TOKENS = 300
export const SUMMARISE_TIMEOUT_MS = 30_000
export const EXTRACT_TIMEOUT_MS = 25_000
export const EXTRACT_MAX_TOKENS_MIN = 800
export const EXTRACT_MAX_TOKENS_MAX = 2_000
