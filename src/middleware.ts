import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define protected routes and their required plans
const PROTECTED_ROUTES = {
  '/editor': ['creator', 'studio'],
  '/generate': ['creator', 'studio'],
  '/dashboard': null, // accessible to all authenticated users
}

export async function middleware(request: NextRequest) {
  // BYPASS: Disable middleware in development if Supabase not configured
  const isDev = process.env.NODE_ENV === 'development'
  const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')
  
  if (isDev && !supabaseConfigured) {
    console.log('[middleware] Bypassed - Supabase not configured')
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies for this middleware flow
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Crucially: Set cookies on response for browser to receive updated auth cookies
          // (e.g., refreshed session tokens)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if route requires authentication
  const protectedRoute = Object.keys(PROTECTED_ROUTES).find((route) =>
    pathname.startsWith(route)
  )

  if (protectedRoute) {
    // Redirect to login if not authenticated
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check plan requirements (if any)
    const requiredPlans = PROTECTED_ROUTES[protectedRoute as keyof typeof PROTECTED_ROUTES]
    
    if (requiredPlans) {
      // Query billing status
      const { data: billingData } = await supabase
        .from('billing_status')
        .select('plan, status')
        .eq('user_id', user.id)
        .single()

      // Block if no active subscription or wrong plan
      if (
        !billingData ||
        billingData.status !== 'active' ||
        !requiredPlans.includes(billingData.plan)
      ) {
        const pricingUrl = new URL('/pricing', request.url)
        pricingUrl.searchParams.set('locked', protectedRoute.slice(1))
        pricingUrl.searchParams.set('required', requiredPlans[0])
        return NextResponse.redirect(pricingUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
