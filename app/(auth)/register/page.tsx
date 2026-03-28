import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = { title: 'Account aanmaken – CueBoard' }

interface PageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams
  return <RegisterForm redirectTo={redirect} />
}
