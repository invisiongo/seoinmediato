import { NextRequest, NextResponse } from 'next/server'
import { Query, ID } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { submitUrlForIndexing, randomDelay } from '@/features/indexing/services/googleIndexingService'
import { getKeywordsByStatus, updateKeywordStatus } from '@/features/keywords/services/keywordBlockService'
import { getBestToken, incrementTokenUsage, listTokensResolved, pauseToken } from '@/features/indexing/services/tokenService'
import { reorderKeywords, type IndexingOrder } from '@/features/indexing/services/indexingOrderService'
import { getPublicUrl } from '@/shared/lib/seo-urls'

// Track running jobs to prevent duplicate starts
const runningJobs = new Set<string>()

export async function POST(request: NextRequest) {

  try {
    const { projectId, batchSize, indexingOrder } = await request.json() as {
      projectId: string
      batchSize?: number
      indexingOrder?: IndexingOrder
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId es requerido' }, { status: 400 })
    }

    // Prevent duplicate runs for same project
    if (runningJobs.has(projectId)) {
      return NextResponse.json({ error: 'Ya hay una indexacion en curso para este proyecto' }, { status: 409 })
    }

    // Get project
    const project = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId)

    // Check for tokens: multi-token system (resolves parent for regions)
    const multiTokens = await listTokensResolved(projectId)
    const hasMultiTokens = multiTokens.some(t => t.isActive)
    const legacyToken = (project.googleTokenJson as string) || ''

    if (!hasMultiTokens && !legacyToken.trim()) {
      return NextResponse.json({ error: 'Token de Google no configurado' }, { status: 400 })
    }

    const domain = (project.domain as string).replace(/\/$/, '')
    const rate = batchSize || (project.indexingRate as number) || 200

    // Get all keywords pending indexing + failed (auto-retry), then apply ordering
    const rawKeywords = await getKeywordsByStatus(projectId, ['generated', 'pending', 'failed'])
    const orderedKeywords = reorderKeywords(rawKeywords, indexingOrder || 'sequential')
    const allKeywords = orderedKeywords.map(kw => ({ slug: kw.slug }))

    if (allKeywords.length === 0) {
      return NextResponse.json({ error: 'No hay keywords pendientes de indexar' }, { status: 400 })
    }

    // Find or create indexing job
    const existingJobs = await serverDatabases.listDocuments(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, [
      Query.equal('projectId', projectId),
      Query.equal('status', 'running'),
      Query.limit(1),
    ])

    let jobId: string
    if (existingJobs.documents.length > 0) {
      jobId = existingJobs.documents[0].$id
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
        totalUrls: allKeywords.length,
        startedAt: new Date().toISOString(),
      })
    } else {
      const job = await serverDatabases.createDocument(
        DATABASE_ID,
        COLLECTIONS.INDEXING_JOBS,
        ID.unique(),
        {
          projectId,
          status: 'running',
          totalUrls: allKeywords.length,
          processedUrls: 0,
          successUrls: 0,
          failedUrls: 0,
          lastPosition: 0,
          startedAt: new Date().toISOString(),
          errorLog: '',
          createdAt: new Date().toISOString(),
        }
      )
      jobId = job.$id
    }

    // Mark as running and start background processing
    runningJobs.add(projectId)

    // Return immediately, process in background
    const responseData = {
      jobId,
      totalToProcess: Math.min(rate, allKeywords.length),
      totalPending: allKeywords.length,
      status: 'running',
    }

    const seoPathPrefix = (project.seoPathPrefix as string) || ''

    // Fire-and-forget background processing
    processIndexingBatch(projectId, jobId, allKeywords, domain, seoPathPrefix, hasMultiTokens, legacyToken, rate).catch(
      (err) => console.error('Indexing batch error:', err)
    )

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Indexing run error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

