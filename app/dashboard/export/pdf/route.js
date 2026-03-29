import { cookies } from 'next/headers'
import { buildMockPdf } from '../../../../lib/dashboard/mock-data'
import { getSessionPersona } from '../../../../lib/server/dashboard-api/session-persona'

export async function GET() {
  const persona = await getSessionPersona(await cookies())
  if (!persona) {
    return Response.json({ detail: 'Unauthorized' }, { status: 401 })
  }
  return new Response(buildMockPdf(), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="dashboard-mock.pdf"',
    },
  })
}
