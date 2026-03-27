// Caller Mode layout – geen sidebar, geen header, volledig scherm
export default function CallerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
