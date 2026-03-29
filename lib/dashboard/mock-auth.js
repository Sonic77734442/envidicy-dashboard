import { getDefaultPersona, getPersonaByEmail, getPersonaFromCookieStore, SESSION_COOKIE } from './mock-session'

const DEFAULT_PASSWORD = 'envidicy123'

export function getPasswordForPersona(persona) {
  if (!persona) return DEFAULT_PASSWORD
  if (persona.role === 'platform_owner') return 'owner123'
  if (persona.role === 'agency_admin') return 'agency123'
  if (persona.role === 'client_viewer') return 'client123'
  return DEFAULT_PASSWORD
}

export function listLoginUsers() {
  const seen = new Set()
  const personas = []
  let current = getDefaultPersona()
  if (current) personas.push(current)
  const cookieShape = {
    get() {
      return undefined
    },
  }
  const sessionPersona = getPersonaFromCookieStore(cookieShape)
  if (sessionPersona) personas.push(sessionPersona)
  return personas
}

export function buildLoginHints(personas) {
  return (personas || []).map((persona) => ({
    id: persona.id,
    email: persona.email,
    role: persona.role,
    label:
      persona.role === 'platform_owner'
        ? 'Super admin'
        : persona.role === 'agency_admin'
          ? persona.agency?.name || 'Agency'
          : persona.client?.name || 'Client',
    password_hint:
      persona.role === 'platform_owner'
        ? 'owner123'
        : persona.role === 'agency_admin'
          ? 'agency123'
          : 'client123',
  }))
}

export function authenticateByEmailPassword(email, password) {
  const persona = getPersonaByEmail(email)
  if (!persona) return null
  return getPasswordForPersona(persona) === String(password || '') ? persona : null
}

export function createSessionCookie(response, persona) {
  response.cookies.set(SESSION_COOKIE, persona.id, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}
