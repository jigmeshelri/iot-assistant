import type { APIRoute } from 'astro'
import { jsonError } from '../../../lib/server/ai'
import { buildQrLabelSvg, resolveFrontendUrl } from '../../../lib/server/qr'

// Public on purpose: the Python endpoint had no auth either, and the QR only
// encodes the public /l/{code} redirect URL.
export const GET: APIRoute = async ({ params, request }) => {
  const code = params.code
  if (!code) return jsonError(404, 'Not found')

  const svg = await buildQrLabelSvg(code, resolveFrontendUrl(request))
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      // QR payloads are immutable per code.
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
