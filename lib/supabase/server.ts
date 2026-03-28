import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  // Cast needed: @supabase/ssr 0.5.2 passes Schema (object) as 3rd generic, but
  // supabase-js 2.46.1 rearranged generics so 3rd must be SchemaName (string).
  // Casting to SupabaseClient<Database> uses the correct defaults from 2.46.1.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component – cookies kunnen niet worden gezet
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>
}
