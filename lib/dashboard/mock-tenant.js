const tenantState = {
  agencies: [
    {
      id: 'agency_smartlab',
      name: 'Smart Lab',
      slug: 'smartlab',
      admin_name: 'Smart Lab Admin',
      admin_email: 'admin@smartlab.kz',
    },
  ],
  clientsByAgency: {
    agency_smartlab: [
      {
        id: 'client_ticketon',
        name: 'Ticketon',
        viewer_name: 'Ticketon Client',
        viewer_email: 'marketing@ticketon.kz',
        persona_id: 'client_viewer_ticketon',
      },
      {
        id: 'client_eurostar',
        name: 'EuroStar',
        viewer_name: 'EuroStar Client',
        viewer_email: 'team@eurostar.kz',
        persona_id: 'client_viewer_eurostar',
      },
    ],
  },
  assignmentsByAgency: {
    agency_smartlab: {
      client_ticketon: [102, 201],
      client_eurostar: [201, 301],
    },
  },
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '')
}

export function listAgencies() {
  return tenantState.agencies.map((agency) => ({ ...agency }))
}

export function getAgency(agencyId = null) {
  if (agencyId) {
    return tenantState.agencies.find((agency) => agency.id === agencyId) || null
  }
  return tenantState.agencies[0] || null
}

export function createAgency({ name, admin_name, admin_email }) {
  const slug = slugify(name) || `agency_${Date.now()}`
  const agency = {
    id: `agency_${slug}`,
    name: String(name || '').trim(),
    slug,
    admin_name: String(admin_name || '').trim() || `${name} Admin`,
    admin_email: String(admin_email || '').trim().toLowerCase(),
  }
  tenantState.agencies.push(agency)
  tenantState.clientsByAgency[agency.id] = []
  tenantState.assignmentsByAgency[agency.id] = {}
  return { ...agency }
}

export function listAgencyAdmins() {
  return tenantState.agencies.map((agency) => ({
    agency_id: agency.id,
    agency_name: agency.name,
    name: agency.admin_name,
    email: agency.admin_email,
    persona_id: `agency_admin_${agency.slug}`,
  }))
}

export function listClients(agencyId) {
  const assignments = tenantState.assignmentsByAgency[agencyId] || {}
  const clients = tenantState.clientsByAgency[agencyId] || []
  return clients.map((client) => ({
    ...client,
    account_ids: [...(assignments[client.id] || [])],
  }))
}

export function getClientById(agencyId, clientId) {
  return listClients(agencyId).find((client) => client.id === clientId) || null
}

export function createClient(agencyId, { name, viewer_name, viewer_email }) {
  const clientId = `client_${slugify(name) || Date.now()}`
  const personaId = `client_viewer_${slugify(name) || Date.now()}`
  const client = {
    id: clientId,
    name: String(name || '').trim(),
    viewer_name: String(viewer_name || '').trim() || String(name || '').trim(),
    viewer_email: String(viewer_email || '').trim().toLowerCase(),
    persona_id: personaId,
  }
  if (!tenantState.clientsByAgency[agencyId]) tenantState.clientsByAgency[agencyId] = []
  if (!tenantState.assignmentsByAgency[agencyId]) tenantState.assignmentsByAgency[agencyId] = {}
  tenantState.clientsByAgency[agencyId].push(client)
  tenantState.assignmentsByAgency[agencyId][client.id] = []
  return getClientById(agencyId, client.id)
}

export function setClientAssignments(agencyId, clientId, accountIds, validAccountIds = []) {
  const client = (tenantState.clientsByAgency[agencyId] || []).find((row) => row.id === clientId)
  if (!client) return null
  const validIds = new Set(validAccountIds.map((id) => Number(id)))
  if (!tenantState.assignmentsByAgency[agencyId]) tenantState.assignmentsByAgency[agencyId] = {}
  tenantState.assignmentsByAgency[agencyId][clientId] = Array.from(
    new Set((accountIds || []).map((id) => Number(id)).filter((id) => validIds.has(id)))
  )
  return getClientById(agencyId, clientId)
}

export function getClientAssignments(agencyId, clientId) {
  return [...((tenantState.assignmentsByAgency[agencyId] || {})[clientId] || [])]
}

export function listClientPersonas() {
  return tenantState.agencies.flatMap((agency) =>
    (tenantState.clientsByAgency[agency.id] || []).map((client) => ({
      id: client.persona_id,
      agency_id: agency.id,
      client_id: client.id,
      email: client.viewer_email,
      name: client.viewer_name,
      client_name: client.name,
      visibleAccountIds: getClientAssignments(agency.id, client.id),
    }))
  )
}
