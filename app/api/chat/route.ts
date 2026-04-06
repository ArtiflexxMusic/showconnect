import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getSystemPrompt } from '@/lib/chatbot/system-prompt'

export const maxDuration = 30

// Rate limit: 30 berichten per IP per uur.
// Gebruikt de Upstash Redis die is geprovisioneerd via de Vercel Marketplace
// (`KV_REST_API_URL` / `KV_REST_API_TOKEN`). Als die env vars ontbreken,
// wordt rate limiting overgeslagen (bv. in lokale dev zonder Upstash).
let ratelimit: Ratelimit | null = null
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    analytics: true,
    prefix: 'cueboard-chat',
  })
}

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(req: Request) {
  if (ratelimit) {
    const ip = getClientIp(req)
    const { success, reset } = await ratelimit.limit(ip)
    if (!success) {
      const minutes = Math.ceil((reset - Date.now()) / 60_000)
      return new Response(
        JSON.stringify({
          error: `Je hebt de limiet bereikt (30 berichten per uur). Probeer het over ${minutes} minuten opnieuw, of mail naar info@cueboard.nl.`,
        }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      )
    }
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: 'anthropic/claude-sonnet-4.6',
    system: getSystemPrompt(),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
