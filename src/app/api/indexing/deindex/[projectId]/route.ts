import { NextRequest, NextResponse } from 'next/server'
import { ID } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { randomDelay } from '@/features/indexing/services/googleIndexingService'
import { getKeywordsByStatus, updateKeywordStatus } from '@/features/keywords/services/keywordBlockService'
import { getPublicUrl } from '@/shared/lib/seo-urls'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

// Track running deindex jobs
const runningDeindex = new Set<string>()

export async function POST(_request: NextRequest, { params }: RouteParams) {

  const { projectId } = await params

  try {
    if (runningDeindex.has(projectId)) {
      return NextResponse.json({ error: 'Ya hay una desindexacion en curso' }, { status: 409 })
    }

    const project = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId)
    const tokenJson = project.googleTokenJson as string
    if (!tokenJson?.trim()) {
      return NextResponse.json({ error: 'Token de Google no configurado' }, { status: 400 })
    }

    const domain = (project.domain as string).replace(/\/$/, '')

    // Get all indexed keywords
    const indexedKeywords = (await getKeywordsByStatus(projectId, ['indexed']))
      .map(kw => ({ slug: kw.slug }))

    if (indexedKeywords.length === 0) {
      return NextResponse.json({ error: 'No hay URLs indexadas para desindexar' }, { status: 400 })
    }

    // Create deindex job
    const job = await serverDatabases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      ID.unique(),
      {
        projectId,
        status: 'running',
        totalUrls: indexedKeywords.length,
        processedUrls: 0,
        successUrls: 0,
        failedUrls: 0,
        lastPosition: 0,
        startedAt: new Date().toISOString(),
        errorLog: '',
        createdAt: new Date().toISOString(),
      }
    )

    runningDeindex.add(projectId)

    const seoPathPrefix = (project.seoPathPrefix as string) || ''

    // Fire-and-forget background processing
    processDeindexBatch(projectId, job.$id, indexedKeywords, domain, seoPathPrefix, tokenJson).catch(
      (err) => console.error('Deindex batch error:', err)
    )

    return NextResponse.json({
      jobId: job.$id,
      totalToProcess: indexedKeywords.length,
      status: 'running',
    })
  } catch (error) {
    console.error('Deindex error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

async function processDeindexBatch(
  projectId: string,
  jobId: string,
  keywords: Array<{ slug: string }>,
  domain: string,
  seoPathPrefix: string,
  tokenJson: string,
) {
  let processed = 0
  let success = 0
  let failed = 0

  try {
    for (const kw of keywords) {
      // Check if stopped
      const jobCheck = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId)
      if ((jobCheck.status as string) === 'stopped') break

      const url = getPublicUrl({ domain, seoPathPrefix }, kw.slug)

      // Use URL_DELETED type for deindexing
      const result = await submitUrlForDeindexing(url, tokenJson)

      processed++

      if (result.success) {
        success++
        await updateKeywordStatus(projectId, [kw.slug], 'deindexed')
      } else {
        failed++
      }

      // Update job progress
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
        processedUrls: processed,
        successUrls: success,
        failedUrls: failed,
        lastPosition: processed,
      })

      if (processed < keywords.length) {
        await randomDelay(30000, 45000)
      }
    }

    // Mark job completed and pause project
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })

    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId, {
      status: 'paused',
      totalIndexed: 0,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Background deindex error:', error)
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
      status: 'stopped',
      errorLog: `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  } finally {
    runningDeindex.delete(projectId)
  }
}

async function submitUrlForDeindexing(url: string, tokenJson: string) {
  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(tokenJson),
      scopes: ['https://www.googleapis.com/auth/indexing'],
    })
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()

    const response = await fetch(
      'https://indexing.googleapis.com/v3/urlNotifications:publish',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify({ url, type: 'URL_DELETED' }),
      }
    )

    return { success: response.ok, statusCode: response.status }
  } catch {
    return { success: false, statusCode: 500 }
  }
}
