/**
 * Cached getProfile helper voor Next.js Server Components.
 *
 * React.cache() dedupliceert binnen dezelfde request: layout en page
 * delen zo dezelfde profile-query, ipv ieder een aparte Supabase-roundtrip.
 */
import { cache } from 'react'
import { createClient } from './server'
import { getCachedUser } from './get-user'

export const getCachedProfile = cache(async () => {
  const user = await getCachedUser()
  if (!user) return null
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return profile
})
