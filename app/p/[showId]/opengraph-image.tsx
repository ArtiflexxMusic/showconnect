import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const alt = 'CueBoard show'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ showId: string }>
}

export default async function ShowOgImage({ params }: Props) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: show } = await supabase
    .from('shows')
    .select('name, date, venue, description')
    .eq('id', showId)
    .single()

  const name        = show?.name        ?? 'Show'
  const venue       = show?.venue       ?? null
  const description = show?.description ?? null
  const dateStr     = show?.date
    ? new Date(show.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #050f09 0%, #0a1f0f 60%, #050f09 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
          padding: '64px 72px',
        }}
      >
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(52,211,153,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '-100px', right: '-100px',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '14px', height: '14px',
            borderRadius: '50%',
            background: '#34d399',
            boxShadow: '0 0 16px 6px rgba(52,211,153,0.5)',
          }} />
          <span style={{
            fontSize: '18px', fontWeight: 900,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
          }}>
            CUEBOARD
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', flex: 1, justifyContent: 'center', paddingTop: '32px' }}>
          {/* Show badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#34d399',
            }} />
            <span style={{
              fontSize: '13px', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: '#34d399',
            }}>
              Live Show
            </span>
          </div>

          {/* Show name */}
          <div style={{
            fontSize: name.length > 30 ? '52px' : '64px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.05,
            marginBottom: '24px',
            maxWidth: '900px',
          }}>
            {name}
          </div>

          {/* Meta: date + venue */}
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            {dateStr && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '20px', color: 'rgba(255,255,255,0.45)',
              }}>
                <span style={{ color: '#34d399' }}>📅</span>
                {dateStr}
              </div>
            )}
            {venue && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '20px', color: 'rgba(255,255,255,0.45)',
              }}>
                <span style={{ color: '#34d399' }}>📍</span>
                {venue}
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <div style={{
              marginTop: '20px',
              fontSize: '18px',
              color: 'rgba(255,255,255,0.30)',
              maxWidth: '800px',
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>
              {description}
            </div>
          )}
        </div>

        {/* Bottom: powered by */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '13px', color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.03em',
        }}>
          Bekijk de live rundown op CueBoard
        </div>
      </div>
    ),
    { ...size }
  )
}
