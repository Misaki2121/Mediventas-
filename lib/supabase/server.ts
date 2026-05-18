import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = 'https://ifjrhkuyohrssmvobmhe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmanJoa3V5b2hyc3Ntdm9ibWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODA3NTIsImV4cCI6MjA5MjU1Njc1Mn0.p76WSvufPMAyA72R9ZWpVSu4CuREOgvsyEvuWTO7rXw'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
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
