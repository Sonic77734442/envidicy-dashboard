import { query } from './client'
import { hashPassword } from './passwords'

export async function ensureBootstrapData() {
  const existing = await query('select count(*)::int as count from users')
  if (existing.rows[0]?.count > 0) return

  const owner = await query(
    `insert into users (email, password_hash, full_name)
     values ($1, $2, $3)
     returning id`,
    ['owner@envidicy.com', hashPassword('owner123'), 'Envidicy Platform Owner']
  )

  const agencyAdmin = await query(
    `insert into users (email, password_hash, full_name)
     values ($1, $2, $3)
     returning id`,
    ['admin@smartlab.kz', hashPassword('agency123'), 'Smart Lab Admin']
  )

  const ticketonUser = await query(
    `insert into users (email, password_hash, full_name)
     values ($1, $2, $3)
     returning id`,
    ['marketing@ticketon.kz', hashPassword('client123'), 'Ticketon Client']
  )

  const eurostarUser = await query(
    `insert into users (email, password_hash, full_name)
     values ($1, $2, $3)
     returning id`,
    ['team@eurostar.kz', hashPassword('client123'), 'EuroStar Client']
  )

  const agency = await query(
    `insert into agencies (name, slug)
     values ($1, $2)
     returning id`,
    ['Smart Lab', 'smartlab']
  )

  await query(
    `insert into agency_members (agency_id, user_id, role)
     values ($1, $2, 'platform_owner'),
            ($1, $3, 'agency_admin')`,
    [agency.rows[0].id, owner.rows[0].id, agencyAdmin.rows[0].id]
  )

  const ticketonProfile = await query(
    `insert into client_profiles (agency_id, user_id, name)
     values ($1, $2, $3)
     returning id`,
    [agency.rows[0].id, ticketonUser.rows[0].id, 'Ticketon']
  )

  const eurostarProfile = await query(
    `insert into client_profiles (agency_id, user_id, name)
     values ($1, $2, $3)
     returning id`,
    [agency.rows[0].id, eurostarUser.rows[0].id, 'EuroStar']
  )

  await query(
    `insert into agency_members (agency_id, user_id, role)
     values ($1, $2, 'client_viewer'),
            ($1, $3, 'client_viewer')`,
    [agency.rows[0].id, ticketonUser.rows[0].id, eurostarUser.rows[0].id]
  )

  return {
    agency_id: agency.rows[0].id,
    owner_user_id: owner.rows[0].id,
    agency_admin_user_id: agencyAdmin.rows[0].id,
    ticketon_profile_id: ticketonProfile.rows[0].id,
    eurostar_profile_id: eurostarProfile.rows[0].id,
  }
}