async function processIndexingBatch(
  projectId: string,
  jobId: string,
  keywords: Array<{ slug: string }>,
  domain: string,
  seoPathPrefix: string,
  useMultiTokens: boolean,
  legacyTokenJson: string,
  batchSize: number
) {
  let processed = 0

  // Get current job state for lastPosition
  const currentJob = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId)
  const startPos = (currentJob.lastPosition as number) || 0
  const toProcess = keywords.slice(startPos, startPos + batchSize)

  // Running accumulators — these only go up, never reset
  let totalSuccess = (currentJob.successUrls as number) || 0
  let totalFailed = (currentJob.failedUrls as number) || 0
  let errorLog = (currentJob.errorLog as string) || ''
  let consecutive429s = 0

  try {
    for (const kw of toProcess) {
      // Check if job was stopped
      const jobCheck = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId)
      if ((jobCheck.status as string) === 'stopped') {
        break
      }

      const url = getPublicUrl({ domain, seoPathPrefix }, kw.slug)

      // Get token: multi-token rotation or legacy single token
      let activeTokenJson = legacyTokenJson
      let activeTokenId: string | null = null

      if (useMultiTokens) {
        const best = await getBestToken(projectId)
        if (!best) {
          // All tokens exhausted/paused — stop batch, cron will retry later
          const errEntry = `${new Date().toISOString()} | ALL_TOKENS_EXHAUSTED | No available tokens, batch paused`
          errorLog = errorLog ? errorLog + '\n' + errEntry : errEntry
          break
        }
        activeTokenJson = best.tokenJson
        activeTokenId = best.tokenId
      }

      const result = await submitUrlForIndexing(url, activeTokenJson)

      processed++

      if (result.success) {
        totalSuccess++
        consecutive429s = 0
        await updateKeywordStatus(projectId, [kw.slug], 'indexed')
        if (activeTokenId) {
          await incrementTokenUsage(activeTokenId)
        }
      } else if (result.statusCode === 429) {
        // Rate limited — pause THIS token, try next one
        if (activeTokenId) {
          await pauseToken(activeTokenId)
        }
        consecutive429s++
        const errEntry = `${new Date().toISOString()} | 429 RATE LIMITED | ${url} | token ${activeTokenId || 'legacy'} paused 1h`
        errorLog = errorLog ? errorLog + '\n' + errEntry : errEntry

        // Don't mark keyword as failed — it will be retried
        // If ALL tokens are 429'd (3 consecutive), stop the batch
        if (consecutive429s >= 3) {
          const exhaustEntry = `${new Date().toISOString()} | BATCH_PAUSED | 3 consecutive 429s, waiting for next cron cycle`
          errorLog = errorLog + '\n' + exhaustEntry
          break
        }
        // Otherwise continue — getBestToken will pick a different token next iteration
        processed-- // Don't count this as processed, URL wasn't submitted
        continue
      } else if (result.statusCode >= 400 && result.statusCode < 500 && result.statusCode !== 429) {
        // Client error (400, 403, 404) — permanent, don't retry
        totalFailed++
        consecutive429s = 0
        const errEntry = `${new Date().toISOString()} | ${result.statusCode} PERMANENT | ${url} | ${result.message}`
        errorLog = errorLog ? errorLog + '\n' + errEntry : errEntry
        await updateKeywordStatus(projectId, [kw.slug], 'failed')
      } else {
        // Server error (5xx) — temporary, will retry next batch
        totalFailed++
        consecutive429s = 0
        const errEntry = `${new Date().toISOString()} | ${result.statusCode} | ${url} | ${result.message}`
        errorLog = errorLog ? errorLog + '\n' + errEntry : errEntry
        await updateKeywordStatus(projectId, [kw.slug], 'failed')
      }

      // Update job progress every request
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
        processedUrls: startPos + processed,
        successUrls: totalSuccess,
        failedUrls: totalFailed,
        lastPosition: startPos + processed,
        errorLog: errorLog.slice(0, 10000),
      })

      // Delay 25-35s between requests
      if (processed < toProcess.length) {
        await randomDelay(25000, 35000)
      }
    }

    // Determine final status
    const remaining = keywords.length - (startPos + processed)
    const finalStatus = remaining <= 0 ? 'completed' : 'paused_batch'

    const updateData: Record<string, unknown> = { status: finalStatus }
    if (finalStatus === 'completed') {
      updateData.completedAt = new Date().toISOString()
    }
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, updateData)

    // Update project totalIndexed
    const { countKeywordsByStatus } = await import('@/features/keywords/services/keywordBlockService')
    const counts = await countKeywordsByStatus(projectId)
    const indexedCount = counts['indexed'] || 0
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId, {
      totalIndexed: indexedCount,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Background indexing error:', error)
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
      status: 'stopped',
      errorLog: `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  } finally {
    runningJobs.delete(projectId)
  }
}
