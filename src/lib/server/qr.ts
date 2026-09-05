import QRCode from 'qrcode'

// QR label generation — port of GET /qr/{qr_code} in api/main.py.
// The Python service rendered a 400x200 PNG with Pillow; here we compose an
// SVG with the same layout, texts and colors (SVG works for both <img> and print).

/** Escapes XML special characters for safe text-node interpolation. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Resolves the public frontend URL used inside the QR payload.
 * FRONTEND_URL wins when set; otherwise falls back to the request origin,
 * which keeps previews and same-origin production deploys correct.
 */
export function resolveFrontendUrl(
  request: Request,
  metaEnv: Record<string, string | undefined> = import.meta.env,
): string {
  return metaEnv.FRONTEND_URL ?? new URL(request.url).origin
}

/**
 * Builds the 400x200 SVG label: 160px teal QR on the left over a #f8fafc
 * background, captions on the right (port of get_qr_image in api/main.py).
 */
export async function buildQrLabelSvg(qrCode: string, frontendUrl: string): Promise<string> {
  const qrSvg = await QRCode.toString(`${frontendUrl}/l/${qrCode}`, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#0f766e', light: '#ffffff' },
  })
  // Nest the generated QR <svg> at the left slot with a fixed 160px size.
  const nestedQr = qrSvg.replace('<svg ', '<svg x="20" y="20" width="160" height="160" ')

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">' +
    '<rect width="400" height="200" fill="#f8fafc"/>' +
    nestedQr +
    '<text x="200" y="42" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f766e">IoT Assistant</text>' +
    '<text x="200" y="72" font-family="monospace" font-size="10" fill="#64748b">Escanea para ver</text>' +
    '<text x="200" y="92" font-family="monospace" font-size="10" fill="#64748b">el inventario de</text>' +
    '<text x="200" y="112" font-family="monospace" font-size="10" fill="#64748b">esta ubicación</text>' +
    `<text x="200" y="152" font-family="monospace" font-size="10" fill="#94a3b8">ID: ${escapeXml(qrCode.slice(0, 20))}</text>` +
    '</svg>'
  )
}
