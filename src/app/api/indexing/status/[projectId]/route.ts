import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { countKeywordsByStatus } from '@/features/keywords/services/keywordBlockService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {

  const { projectId } = await params

  try {
    // Get the most recent indexing job for this project
    const jobs = await serverDatabases.listDocuments(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, [
      Query.equal('projectId', projectId),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ])

    if (jobs.documents.length === 0) {
      return NextResponse.json({
        status: 'no_job',
        totalUrls: 0,
        processedUrls: 0,
        successUrls: 0,
        failedUrls: 0,
        lastPosition: 0,
        errorLog: '',
      })
    }

    const job = jobs.documents[0]

    // Count pending keywords for remaining calculation
    const counts = await countKeywordsByStatus(projectId)
    const remaining = (counts['generated'] || 0) + (counts['pending'] || 0)

    return NextResponse.json({
      jobId: job.$id,
      status: job.status,
      totalUrls: job.totalUrls,
      processedUrls: job.processedUrls,
      successUrls: job.successUrls,
      failedUrls: job.failedUrls,
      lastPosition: job.lastPosition,
      startedAt: job.startedAt || null,
      completedAt: job.completedAt || null,
      errorLog: job.errorLog || '',
      remaining,
    })
  } catch (error) {
    console.error('Indexing status error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
