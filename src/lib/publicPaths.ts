// Paths reachable without a cookie session.
// /api/ai/* does its own Bearer-token auth inside each handler (see src/lib/server/ai.ts).
// /api/qr/* is intentionally unauthenticated like the Python endpoint it replaces:
// the QR only encodes the public /l/{code} redirect URL.
export const PUBLIC_PATHS = ['/login', '/community', '/l/', '/auth/callback', '/api/ai/', '/api/qr/']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))
}
