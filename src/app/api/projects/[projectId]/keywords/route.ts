import { NextRequest, NextResponse } from 'next/server'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { saveKeywordBlocks, deleteKeywordBlocks, getAllKeywordEntries, invalidateSlugCache } from '@/features/keywords/services/keywordBlockService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/keywords?page=1&limit=50&status=all&search=
 * Returns paginated keywords from blocks.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))
    const statusFilter = url.searchParams.get('status') || 'all'
    const search = (url.searchParams.get('search') || '').toLowerCase().trim()

    const entries = await getAllKeywordEntries(projectId)

    // Apply filters
    let filtered = entries
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter)
    }
    if (search) {
      filtered = filtered.filter(
        e => e.keyword.toLowerCase().includes(search) || e.slug.toLowerCase().includes(search)
      )
    }

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginated = filtered.slice(offset, offset + limit)

    const keywords = paginated.map((e, i) => ({
      $id: `block-${offset + i}`,
      projectId,
      keyword: e.keyword,
      slug: e.slug,
      status: e.status,
      indexedAt: e.indexedAt || undefined,
      createdAt: '',
    }))

    return NextResponse.json({ keywords, total, totalPages, page })
  } catch (error) {
    console.error('[GET /api/keywords] Error:', error)
    const message = error instanceof Error ? error.message : 'Error al obtener keywords'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/projects/[projectId]/keywords
 * Bulk save keywords as blocks (5000 per block document).
 * Body: { keywords: { keyword: string; slug: string }[] }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const { keywords } = await request.json() as {
      keywords: { keyword: string; slug: string }[]
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords provided' }, { status: 400 })
    }

    const saved = await saveKeywordBlocks(projectId, keywords)
    invalidateSlugCache(projectId)
    return NextResponse.json({ saved })
  } catch (error) {
    console.error('[POST /api/keywords] Error:', error)
    const message = error instanceof Error ? error.message : 'Error al guardar keywords'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const deleted = await deleteKeywordBlocks(projectId)
    invalidateSlugCache(projectId)

    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId, {
      totalKeywords: 0,
      totalIndexed: 0,
    })

    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    console.error('[DELETE /api/keywords] Error:', error)
    const message = error instanceof Error ? error.message : 'Error al eliminar keywords'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
