import type { Metadata } from 'next'
import { HelpPage } from '@/components/layout/HelpPage'

export const metadata: Metadata = { title: 'Help & Uitleg — CueBoard' }

export default function HelpRoute() {
  return <HelpPage />
}
