import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { getKeywordsByStatus } from '@/features/keywords/services/keywordBlockService'
import { getPublicUrl } from '@/shared/lib/seo-urls'
import { listTokensResolved } from '@/features/indexing/services/tokenService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const project = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId)

    // Get first active token for Search Console auth
    const tokens = await listTokensResolved(projectId)
    const activeToken = tokens.find((t) => t.isActive)

    if (!activeToken) {
      return NextResponse.json(
        { error: 'No hay tokens activos para este proyecto' },
        { status: 400 }
      )
    }

    // Build siteUrl as sc-domain: (Domain property in GSC)
    const normalizedDomain = String(project.domain || '')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
    const siteUrl = `sc-domain:${normalizedDomain}`

    // Get auth client with webmasters scope
    const credentials = JSON.parse(activeToken.tokenJson)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    })
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()

    if (!accessToken.token) {
      return NextResponse.json(
        { error: 'No se pudo obtener access token' },
        { status: 500 }
      )
    }

    // Get a sample of indexed keywords
    const indexedKeywords = await getKeywordsByStatus(projectId, ['indexed'])

    if (indexedKeywords.length === 0) {
      return NextResponse.json({
        sampleSize: 0,
        indexedCount: 0,
        percentage: 0,
        results: [],
        message: 'No hay keywords indexadas para verificar',
      })
    }

    // Take a random sample of up to 20 keywords
    const sampleSize = Math.min(20, indexedKeywords.length)
    const shuffled = [...indexedKeywords].sort(() => Math.random() - 0.5)
    const sample = shuffled.slice(0, sampleSize)

    const results: Array<{
      slug: string
      keyword: string
      url: string
      indexed: boolean
      verdict: string
      lastCrawlTime: string | null
      coverageState: string | null
    }> = []

    let indexedCount = 0

    for (const kw of sample) {
      const url = getPublicUrl(project, kw.slug)
      // Ensure URL has https:// for the inspection API
      const inspectionUrl = url.startsWith('http') ? url : `https://${url}`

      const inspection = await inspectUrl(inspectionUrl, siteUrl, accessToken.token)

      results.push({
        slug: kw.slug,
        keyword: kw.keyword,
        url: inspectionUrl,
        indexed: inspection.indexed,
        verdict: inspection.verdict,
        lastCrawlTime: inspection.lastCrawlTime,
        coverageState: inspection.coverageState,
      })

      if (inspection.indexed) indexedCount++
    }

    const percentage = Math.round((indexedCount / sampleSize) * 100)

    return NextResponse.json({
      sampleSize,
      indexedCount,
      percentage,
      results,
      totalIndexed: indexedKeywords.length,
      estimatedRealIndexed: Math.round((percentage / 100) * indexedKeywords.length),
      verifiedAt: new Date().toISOString(),
      siteUrl,
    })
  } catch (error) {
    console.error('Verify indexation error:', error)
    const message = error instanceof Error ? error.message : 'Error al verificar indexacion'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface InspectionResult {
  indexed: boolean
  verdict: string
  lastCrawlTime: string | null
  coverageState: string | null
}

/**
 * Inspect a single URL using Google Search Console URL Inspection API.
 */
async function inspectUrl(
  inspectionUrl: string,
  siteUrl: string,
  token: string
): Promise<InspectionResult> {
  try {
    const response = await fetch(
      'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inspectionUrl, siteUrl }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`URL Inspection API error (${response.status}):`, errorBody)
      return { indexed: false, verdict: `HTTP_${response.status}`, lastCrawlTime: null, coverageState: null }
    }

    const data = await response.json()
    const indexResult = data.inspectionResult?.indexStatusResult

    if (!indexResult) {
      return { indexed: false, verdict: 'NO_DATA', lastCrawlTime: null, coverageState: null }
    }

    return {
      indexed: indexResult.verdict === 'PASS',
      verdict: indexResult.verdict || 'UNKNOWN',
      lastCrawlTime: indexResult.lastCrawlTime || null,
      coverageState: indexResult.coverageState || null,
    }
  } catch (error) {
    console.error('inspectUrl error:', error)
    return { indexed: false, verdict: 'ERROR', lastCrawlTime: null, coverageState: null }
  }
}
