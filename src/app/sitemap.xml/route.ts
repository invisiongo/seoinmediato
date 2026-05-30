import { NextRequest, NextResponse } from 'next/server'
import { isAppHost, getDomainFromHost, findProjectsByDomain } from '@/features/sites/services/projectLookup'
import { getSitemapUrl } from '@/shared/lib/seo-urls'

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || ''

  // App host: return empty sitemap
  if (isAppHost(host)) {
    const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</sitemapindex>`
    return new NextResponse(empty, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }

  const domain = getDomainFromHost(host)

  try {
    const projects = await findProjectsByDomain(domain)

    if (projects.length === 0) {
      return new NextResponse('Proyecto no encontrado', { status: 404 })
    }

    let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n`
    sitemapIndex += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

    for (const project of projects) {
      if ((project.status as string) === 'paused') continue
      const sitemapUrl = getSitemapUrl(project)
      sitemapIndex += `  <sitemap>\n`
      sitemapIndex += `    <loc>${sitemapUrl}</loc>\n`
      sitemapIndex += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`
      sitemapIndex += `  </sitemap>\n`
    }

    sitemapIndex += `</sitemapindex>`

    return new NextResponse(sitemapIndex, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  } catch (error) {
    console.error('Sitemap index error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}
