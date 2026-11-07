import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_ROLE_COOKIE, getRoleHome } from '@/lib/demo-profile'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Mode local dev avant configuration des variables Supabase
  const demoMode =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

  if (demoMode) {
    const pathname = request.nextUrl.pathname
    if (pathname === '/') {
      const role = request.cookies.get(DEMO_ROLE_COOKIE)?.value
      const url = request.nextUrl.clone()
      url.pathname = getRoleHome(role ?? 'admin')
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const publicRoutes = ['/login', '/auth/callback', '/rdv']
  const isPublicRoute = publicRoutes.some(r => pathname.startsWith(r))
  const isPublicApi = pathname.startsWith('/api/webhooks')

  if (isPublicApi || isPublicRoute) {
    return supabaseResponse
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
