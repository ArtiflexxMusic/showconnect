import { redirect } from 'next/navigation'

// /shows heeft geen eigen pagina — stuur door naar het dashboard
export default function ShowsIndexPage() {
  redirect('/dashboard')
}
