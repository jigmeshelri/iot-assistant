// Paths reachable without a cookie session.
// /api/ai/* does its own Bearer-token auth inside each handler (see src/lib/server/ai.ts),
// so it must bypass the cookie-based gate in src/middleware.ts.
export const PUBLIC_PATHS = ['/login', '/community', '/l/', '/auth/callback', '/api/ai/']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))
}
