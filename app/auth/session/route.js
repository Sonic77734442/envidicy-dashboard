import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '../../../lib/dashboard/mock-session'
import { authenticateByEmailPassword, createSessionCookie } from '../../../lib/dashboard/mock-auth'
import { authenticateDashboardUser, SESSION_PAYLOAD_COOKIE, setSessionPayload } from '../../../lib/server/db/auth'
import { ensureBootstrapData } from '../../../lib/server/db/bootstrap'
import { hasDatabase } from '../../../lib/server/db/client'
import { getSessionPersona } from '../../../lib/server/dashboard-api/session-persona'

export async function GET() {
  const cookieStore = await cookies()
    const persona = await getSessionPersona(cookieStore)
  if (!persona) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ session: persona })
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  if (!email || !password) {
    return NextResponse.json({ detail: 'Email and password are required' }, { status: 400 })
  }
  let persona = null
  if (hasDatabase()) {
    await ensureBootstrapData()
    persona = await authenticateDashboardUser(email, password)
  } else {
    persona = authenticateByEmailPassword(email, password)
  }
  if (!persona) {
    return NextResponse.json({ detail: 'Invalid email or password' }, { status: 401 })
  }
  const response = NextResponse.json({ session: persona })
  if (hasDatabase()) {
    setSessionPayload(response, persona)
    response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  } else {
    createSessionCookie(response, persona)
  }
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ status: 'ok' })
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  response.cookies.set(SESSION_PAYLOAD_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
