import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    roles: [
      {
        key: 'platform_owner',
        label: 'Envidicy',
        description: 'Controls the platform and agency lifecycle.',
      },
      {
        key: 'agency_admin',
        label: 'Agency admin',
        description: 'Connects Meta, imports accounts, and grants client access.',
      },
      {
        key: 'client_viewer',
        label: 'Client viewer',
        description: 'Sees only assigned reports without Meta authentication.',
      },
    ],
  })
}
