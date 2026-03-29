import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password || ''), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, storedHash) {
  const raw = String(storedHash || '')
  if (!raw.startsWith('scrypt$')) {
    return raw === String(password || '')
  }
  const [, salt, expectedHex] = raw.split('$')
  const actual = scryptSync(String(password || ''), salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
