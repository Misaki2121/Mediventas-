import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Variables de entorno faltantes:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    })
    throw new Error(
      'Faltan las variables de entorno de Supabase. ' +
      'Por favor configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en la seccion Vars del menu de configuracion.'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
