import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionPersona } from './session-persona'

export async function requirePagePersona() {
  const persona = await getSessionPersona(await cookies())
  if (!persona) {
    redirect('/login')
  }
  return persona
}

export async function requirePlatformPagePersona() {
  const persona = await requirePagePersona()
  if (persona.role !== 'platform_owner') {
    redirect('/dashboard')
  }
  return persona
}

export async function requireAgencyPagePersona() {
  const persona = await requirePagePersona()
  if (!(persona.role === 'platform_owner' || persona.role === 'agency_admin')) {
    redirect('/dashboard')
  }
  return persona
}
