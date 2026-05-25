import { NextRequest, NextResponse } from 'next/server'
import { ID, Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { generateSeoArticle, countWords } from '@/features/projects/services/seoArticleService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const project = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId)

    const businessName = (project.businessName as string) || (project.name as string)
    const niche = (project.niche as string) || ''
    const phone = (project.businessPhone as string) || ''
    const email = (project.businessEmail as string) || ''

    if (!niche) {
      return NextResponse.json({ error: 'El proyecto necesita un nicho configurado' }, { status: 400 })
    }

    const articleHtml = await generateSeoArticle({ businessName, niche, phone, email })
    const wordCount = countWords(articleHtml)

    // Save to project_landing (create or update)
    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      [Query.equal('projectId', projectId), Query.limit(1)]
    )

    if (existing.documents.length > 0) {
      await serverDatabases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_LANDING,
        existing.documents[0].$id,
        { seoArticleTemplate: articleHtml }
      )
    } else {
      await serverDatabases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_LANDING,
        ID.unique(),
        {
          projectId,
          seoArticleTemplate: articleHtml,
          createdAt: new Date().toISOString(),
        }
      )
    }

    return NextResponse.json({
      success: true,
      wordCount,
      preview: articleHtml.slice(0, 500) + '...',
    })
  } catch (error) {
    console.error('Generate article error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error generando articulo' },
      { status: 500 }
    )
  }
}
