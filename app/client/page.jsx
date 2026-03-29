import { redirect } from 'next/navigation'
import { requirePagePersona } from '../../lib/server/dashboard-api/page-auth'

export default async function ClientPage() {
  await requirePagePersona()
  redirect('/dashboard')
}
