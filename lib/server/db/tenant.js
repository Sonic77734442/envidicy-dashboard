import { query } from './client'
import { hashPassword } from './passwords'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '')
}

export async function listAgenciesDb() {
  const result = await query(
    `
      select
        a.id,
        a.name,
        a.slug,
        admin_user.full_name as admin_name,
        admin_user.email as admin_email
      from agencies a
      left join agency_members am
        on am.agency_id = a.id
       and am.role = 'agency_admin'
       and am.status = 'active'
      left join users admin_user
        on admin_user.id = am.user_id
      where a.status = 'active'
      order by a.created_at asc
    `
  )
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    admin_name: row.admin_name || '',
    admin_email: row.admin_email || '',
  }))
}

export async function createAgencyDb({ name, admin_name, admin_email, admin_password = 'agency123' }) {
  const normalizedName = String(name || '').trim()
  const normalizedEmail = String(admin_email || '').trim().toLowerCase()
  const normalizedAdminName = String(admin_name || '').trim() || `${normalizedName} Admin`
  const slug = slugify(normalizedName) || `agency_${Date.now()}`

  const existingUser = await query('select id from users where lower(email) = lower($1) limit 1', [normalizedEmail])
  if (existingUser.rows[0]) {
    throw new Error('A user with this email already exists')
  }

  const agency = await query(
    `
      insert into agencies (name, slug)
      values ($1, $2)
      returning id, name, slug
    `,
    [normalizedName, slug]
  )

  const user = await query(
    `
      insert into users (email, password_hash, full_name)
      values ($1, $2, $3)
      returning id, email, full_name
    `,
    [normalizedEmail, hashPassword(admin_password), normalizedAdminName]
  )

  await query(
    `
      insert into agency_members (agency_id, user_id, role)
      values ($1, $2, 'agency_admin')
    `,
    [agency.rows[0].id, user.rows[0].id]
  )

  return {
    id: agency.rows[0].id,
    name: agency.rows[0].name,
    slug: agency.rows[0].slug,
    admin_name: user.rows[0].full_name,
    admin_email: user.rows[0].email,
    temp_password: admin_password,
  }
}

export async function listClientsDb(agencyId) {
  const result = await query(
    `
      select
        cp.id,
        cp.name,
        u.full_name as viewer_name,
        u.email as viewer_email,
        coalesce(
          array_agg(da.id order by da.created_at) filter (where da.id is not null),
          array[]::uuid[]
        ) as account_ids
      from client_profiles cp
      left join users u on u.id = cp.user_id
      left join client_account_access caa on caa.client_profile_id = cp.id
      left join dashboard_accounts da on da.id = caa.dashboard_account_id
      where cp.agency_id = $1
        and cp.status = 'active'
      group by cp.id, cp.name, u.full_name, u.email, cp.created_at
      order by cp.created_at asc
    `,
    [agencyId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    viewer_name: row.viewer_name || row.name,
    viewer_email: row.viewer_email || '',
    persona_id: `client_viewer_${row.id}`,
    account_ids: Array.isArray(row.account_ids) ? row.account_ids : [],
  }))
}

export async function createClientDb(agencyId, { name, viewer_name, viewer_email, password = 'client123' }) {
  const normalizedName = String(name || '').trim()
  const normalizedEmail = String(viewer_email || '').trim().toLowerCase()
  const normalizedViewerName = String(viewer_name || '').trim() || normalizedName

  const existingUser = await query('select id from users where lower(email) = lower($1) limit 1', [normalizedEmail])
  if (existingUser.rows[0]) {
    throw new Error('A user with this email already exists')
  }

  const user = await query(
    `
      insert into users (email, password_hash, full_name)
      values ($1, $2, $3)
      returning id, email, full_name
    `,
    [normalizedEmail, hashPassword(password), normalizedViewerName]
  )

  await query(
    `
      insert into agency_members (agency_id, user_id, role)
      values ($1, $2, 'client_viewer')
    `,
    [agencyId, user.rows[0].id]
  )

  const profile = await query(
    `
      insert into client_profiles (agency_id, user_id, name)
      values ($1, $2, $3)
      returning id, name
    `,
    [agencyId, user.rows[0].id, normalizedName]
  )

  return {
    id: profile.rows[0].id,
    name: profile.rows[0].name,
    viewer_name: user.rows[0].full_name,
    viewer_email: user.rows[0].email,
    persona_id: `client_viewer_${profile.rows[0].id}`,
    account_ids: [],
    temp_password: password,
  }
}

export async function setClientAssignmentsDb(clientId, dashboardAccountIds = []) {
  await query('delete from client_account_access where client_profile_id = $1', [clientId])
  const uniqueIds = Array.from(new Set((dashboardAccountIds || []).filter(Boolean)))
  for (const dashboardAccountId of uniqueIds) {
    await query(
      `
        insert into client_account_access (client_profile_id, dashboard_account_id)
        values ($1, $2)
        on conflict (client_profile_id, dashboard_account_id) do nothing
      `,
      [clientId, dashboardAccountId]
    )
  }
}
