import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { contentLengthTooLarge, contentTypeIsJson, isRecord } from './validate'

export function newRequestId(incoming?: string | null): string {
  if (incoming && /^[\w-]{8,64}$/.test(incoming)) return incoming
  return randomUUID()
}

export function jsonError(
  status: number,
  error: string,
  requestId: string,
  extra?: Record<string, unknown>
): NextResponse {
  const res = NextResponse.json(
    { success: false, error, request_id: requestId, ...extra },
    { status }
  )
  res.headers.set('X-Request-Id', requestId)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export function jsonOk(payload: Record<string, unknown>, requestId: string, status = 200): NextResponse {
  const res = NextResponse.json({ ...payload, request_id: requestId }, { status })
  res.headers.set('X-Request-Id', requestId)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export function logServerError(requestId: string, route: string, reason: string, status?: number): void {
  console.error(
    JSON.stringify({
      level: 'error',
      request_id: requestId,
      route,
      reason,
      status: status ?? null,
    })
  )
}

export function optionsResponse(methods: string): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: methods,
      'Cache-Control': 'no-store',
    },
  })
}

export async function readJsonBody(
  req: NextRequest,
  requestId: string,
  maxBytes: number
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  if (!contentTypeIsJson(req.headers.get('content-type'))) {
    return { ok: false, response: jsonError(415, 'Content-Type must be application/json', requestId) }
  }
  if (contentLengthTooLarge(req.headers.get('content-length'), maxBytes)) {
    return { ok: false, response: jsonError(413, 'Request body too large', requestId) }
  }

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return { ok: false, response: jsonError(400, 'Invalid request body', requestId) }
  }
  if (raw.length > maxBytes) {
    return { ok: false, response: jsonError(413, 'Request body too large', requestId) }
  }
  if (raw.trim().length === 0) {
    return { ok: false, response: jsonError(400, 'Invalid JSON body', requestId) }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, response: jsonError(400, 'Invalid JSON body', requestId) }
  }
  if (!isRecord(parsed)) {
    return { ok: false, response: jsonError(400, 'JSON body must be an object', requestId) }
  }
  return { ok: true, body: parsed }
}
