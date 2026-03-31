import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes die een geldige sessie vereisen
const PROTECTED_PATHS = ['/dashboard', '/shows', '/rundown', '/admin', '/profile', '/billing', '/invoice', '/print']

// Routes waarbij we de sessie willen vernieuwen/checken (ook login-pagina)
const AUTH_RELEVANT_PATHS = [...PROTECTED_PATHS, '/login', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Snelle skip voor volledig publieke routes ──────────────────────────────
  // Geen Supabase round-trip nodig voor de landing page, Green Room portal,
  // status-scherm, publieke presentaties, etc. Dit scheelt 50-200ms per request.
  const needsAuthCheck = AUTH_RELEVANT_PATHS.some((p) => pathname.startsWith(p))
  if (!needsAuthCheck) {
    return NextResponse.next()
  }

  // ── Auth check alleen voor relevante routes ────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valideert de JWT server-side — veilig maar kost 1 round-trip
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

  // Niet ingelogd en op beschermde route → naar login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Al ingelogd op login/register → naar dashboard
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Sla _next/static, _next/image, favicon en statische bestanden over
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
