import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { getKeywordSlugsForSitemap } from '@/features/keywords/services/keywordBlockService'
import { getPublicUrl } from '@/shared/lib/seo-urls'

interface RouteParams {
  params: Promise<{ domain: string; n: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { domain: rawDomain, n } = await params
  const domain = decodeURIComponent(rawDomain)
  const page = parseInt(n, 10)

  if (isNaN(page) || page < 1) {
    return new NextResponse('Numero de sitemap invalido', { status: 400 })
  }

  try {
    // Find project
    const allProjects = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(100)]
    )
    const project = allProjects.documents.find(
      (p) => (p.domain as string).includes(domain) || domain.includes(p.domain as string)
    )

    if (!project) {
      return new NextResponse('Proyecto no encontrado', { status: 404 })
    }

    if ((project.status as string) === 'paused') {
      const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`
      return new NextResponse(empty, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      })
    }

    const URLS_PER_SITEMAP = 1000
    const offset = (page - 1) * URLS_PER_SITEMAP
    const projectDomain = (project.domain as string).replace(/\/$/, '')

    // Fetch keywords for this page
    const slugs = await getKeywordSlugsForSitemap(project.$id, offset, URLS_PER_SITEMAP)

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

    for (const item of slugs) {
      const lastmod = item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
      sitemap += `  <url>\n`
      sitemap += `    <loc>${getPublicUrl(project, item.slug)}</loc>\n`
      sitemap += `    <lastmod>${lastmod}</lastmod>\n`
      sitemap += `    <changefreq>monthly</changefreq>\n`
      sitemap += `    <priority>0.8</priority>\n`
      sitemap += `  </url>\n`
    }

    sitemap += `</urlset>`

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    })
  } catch (error) {
    console.error('Sitemap page error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}
