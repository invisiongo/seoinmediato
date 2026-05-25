import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { resetKeywordStatuses } from '@/features/keywords/services/keywordBlockService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {

  const { projectId } = await params

  try {
    // Reset all indexing jobs for this project
    const jobs = await serverDatabases.listDocuments(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, [
      Query.equal('projectId', projectId),
      Query.limit(100),
    ])

    for (const job of jobs.documents) {
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, job.$id, {
        status: 'pending',
        processedUrls: 0,
        successUrls: 0,
        failedUrls: 0,
        lastPosition: 0,
        completedAt: null,
        errorLog: '',
      })
    }

    // Reset all keywords from "indexed" or "failed" back to "generated"
    await resetKeywordStatuses(projectId, ['indexed', 'failed'], 'generated')

    // Reset project totalIndexed
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId, {
      totalIndexed: 0,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message: 'Indexacion reseteada' })
  } catch (error) {
    console.error('Indexing reset error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
