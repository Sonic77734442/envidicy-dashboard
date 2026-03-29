import { Pool } from 'pg'

let pool = null

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || ''
}

export function hasDatabase() {
  return Boolean(getDatabaseUrl())
}

export function getPool() {
  if (!hasDatabase()) return null
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: getDatabaseUrl().includes('render.com') ? { rejectUnauthorized: false } : undefined,
    })
  }
  return pool
}

export async function query(text, params = []) {
  const db = getPool()
  if (!db) {
    throw new Error('DATABASE_URL is not configured')
  }
  return db.query(text, params)
}
