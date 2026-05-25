import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {

  const { projectId } = await params

  try {
    // Find running job and mark as stopped
    const jobs = await serverDatabases.listDocuments(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, [
      Query.equal('projectId', projectId),
      Query.equal('status', 'running'),
      Query.limit(1),
    ])

    if (jobs.documents.length === 0) {
      return NextResponse.json({ error: 'No hay indexacion en curso' }, { status: 404 })
    }

    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobs.documents[0].$id, {
      status: 'stopped',
    })

    return NextResponse.json({ success: true, message: 'Indexacion detenida' })
  } catch (error) {
    console.error('Indexing stop error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
