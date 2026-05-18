import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Credenciales de Supabase - usar variables de entorno o fallback a valores directos
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ifjrhkuyohrssmvobmhe.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmanJoa3V5b2hyc3Ntdm9ibWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODI1ODAsImV4cCI6MjA2Mjc1ODU4MH0.9v6sYOBKnKzEDHlFF0FdpHOLp4zOtnamnJKVu4WWvME'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
