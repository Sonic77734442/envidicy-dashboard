import './globals.css'

export const metadata = {
  title: 'Envidicy Dashboard',
  description: 'Agency analytics SaaS for Envidicy, agencies, and their clients.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}

