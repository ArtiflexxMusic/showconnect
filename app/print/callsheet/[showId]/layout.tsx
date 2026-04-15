/**
 * Layout voor callsheet printpagina — server component.
 * CSS staat hier (server component) zodat er GEEN React hydration conflict is
 * met het client component (CallsheetPrintView). De <style> tag in een
 * server component wordt correct gerenderd zonder hydration issues.
 */

export default function CallsheetPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          background: #f0f2f8 !important;
          color: #1e1b4b !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
          font-size: 13px;
          line-height: 1.5;
        }
        @media print {
          /* Toon alles dat niet expliciet .no-print is */
          .no-print { display: none !important; }
          /* Strip dark-theme kleuren zodat tekst zichtbaar blijft in print */
          html, body {
            background: white !important;
            color: #0a0f0d !important;
            color-scheme: light !important;
          }
          /* Ensure print kleur-preservatie overal */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Strip alle position:fixed (Toaster, chat-widget) zodat ze de print niet blokkeren */
          [style*="position: fixed"], [style*="position:fixed"], .fixed { display: none !important; }
          /* min-height: 100vh breekt pagination — reset naar auto in print */
          [style*="min-height: 100vh"], [style*="minHeight: 100vh"] { min-height: auto !important; }
          @page { margin: 12mm 16mm; size: A4 portrait; }
          .page-break { page-break-before: always; }
          tr, .avoid-break { page-break-inside: avoid; }
        }
      `}</style>
      {children}
    </>
  )
}
