import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAuthError } from '@/lib/auth-errors'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, redirectTo } = body as {
    email: string
    password: string
    redirectTo?: string
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Veuillez remplir tous les champs.' }, { status: 400 })
  }

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const msg = supabaseAuthError(error.message, error.status)
    const httpStatus = error.status === 429 ? 429 : 401
    return NextResponse.json({ error: msg }, { status: httpStatus })
  }

  const response = NextResponse.json({ success: true, redirectTo: redirectTo || '/dashboard' })
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
