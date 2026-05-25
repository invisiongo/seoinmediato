import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { countWords } from '@/features/projects/services/seoArticleService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

async function getLandingDoc(projectId: string) {
  const res = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECT_LANDING,
    [Query.equal('projectId', projectId), Query.limit(1)]
  )
  return res.documents.length > 0 ? res.documents[0] : null
}

async function getParentProjectId(projectId: string): Promise<string | null> {
  try {
    const project = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId)
    return (project.parentProjectId as string) || null
  } catch {
    return null
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    let doc = await getLandingDoc(projectId)

    // Fallback to parent's article if this is a region
    if (!doc || !(doc.seoArticleTemplate as string)) {
      const parentId = await getParentProjectId(projectId)
      if (parentId) {
        const parentDoc = await getLandingDoc(parentId)
        if (parentDoc?.seoArticleTemplate) {
          doc = parentDoc
        }
      }
    }

    const template = (doc?.seoArticleTemplate as string) || ''

    return NextResponse.json({
      template,
      wordCount: template ? countWords(template) : 0,
    })
  } catch (error) {
    console.error('Get article error:', error)
    return NextResponse.json({ error: 'Error al obtener articulo' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const { template } = await request.json()
    const doc = await getLandingDoc(projectId)

    if (doc) {
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECT_LANDING, doc.$id, {
        seoArticleTemplate: template || '',
      })
    } else {
      const { ID } = await import('node-appwrite')
      await serverDatabases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_LANDING,
        ID.unique(),
        {
          projectId,
          seoArticleTemplate: template || '',
          createdAt: new Date().toISOString(),
        }
      )
    }

    return NextResponse.json({
      success: true,
      wordCount: template ? countWords(template) : 0,
    })
  } catch (error) {
    console.error('Save article error:', error)
    return NextResponse.json({ error: 'Error al guardar articulo' }, { status: 500 })
  }
}
