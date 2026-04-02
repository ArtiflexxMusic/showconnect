'use client'

export default function PrintButton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }} className="no-print">
      <button
        onClick={() => window.print()}
        style={{
          padding: '9px 22px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          border: 'none',
          background: '#111827',
          color: 'white',
          letterSpacing: '0.01em',
        }}
      >
        🖨️ Afdrukken / Opslaan als PDF
      </button>
    </div>
  )
}
