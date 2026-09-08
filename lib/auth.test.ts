import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bearerToken, evaluateAccess, timingSafeEqualStr } from './auth'

describe('timingSafeEqualStr', () => {
  it('accepts identical strings', () => {
    assert.equal(timingSafeEqualStr('rapid-secret', 'rapid-secret'), true)
  })

  it('rejects different strings of the same length', () => {
    assert.equal(timingSafeEqualStr('rapid-secret', 'rapid-secred'), false)
  })

  it('rejects different lengths', () => {
    assert.equal(timingSafeEqualStr('short', 'much-longer-secret'), false)
  })

  it('rejects empty expected secret', () => {
    assert.equal(timingSafeEqualStr('', ''), false)
    assert.equal(timingSafeEqualStr('x', ''), false)
  })
})

describe('bearerToken', () => {
  it('parses Bearer tokens', () => {
    assert.equal(bearerToken('Bearer abc.def'), 'abc.def')
    assert.equal(bearerToken('bearer abc'), 'abc')
  })

  it('returns empty for missing or malformed headers', () => {
    assert.equal(bearerToken(null), '')
    assert.equal(bearerToken('Basic abc'), '')
    assert.equal(bearerToken('Bearer'), '')
  })
})

describe('evaluateAccess', () => {
  const emptyHeaders = { rapidProxySecret: null, apiKey: null, authorization: null }

  it('allows local development when no secrets are configured', () => {
    const decision = evaluateAccess(emptyHeaders, { nodeEnv: 'development' })
    assert.deepEqual(decision, { ok: true })
  })

  it('fail-closes in production when no secrets are configured', () => {
    const decision = evaluateAccess(emptyHeaders, { nodeEnv: 'production' })
    assert.equal(decision.ok, false)
    if (!decision.ok) {
      assert.equal(decision.status, 503)
    }
  })

  it('accepts a matching RapidAPI proxy secret', () => {
    const decision = evaluateAccess(
      { rapidProxySecret: 'proxy-secret', apiKey: null, authorization: null },
      { rapidProxySecret: 'proxy-secret', nodeEnv: 'production' }
    )
    assert.deepEqual(decision, { ok: true })
  })

  it('rejects a wrong RapidAPI proxy secret', () => {
    const decision = evaluateAccess(
      { rapidProxySecret: 'nope', apiKey: null, authorization: null },
      { rapidProxySecret: 'proxy-secret', nodeEnv: 'production' }
    )
    assert.equal(decision.ok, false)
    if (!decision.ok) assert.equal(decision.status, 401)
  })

  it('accepts X-API-Key and Bearer when API_ACCESS_KEY is set', () => {
    const viaHeader = evaluateAccess(
      { rapidProxySecret: null, apiKey: 'direct-key', authorization: null },
      { apiAccessKey: 'direct-key', nodeEnv: 'production' }
    )
    const viaBearer = evaluateAccess(
      { rapidProxySecret: null, apiKey: null, authorization: 'Bearer direct-key' },
      { apiAccessKey: 'direct-key', nodeEnv: 'production' }
    )
    assert.deepEqual(viaHeader, { ok: true })
    assert.deepEqual(viaBearer, { ok: true })
  })

  it('does not accept the RapidAPI header as the API access key', () => {
    const decision = evaluateAccess(
      { rapidProxySecret: 'direct-key', apiKey: null, authorization: null },
      { apiAccessKey: 'direct-key', nodeEnv: 'production' }
    )
    assert.equal(decision.ok, false)
  })
})
