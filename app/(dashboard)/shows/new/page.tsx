import type { Metadata } from 'next'
import { CreateShowForm } from '@/components/dashboard/CreateShowForm'

export const metadata: Metadata = { title: 'Nieuwe show aanmaken' }

export default function NewShowPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nieuwe show aanmaken</h1>
        <p className="text-muted-foreground mt-1">
          Vul de details in voor je nieuwe evenement.
        </p>
      </div>
      <CreateShowForm />
    </div>
  )
}
