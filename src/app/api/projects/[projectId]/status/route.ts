import { NextRequest, NextResponse } from 'next/server'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {

  const { projectId } = await params

  try {
    const { status } = await request.json()

    if (!['active', 'paused'].includes(status)) {
      return NextResponse.json({ error: 'Status invalido' }, { status: 400 })
    }

    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId, {
      status,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Project status error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
