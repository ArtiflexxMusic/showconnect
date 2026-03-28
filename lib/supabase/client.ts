import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export function createClient() {
  // Cast needed: @supabase/ssr 0.5.2 passes Schema (object) as 3rd generic, but
  // supabase-js 2.46.1 rearranged generics so 3rd must be SchemaName (string).
  // Casting to SupabaseClient<Database> uses the correct defaults from 2.46.1.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>
}
