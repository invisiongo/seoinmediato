import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Hostnames that serve the dashboard app (not SEO sites).
 *  Derived from NEXT_PUBLIC_APP_URL — single source of truth, no hardcoded domains. */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const APP_URL_HOST = APP_URL.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
const APP_HOSTS = [APP_URL_HOST, 'localhost', '127.0.0.1'].filter(Boolean)

function isAppHost(host: string): boolean {
  const hostname = host.split(':')[0] // strip port
  return APP_HOSTS.some(h => hostname === h)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''

  // www → non-www redirect (applies to all SEO domains)
  // Build URL manually — newUrl.host preserves internal :3000 port
  if (host.startsWith('www.') && !isAppHost(host)) {
    const cleanHost = host.slice(4)
    const target = `https://${cleanHost}${pathname}${request.nextUrl.search}`
    return NextResponse.redirect(target, 301)
  }

  // ─── SEO Domains: block all app routes ─────────────────────────────
  // SEO domains must NEVER access dashboard, auth pages, or root redirect.
  // Note: middleware may not reliably run for external hosts in standalone,
  // so each layer (page.tsx, layout) also has its own guard.
  if (!isAppHost(host)) {
    // Block dashboard and auth routes entirely
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/signup')) {
      return NextResponse.redirect(APP_URL || new URL('/', request.url), 301)
    }
    // Root path on SEO domain: rewrite to API landing handler
    if (pathname === '/' || pathname === '') {
      const domain = host.split(':')[0]
      return NextResponse.rewrite(new URL(`/api/sites/${domain}/landing-home`, request.url))
    }
    // Let SEO routes through (catch-all handles them)
    return NextResponse.next()
  }

  // ─── Dashboard App Routing ──────────────────────────────────────────
  const hasSession = request.cookies.getAll().some(cookie =>
    cookie.name.startsWith('a_session_')
  )

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isDashboardPage = pathname.startsWith('/dashboard')

  if (isDashboardPage && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api/ routes (pass through directly)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/).*)',
  ],
}
