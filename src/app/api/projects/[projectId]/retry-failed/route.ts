import { NextRequest, NextResponse } from 'next/server'
import { resetKeywordStatuses } from '@/features/keywords/services/keywordBlockService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const reset = await resetKeywordStatuses(projectId, ['failed'], 'pending')
    return NextResponse.json({ success: true, reset })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    )
  }
}
