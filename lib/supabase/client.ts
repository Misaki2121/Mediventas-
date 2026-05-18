import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://ifjrhkuyohrssmvobmhe.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmanJoa3V5b2hyc3Ntdm9ibWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODA3NTIsImV4cCI6MjA5MjU1Njc1Mn0.p76WSvufPMAyA72R9ZWpVSu4CuREOgvsyEvuWTO7rXw'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
