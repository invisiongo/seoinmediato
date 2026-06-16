import { NextRequest, NextResponse } from 'next/server'
import { isAppHost, getDomainFromHost, findProjectByDomain } from '@/features/sites/services/projectLookup'
import { ensureProtocol } from '@/shared/lib/seo-urls'

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || ''

  // App host: return a basic robots.txt for the dashboard
  if (isAppHost(host)) {
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const domain = getDomainFromHost(host)

  try {
    const project = await findProjectByDomain(domain)

    if (!project) {
      return new NextResponse('Proyecto no encontrado', { status: 404 })
    }

    if ((project.status as string) === 'paused') {
      return new NextResponse('User-agent: *\nDisallow: /\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const projectDomain = ensureProtocol((project.domain as string).replace(/\/$/, ''))

    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${projectDomain}/sitemap.xml
`

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('Robots.txt error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}
