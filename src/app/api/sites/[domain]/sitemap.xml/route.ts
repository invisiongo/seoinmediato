import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { getSitemapUrl } from '@/shared/lib/seo-urls'

interface RouteParams {
  params: Promise<{ domain: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { domain: rawDomain } = await params
  const domain = decodeURIComponent(rawDomain)

  try {
    // Find all projects for this domain
    const allProjects = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(100)]
    )
    const projects = allProjects.documents.filter(
      (p) => (p.domain as string).includes(domain) || domain.includes(p.domain as string)
    )

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
