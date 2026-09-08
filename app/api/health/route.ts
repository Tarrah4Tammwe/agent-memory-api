import { anthropicKey } from '@/lib/access'
import { MODEL_ID } from '@/lib/constants'
import { jsonOk, newRequestId, optionsResponse } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET() {
  return jsonOk(
    {
      success: true,
      status: 'ok',
      model: MODEL_ID,
      configured: Boolean(anthropicKey()),
    },
    newRequestId()
  )
}

export function OPTIONS() {
  return optionsResponse('GET, OPTIONS')
}
