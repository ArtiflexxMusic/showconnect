/**
 * Cached getUser helper voor Next.js Server Components.
 *
 * React.cache() dedupliceert calls binnen dezelfde render-tree:
 * layout.tsx, page.tsx en andere server components die in dezelfde
 * request uitvoeren, delen automatisch het resultaat — dus maar
 * één Supabase-roundtrip per pageload in plaats van meerdere.
 */
import { cache } from 'react'
import { createClient } from './server'

export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
