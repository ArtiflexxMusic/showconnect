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
          .no-print { display: none !important; }
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 12mm 16mm; size: A4 portrait; }
          .page-break { page-break-before: always; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
      {children}
    </>
  )
}
