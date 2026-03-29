import { getPersonaFromCookieStore } from '../../dashboard/mock-session'
import { readSessionPayload, refreshSessionPayload } from '../db/auth'
import { hasDatabase } from '../db/client'

export async function getSessionPersona(cookieStore) {
  const dbSession = readSessionPayload(cookieStore)
  if (dbSession) {
    if (hasDatabase()) {
      return refreshSessionPayload(dbSession)
    }
    return dbSession
  }
  return getPersonaFromCookieStore(cookieStore)
}
