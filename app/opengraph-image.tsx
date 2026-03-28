import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CueBoard — Show OS voor live events'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050f09 0%, #0a1f0f 50%, #050f09 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
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
          top: '10%', left: '30%',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            width: '18px', height: '18px',
            borderRadius: '50%',
            background: '#34d399',
            boxShadow: '0 0 24px 8px rgba(52,211,153,0.6)',
          }} />
          <span style={{
            fontSize: '28px', fontWeight: 900,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#ffffff',
          }}>
            CUEBOARD
          </span>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: '58px', fontWeight: 800,
          color: '#ffffff', textAlign: 'center',
          lineHeight: 1.1, marginBottom: '20px',
          maxWidth: '900px',
        }}>
          Show OS voor
          <span style={{ color: '#34d399' }}> live events</span>
        </div>

        {/* Sub */}
        <div style={{
          fontSize: '22px', color: 'rgba(255,255,255,0.45)',
          textAlign: 'center', maxWidth: '700px',
        }}>
          Caller · Crew · Cast · Presentator — realtime gesynchroniseerd
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
          {['Rundown', 'Realtime', 'Cast Portal', 'Stage Output'].map((label) => (
            <div key={label} style={{
              padding: '8px 18px',
              borderRadius: '999px',
              border: '1px solid rgba(52,211,153,0.25)',
              background: 'rgba(52,211,153,0.06)',
              color: '#34d399',
              fontSize: '15px', fontWeight: 600,
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div style={{
          position: 'absolute', bottom: '28px',
          fontSize: '14px', color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.05em',
        }}>
          cueboard-app.vercel.app
        </div>
      </div>
    ),
    { ...size }
  )
}
