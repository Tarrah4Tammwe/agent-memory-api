import type { NextRequest, NextResponse } from 'next/server'
import { evaluateAccess } from './auth'
import { jsonError } from './http'

export function gatePostAccess(req: NextRequest, requestId: string): NextResponse | null {
  const decision = evaluateAccess(
    {
      rapidProxySecret: req.headers.get('x-rapidapi-proxy-secret'),
      apiKey: req.headers.get('x-api-key'),
      authorization: req.headers.get('authorization'),
    },
    {
      rapidProxySecret: process.env.RAPIDAPI_PROXY_SECRET,
      apiAccessKey: process.env.API_ACCESS_KEY,
      nodeEnv: process.env.NODE_ENV,
    }
  )
  if (decision.ok) return null
  return jsonError(decision.status, decision.error, requestId)
}

export function anthropicKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY
  return key && key.trim().length > 0 ? key : undefined
}
