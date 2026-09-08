import { NextRequest, NextResponse } from 'next/server'
import { newRequestId } from './lib/http'

const INTERNAL_HEADERS = [
  'x-middleware-subrequest',
  'x-middleware-prefetch',
]

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  for (const header of INTERNAL_HEADERS) {
    requestHeaders.delete(header)
  }

  const requestId = newRequestId(request.headers.get('x-request-id'))
  requestHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('X-Request-Id', requestId)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
