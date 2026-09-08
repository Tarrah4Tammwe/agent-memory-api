import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractSchemaFor, SUMMARISE_SCHEMA } from './schemas'

describe('JSON schemas', () => {
  it('marks summarise objects additionalProperties false and requires core fields', () => {
    assert.equal(SUMMARISE_SCHEMA.additionalProperties, false)
    assert.ok(Array.isArray(SUMMARISE_SCHEMA.required))
    assert.ok((SUMMARISE_SCHEMA.required as string[]).includes('summary'))
  })

  it('builds extract schemas with only the requested fields', () => {
    const schema = extractSchemaFor(['decisions', 'timeline'])
    const properties = schema.properties as Record<string, unknown>
    assert.deepEqual(Object.keys(properties), ['decisions', 'timeline'])
    assert.deepEqual(schema.required, ['decisions', 'timeline'])
    assert.equal(schema.additionalProperties, false)
    assert.equal('key_facts' in properties, false)
  })
})
