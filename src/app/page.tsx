import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

// App host is derived from NEXT_PUBLIC_APP_URL — single source of truth, no hardcoded domains.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const APP_URL_HOST = APP_URL.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
const APP_HOSTS = [APP_URL_HOST, 'localhost', '127.0.0.1'].filter(Boolean)

function isAppHost(host: string): boolean {
  const hostname = host.split(':')[0]
  return APP_HOSTS.some(h => hostname === h)
}

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get('host') || ''

  // SEO domains must NEVER see the dashboard - send them to the app's own site
  if (!isAppHost(host)) {
    redirect(APP_URL || '/dashboard')
  }

  redirect('/dashboard')
}
