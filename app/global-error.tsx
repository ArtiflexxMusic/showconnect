'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a0a0a', color: '#fafafa' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Er ging iets mis</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
              Er is een onverwachte fout opgetreden. Probeer de pagina opnieuw te laden.
            </p>
            {error.digest && (
              <p style={{ fontSize: '11px', color: '#555', marginBottom: '16px', fontFamily: 'monospace' }}>
                Code: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: '8px 20px', background: '#fafafa', color: '#0a0a0a',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600,
              }}
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
