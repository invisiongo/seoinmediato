import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

interface RouteParams {
  params: Promise<{ domain: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { domain: rawDomain } = await params
  const domain = decodeURIComponent(rawDomain)

  try {
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
      // Paused: disallow all
      const disallowed = `User-agent: *\nDisallow: /\n`
      return new NextResponse(disallowed, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const projectDomain = (project.domain as string).replace(/\/$/, '')

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
