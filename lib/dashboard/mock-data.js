export const mockProfile = {
  email: 'agency@smartlab.kz',
  name: 'Smart Lab Dashboard',
}

export const mockWallet = {
  balance: 8250000,
  currency: 'KZT',
}

export const mockRates = {
  rates: {
    USD: { sell: 512.4 },
    EUR: { sell: 556.9 },
  },
}

export const mockAccounts = [
  { id: 101, platform: 'meta', external_id: 'act_12001', name: 'Meta | Smart Lab', currency: 'USD', status: 'active' },
  { id: 102, platform: 'meta', external_id: 'act_12002', name: 'Meta | Ticketon', currency: 'USD', status: 'active' },
  { id: 201, platform: 'google', external_id: '4171696211', name: 'Google | EuroStar', currency: 'USD', status: 'active' },
  { id: 202, platform: 'google', external_id: '4171696212', name: 'Google | Kolesa', currency: 'USD', status: 'active' },
  { id: 301, platform: 'tiktok', external_id: '778899', name: 'TikTok | Dan KZ', currency: 'USD', status: 'active' },
]

export function getAccounts(platform = null) {
  const filter = String(platform || '').toLowerCase()
  return filter ? mockAccounts.filter((row) => row.platform === filter) : mockAccounts
}

export function buildMockPdf() {
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 61 >>
stream
BT
/F1 16 Tf
30 90 Td
(Envidicy Dashboard Mock PDF Export) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000352 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
422
%%EOF`
}
