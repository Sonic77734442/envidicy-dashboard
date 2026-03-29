import { query } from './client'
import { verifyPassword } from './passwords'

export const SESSION_PAYLOAD_COOKIE = 'dashboard_session_payload'

export async function authenticateDashboardUser(email, password) {
  const result = await query(
    `
      select
        u.id as user_id,
        u.email,
        u.full_name,
        u.password_hash,
        am.role,
        a.id as agency_id,
        a.name as agency_name,
        cp.id as client_id,
        cp.name as client_name
      from users u
      left join agency_members am on am.user_id = u.id and am.status = 'active'
      left join agencies a on a.id = am.agency_id
      left join client_profiles cp on cp.user_id = u.id and cp.agency_id = a.id and cp.status = 'active'
      where lower(u.email) = lower($1)
      order by
        case
          when am.role = 'platform_owner' then 0
          when am.role = 'agency_admin' then 1
          else 2
        end
      limit 1
    `,
    [email]
  )
  const row = result.rows[0]
  if (!row) return null
  if (!verifyPassword(password, row.password_hash)) return null

  let visibleAccountIds = []
  if (row.role === 'client_viewer' && row.client_id) {
    const access = await query(
      `
        select da.id
        from client_account_access caa
        join dashboard_accounts da on da.id = caa.dashboard_account_id
        where caa.client_profile_id = $1
        order by da.created_at asc
      `,
      [row.client_id]
    )
    visibleAccountIds = access.rows.map((item) => item.id)
  }

  return {
    id:
      row.role === 'platform_owner'
        ? 'platform_owner'
        : row.role === 'agency_admin'
          ? `agency_admin_${row.agency_id}`
          : `client_viewer_${row.client_id}`,
    user_id: row.user_id,
    email: row.email,
    name: row.full_name,
    role: row.role,
    scope: row.role === 'platform_owner' ? 'platform' : row.role === 'agency_admin' ? 'agency' : 'client',
    agency: row.agency_id ? { id: row.agency_id, name: row.agency_name } : { id: null, name: 'Envidicy Platform' },
    client: row.client_id ? { id: row.client_id, name: row.client_name } : null,
    visibleAccountIds,
  }
}

export function readSessionPayload(cookieStore) {
  const raw = cookieStore.get(SESSION_PAYLOAD_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setSessionPayload(response, persona) {
  response.cookies.set(SESSION_PAYLOAD_COOKIE, JSON.stringify(persona), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}

export async function refreshSessionPayload(session) {
  if (!session?.user_id) return session

  const result = await query(
    `
      select
        u.id as user_id,
        u.email,
        u.full_name,
        am.role,
        a.id as agency_id,
        a.name as agency_name,
        cp.id as client_id,
        cp.name as client_name
      from users u
      left join agency_members am on am.user_id = u.id and am.status = 'active'
      left join agencies a on a.id = am.agency_id
      left join client_profiles cp on cp.user_id = u.id and cp.agency_id = a.id and cp.status = 'active'
      where u.id = $1
      order by
        case
          when am.role = 'platform_owner' then 0
          when am.role = 'agency_admin' then 1
          else 2
        end
      limit 1
    `,
    [session.user_id]
  )

  const row = result.rows[0]
  if (!row) return null

  let visibleAccountIds = []
  if (row.role === 'client_viewer' && row.client_id) {
    const access = await query(
      `
        select da.id
        from client_account_access caa
        join dashboard_accounts da on da.id = caa.dashboard_account_id
        where caa.client_profile_id = $1
          and da.status = 'active'
        order by da.created_at asc
      `,
      [row.client_id]
    )
    visibleAccountIds = access.rows.map((item) => item.id)
  }

  return {
    ...session,
    id:
      row.role === 'platform_owner'
        ? 'platform_owner'
        : row.role === 'agency_admin'
          ? `agency_admin_${row.agency_id}`
          : `client_viewer_${row.client_id}`,
    email: row.email,
    name: row.full_name,
    role: row.role,
    scope: row.role === 'platform_owner' ? 'platform' : row.role === 'agency_admin' ? 'agency' : 'client',
    agency: row.agency_id ? { id: row.agency_id, name: row.agency_name } : { id: null, name: 'Envidicy Platform' },
    client: row.client_id ? { id: row.client_id, name: row.client_name } : null,
    visibleAccountIds,
  }
}
