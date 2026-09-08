import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  asStringArray,
  asTimeline,
  compressionRatio,
  contentLengthTooLarge,
  contentTypeIsJson,
  extractEntities,
  parseJsonObject,
  uniqueStrings,
  validateConversationSize,
  validateExtractFields,
  validateExtractText,
  validateFocus,
  validateMaxSummaryTokens,
  validateMessages,
} from './validate'
import { EXTRACT_MAX_INPUT_CHARS, MAX_FOCUS_CHARS, MAX_MESSAGES } from './constants'

describe('validateMessages', () => {
  it('accepts a well-formed conversation', () => {
    const result = validateMessages([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ])
    assert.equal(result.ok, true)
  })

  it('rejects empty arrays and non-arrays', () => {
    assert.equal(validateMessages([]).ok, false)
    assert.equal(validateMessages('nope').ok, false)
  })

  it('rejects null items, invalid roles, and empty content', () => {
    assert.equal(validateMessages([null]).ok, false)
    assert.equal(validateMessages([{ role: 'tool', content: 'x' }]).ok, false)
    assert.equal(validateMessages([{ role: 'user', content: '' }]).ok, false)
    assert.equal(validateMessages([{ role: 'user', content: 12 }]).ok, false)
  })

  it('rejects oversized message lists', () => {
    const tooMany = Array.from({ length: MAX_MESSAGES + 1 }, () => ({ role: 'user', content: 'x' }))
    assert.equal(validateMessages(tooMany).ok, false)
  })
})

describe('validateFocus', () => {
  it('allows omitted or blank focus', () => {
    assert.deepEqual(validateFocus(undefined), { ok: true })
    assert.deepEqual(validateFocus('  '), { ok: true, focus: undefined })
  })

  it('rejects non-strings and oversized values', () => {
    assert.equal(validateFocus(1).ok, false)
    assert.equal(validateFocus('f'.repeat(MAX_FOCUS_CHARS + 1)).ok, false)
  })
})

describe('validateMaxSummaryTokens', () => {
  it('defaults, accepts integers, and rejects NaN/floats/out-of-range', () => {
    const def = validateMaxSummaryTokens(undefined)
    assert.equal(def.ok, true)
    if (def.ok) assert.equal(def.maxSummaryTokens, 300)

    assert.equal(validateMaxSummaryTokens(50).ok, true)
    assert.equal(validateMaxSummaryTokens(1000).ok, true)
    assert.equal(validateMaxSummaryTokens(Number.NaN).ok, false)
    assert.equal(validateMaxSummaryTokens(50.5).ok, false)
    assert.equal(validateMaxSummaryTokens(Infinity).ok, false)
    assert.equal(validateMaxSummaryTokens(49).ok, false)
    assert.equal(validateMaxSummaryTokens(1001).ok, false)
  })
})

describe('validateConversationSize', () => {
  it('rejects conversations over the character cap', () => {
    const huge = [{ role: 'user' as const, content: 'a'.repeat(120_001) }]
    assert.ok(validateConversationSize(huge))
    assert.equal(validateConversationSize([{ role: 'user', content: 'short' }]), null)
  })
})

describe('validateExtractText', () => {
  it('requires a non-empty string under the cap', () => {
    assert.equal(validateExtractText('').ok, false)
    assert.equal(validateExtractText('   ').ok, false)
    assert.equal(validateExtractText('notes').ok, true)
    assert.equal(validateExtractText('x'.repeat(EXTRACT_MAX_INPUT_CHARS + 1)).ok, false)
  })
})

describe('validateExtractFields', () => {
  it('defaults to all fields and rejects invalid names', () => {
    const all = validateExtractFields(undefined)
    assert.equal(all.ok, true)
    if (all.ok) assert.ok(all.fields.includes('timeline'))

    const bad = validateExtractFields(['decisions', 'nope'])
    assert.equal(bad.ok, false)
    if (!bad.ok) assert.match(bad.error, /nope/)

    assert.equal(validateExtractFields(['decisions', 1]).ok, false)
    assert.equal(validateExtractFields([]).ok, false)
  })

  it('deduplicates valid fields in order', () => {
    const result = validateExtractFields(['key_facts', 'decisions', 'key_facts'])
    assert.equal(result.ok, true)
    if (result.ok) assert.deepEqual(result.fields, ['key_facts', 'decisions'])
  })
})

describe('parsers and coercions', () => {
  it('parses JSON objects and strips markdown fences', () => {
    const parsed = parseJsonObject('```json\n{"a":1}\n```')
    assert.deepEqual(parsed, { a: 1 })
    assert.equal(parseJsonObject('[1]'), null)
    assert.equal(parseJsonObject('not json'), null)
  })

  it('coerces arrays, entities, and timeline entries', () => {
    assert.deepEqual(asStringArray(['a', 1, 'b']), ['a', 'b'])
    assert.deepEqual(uniqueStrings(['a', 'a', 'b']), ['a', 'b'])
    assert.deepEqual(extractEntities({ people: ['Ada'], extra: true }), {
      people: ['Ada'],
      organisations: [],
      projects: [],
      tools: [],
      locations: [],
      other: [],
    })
    assert.deepEqual(asTimeline([{ event: 'kickoff', date_or_order: '1' }, 'skip', { event: 1 }]), [
      { event: 'kickoff', date_or_order: '1' },
    ])
  })

  it('floors compression ratio at zero', () => {
    assert.equal(compressionRatio(100, 40), 60)
    assert.equal(compressionRatio(10, 50), 0)
    assert.equal(compressionRatio(0, 10), 0)
  })

  it('validates JSON content type and content-length', () => {
    assert.equal(contentTypeIsJson('application/json'), true)
    assert.equal(contentTypeIsJson('application/json; charset=utf-8'), true)
    assert.equal(contentTypeIsJson('text/plain'), false)
    assert.equal(contentTypeIsJson(null), false)
    assert.equal(contentLengthTooLarge('200', 100), true)
    assert.equal(contentLengthTooLarge('50', 100), false)
    assert.equal(contentLengthTooLarge(null, 100), false)
  })
})
