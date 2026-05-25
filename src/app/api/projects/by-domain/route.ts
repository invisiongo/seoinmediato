import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')

  if (!domain || domain.length < 5) {
    return NextResponse.json([])
  }

  try {
    const result = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(100)]
    )

    const matching = result.documents
      .filter((p) => {
        const pDomain = p.domain as string
        return pDomain.includes(domain) || domain.includes(pDomain)
      })
      .map((p) => ({
        name: p.name as string,
        domain: p.domain as string,
      }))

    return NextResponse.json(matching)
  } catch (error) {
    console.error('by-domain lookup error:', error)
    return NextResponse.json([])
  }
}
