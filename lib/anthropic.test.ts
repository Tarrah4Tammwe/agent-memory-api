import { describe, it, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { callClaudeJson, clientErrorFor } from './anthropic'

const ORIGINAL_FETCH = globalThis.fetch

describe('callClaudeJson', () => {
  beforeEach(() => {
    mock.reset()
  })

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  it('parses structured JSON and usage from a successful response', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: '{"summary":"ok"}' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 12, output_tokens: 4 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch

    const result = await callClaudeJson({
      apiKey: 'sk-test',
      system: 'sys',
      user: 'user',
      maxTokens: 100,
      schema: { type: 'object' },
      timeoutMs: 1000,
      approxInputTokens: 10,
    })

    assert.equal(result.ok, true)
    if (result.ok) {
      assert.deepEqual(result.parsed, { summary: 'ok' })
      assert.deepEqual(result.usage, { input_tokens: 12, output_tokens: 4 })
    }
  })

  it('never surfaces upstream error bodies and maps status classes', async () => {
    globalThis.fetch = (async () =>
      new Response('{"error":{"message":"invalid x-api-key sk-live-secret"}}', {
        status: 401,
      })) as typeof fetch

    const result = await callClaudeJson({
      apiKey: 'sk-test',
      system: 'sys',
      user: 'user',
      maxTokens: 100,
      schema: { type: 'object' },
      timeoutMs: 1000,
      approxInputTokens: 10,
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.kind, 'auth')
      assert.equal(result.status, 503)
      assert.equal(result.logReason.includes('sk-live'), false)
      assert.equal(clientErrorFor(result.kind).includes('sk-'), false)
    }
  })

  it('maps 429 and refusal stop reasons without leaking raw text', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ content: [{ type: 'text', text: 'nope' }], stop_reason: 'refusal' }), {
        status: 200,
      })) as typeof fetch

    const refusal = await callClaudeJson({
      apiKey: 'sk-test',
      system: 'sys',
      user: 'user',
      maxTokens: 100,
      schema: { type: 'object' },
      timeoutMs: 1000,
      approxInputTokens: 10,
    })
    assert.equal(refusal.ok, false)
    if (!refusal.ok) {
      assert.equal(refusal.kind, 'refusal')
      assert.equal(refusal.status, 422)
    }

    globalThis.fetch = (async () => new Response('rate', { status: 429 })) as typeof fetch
    const limited = await callClaudeJson({
      apiKey: 'sk-test',
      system: 'sys',
      user: 'user',
      maxTokens: 100,
      schema: { type: 'object' },
      timeoutMs: 1000,
      approxInputTokens: 10,
    })
    assert.equal(limited.ok, false)
    if (!limited.ok) {
      assert.equal(limited.kind, 'rate_limit')
      assert.equal(limited.status, 429)
    }
  })

  it('fails closed when the model returns non-object JSON', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ content: [{ type: 'text', text: '[1,2,3]' }] }), {
        status: 200,
      })) as typeof fetch

    const result = await callClaudeJson({
      apiKey: 'sk-test',
      system: 'sys',
      user: 'user',
      maxTokens: 100,
      schema: { type: 'object' },
      timeoutMs: 1000,
      approxInputTokens: 10,
    })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.kind, 'parse')
  })
})
