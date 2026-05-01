import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
    let message = error.message
    if (
      error.message.includes('Invalid login credentials') ||
      error.message.includes('invalid_credentials')
    ) {
      message = 'Email ou mot de passe incorrect.'
    } else if (error.message.includes('Email not confirmed')) {
      message =
        "Votre email n'est pas encore confirmé. Vérifiez votre boîte de réception et vos spams."
    }
    return NextResponse.json({ error: message }, { status: 401 })
  }

  // Attach session cookies explicitly on the response object.
  // This is the only reliable way in Next.js 14 — cookies().set() in a
  // Server Action does not make it into the redirect response.
  const response = NextResponse.json({ success: true, redirectTo: redirectTo || '/dashboard' })
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
