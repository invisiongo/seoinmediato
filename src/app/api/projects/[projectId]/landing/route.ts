import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Query } from 'node-appwrite'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!
const API_KEY = process.env.APPWRITE_API_KEY!
const DB = 'seoinmediato'

function getDb() {
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
  return new Databases(client)
}

async function getParentProjectId(db: Databases, projectId: string): Promise<string | null> {
  try {
    const project = await db.getDocument(DB, 'projects', projectId)
    return (project.parentProjectId as string) || null
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const db = getDb()

  const result = await db.listDocuments(DB, 'project_landing', [
    Query.equal('projectId', projectId),
    Query.limit(1),
  ])

  if (result.documents.length > 0) {
    return NextResponse.json(result.documents[0], { status: 200 })
  }

  // Fallback to parent's landing if this is a region
  const parentId = await getParentProjectId(db, projectId)
  if (parentId) {
    const parentResult = await db.listDocuments(DB, 'project_landing', [
      Query.equal('projectId', parentId),
      Query.limit(1),
    ])
    if (parentResult.documents.length > 0) {
      return NextResponse.json(parentResult.documents[0], { status: 200 })
    }
  }

  return NextResponse.json(null, { status: 200 })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const body = await request.json()
  const db = getDb()

  const result = await db.listDocuments(DB, 'project_landing', [
    Query.equal('projectId', projectId),
    Query.limit(1),
  ])

  if (result.documents.length === 0) {
    return NextResponse.json({ error: 'Landing not found' }, { status: 404 })
  }

  const doc = await db.updateDocument(DB, 'project_landing', result.documents[0].$id, body)
  return NextResponse.json(doc, { status: 200 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const db = getDb()

  const result = await db.listDocuments(DB, 'project_landing', [
    Query.equal('projectId', projectId),
    Query.limit(1),
  ])

  if (result.documents.length === 0) {
    return NextResponse.json({ error: 'Landing not found' }, { status: 404 })
  }

  await db.deleteDocument(DB, 'project_landing', result.documents[0].$id)
  return NextResponse.json({ success: true }, { status: 200 })
}
