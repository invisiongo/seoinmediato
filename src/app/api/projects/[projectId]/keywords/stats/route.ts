import { NextRequest, NextResponse } from 'next/server'
import { countKeywordsByStatus, getTotalKeywordCount } from '@/features/keywords/services/keywordBlockService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/projects/[projectId]/keywords/stats
 * Returns keyword counts by status without loading all keyword data.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const [statusCounts, totalFromBlocks] = await Promise.all([
      countKeywordsByStatus(projectId),
      getTotalKeywordCount(projectId),
    ])

    const pending = (statusCounts['pending'] || 0) + (statusCounts['generated'] || 0)
    const indexed = statusCounts['indexed'] || 0
    const failed = statusCounts['failed'] || 0

    return NextResponse.json({
      total: totalFromBlocks,
      pending,
      indexed,
      failed,
      statusCounts,
    })
  } catch (error) {
    console.error('[GET /api/keywords/stats] Error:', error)
    return NextResponse.json({ error: 'Error al obtener stats' }, { status: 500 })
  }
}
