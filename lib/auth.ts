import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string compare. Length mismatches still run a dummy compare
 * so timing does not leak the configured secret length.
 */
export function timingSafeEqualStr(provided: string, expected: string): boolean {
  if (expected.length === 0) return false
  const expectedBuf = Buffer.from(expected, 'utf8')
  const providedBuf = Buffer.from(provided, 'utf8')
  const padded = Buffer.alloc(expectedBuf.length)
  providedBuf.copy(padded, 0, 0, Math.min(providedBuf.length, expectedBuf.length))
  const match = timingSafeEqual(padded, expectedBuf)
  return match && providedBuf.length === expectedBuf.length
}

export function bearerToken(authorization: string | null): string {
  if (!authorization) return ''
  const match = /^Bearer\s+(\S+)/i.exec(authorization.trim())
  return match?.[1] ?? ''
}

export type AccessDecision =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }

/**
 * POST endpoints that spend the host Anthropic key must be called through
 * RapidAPI (proxy-secret) or with a configured direct access key.
 *
 * Local `next dev` (NODE_ENV !== 'production') is open when no secrets are
 * configured, so developers can exercise the routes. Production fail-closes.
 */
export function evaluateAccess(headers: {
  rapidProxySecret: string | null
  apiKey: string | null
  authorization: string | null
}, env: {
  rapidProxySecret?: string
  apiAccessKey?: string
  nodeEnv?: string
} = {}): AccessDecision {
  const configuredRapid = env.rapidProxySecret ?? ''
  const configuredApi = env.apiAccessKey ?? ''
  const isProd = (env.nodeEnv ?? 'development') === 'production'

  const providedRapid = headers.rapidProxySecret ?? ''
  const providedApi = (headers.apiKey ?? '') || bearerToken(headers.authorization)

  if (configuredRapid && timingSafeEqualStr(providedRapid, configuredRapid)) {
    return { ok: true }
  }
  if (configuredApi && timingSafeEqualStr(providedApi, configuredApi)) {
    return { ok: true }
  }

  if (!configuredRapid && !configuredApi) {
    if (!isProd) return { ok: true }
    return {
      ok: false,
      status: 503,
      error: 'Service misconfigured: RAPIDAPI_PROXY_SECRET is required in production',
    }
  }

  return { ok: false, status: 401, error: 'Unauthorised' }
}
