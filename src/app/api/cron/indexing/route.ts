import { NextRequest, NextResponse } from 'next/server'
import { Query, ID } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { listTokensResolved, getBestToken, incrementTokenUsage, pauseToken } from '@/features/indexing/services/tokenService'
import { getKeywordsByStatus, updateKeywordStatus, countKeywordsByStatus } from '@/features/keywords/services/keywordBlockService'
import { reorderKeywords } from '@/features/indexing/services/indexingOrderService'
import { submitUrlForIndexing, randomDelay } from '@/features/indexing/services/googleIndexingService'
import { getPublicUrl } from '@/shared/lib/seo-urls'

const CRON_SECRET = process.env.CRON_SECRET || ''
const STUCK_JOB_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes — if a job hasn't updated in 15min, the process is dead

// Delay between requests: 25-35s
const DELAY_MIN_MS = 25000
const DELAY_MAX_MS = 35000

/**
 * Cron endpoint: processes all active projects with pending keywords.
 * NO artificial batch cap — processes until all tokens get 429'd by Google.
 *
 * FIRE-AND-FORGET: Returns immediately after launching background processing.
 *
 * GET /api/cron/indexing?secret=YOUR_SECRET
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const projects = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(100)]
    )

    // === Phase 1: Unstick dead jobs ===
    // A live job updates $updatedAt on every URL processed (every 10-15s).
    // If $updatedAt is older than 15min, the background process is dead.
    const stuckJobs = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [Query.equal('status', 'running'), Query.limit(50)]
    )

    const unstuckResults: string[] = []
    for (const job of stuckJobs.documents) {
      const updatedAt = job.$updatedAt as string
      if (!updatedAt) continue
      const sinceLastUpdate = Date.now() - new Date(updatedAt).getTime()
      if (sinceLastUpdate > STUCK_JOB_THRESHOLD_MS) {
        await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, job.$id, {
          status: 'paused_batch',
        })
        unstuckResults.push(`job-${job.$id}: dead for ${Math.round(sinceLastUpdate / 60000)}min`)
      }
    }

    // === Phase 2: Gather work ===
    const launched: Array<{ projectId: string; name: string; regions: number; totalPending: number }> = []
    const skipped: Array<{ name: string; reason: string }> = []

    for (const project of projects.documents) {
      const projectId = project.$id
      const name = (project.name as string) || projectId
      const parentProjectId = (project.parentProjectId as string) || ''

      if (parentProjectId) continue

      if ((project.status as string) === 'paused') {
        skipped.push({ name, reason: 'paused' })
        continue
      }

      const tokens = await listTokensResolved(projectId)
      const hasActiveTokens = tokens.some(t => t.isActive)
      if (!hasActiveTokens) {
        skipped.push({ name, reason: 'no active tokens' })
        continue
      }

      const regions = projects.documents.filter(
        p => (p.parentProjectId as string) === projectId
      )

      const projectsToIndex = regions.length > 0 ? regions : [project]

      let totalPending = 0
      const regionsWithWork: Array<{ project: Record<string, unknown>; keywords: Array<{ slug: string; keyword: string }> }> = []

      for (const proj of projectsToIndex) {
        const rawKeywords = await getKeywordsByStatus(proj.$id, ['generated', 'pending', 'failed'])
        if (rawKeywords.length > 0) {
          totalPending += rawKeywords.length
          regionsWithWork.push({ project: proj, keywords: rawKeywords })
        }
      }

      if (regionsWithWork.length === 0) {
        skipped.push({ name, reason: 'no pending keywords' })
        continue
      }

      // Fire-and-forget: process until tokens are exhausted
      processProjectGroup(parentProjectId || projectId, regionsWithWork).catch(
        (err) => console.error(`Cron background error for ${name}:`, err)
      )

      launched.push({
        projectId,
        name,
        regions: regionsWithWork.length,
        totalPending,
      })
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'launched',
      projectsChecked: projects.documents.length,
      delayBetweenUrls: `${DELAY_MIN_MS / 1000}-${DELAY_MAX_MS / 1000}s`,
      batchLimit: 'none (until 429)',
      unstuck: unstuckResults,
      launched,
      skipped,
    })
  } catch (error) {
    console.error('Cron indexing error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Process all regions with round-robin: 1 URL from each region per round.
 * This distributes indexing evenly across regions and maximizes token usage.
 * Stops when ALL tokens get 429'd — no artificial batch cap.
 */
async function processProjectGroup(
  tokenProjectId: string,
  regionsWithWork: Array<{ project: Record<string, unknown>; keywords: Array<{ slug: string; keyword: string }> }>
) {
  // Prepare per-region queues and jobs
  const regionQueues: Array<{
    projectId: string
    domain: string
    seoPathPrefix: string
    queue: Array<{ slug: string; keyword: string }>
    jobId: string
    totalSuccess: number
    totalFailed: number
    errorLog: string
    exhausted: boolean
  }> = []

  for (const { project, keywords } of regionsWithWork) {
    const projectId = project.$id as string
    const domain = (project.domain as string).replace(/\/$/, '')
    const seoPathPrefix = (project.seoPathPrefix as string) || ''
    const indexingOrder = (project.indexingOrder as string) || 'sequential'

    // Check if already running
    const runningJobs = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [Query.equal('projectId', projectId), Query.equal('status', 'running'), Query.limit(1)]
    )
    if (runningJobs.documents.length > 0) continue

    // Reorder keywords (NO slice — process ALL)
    const orderedKeywords = reorderKeywords(keywords, indexingOrder as 'sequential' | 'random' | 'by_location' | 'by_priority')

    // Find or create job
    const existingJobs = await serverDatabases.listDocuments(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, [
      Query.equal('projectId', projectId),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ])

    let jobId: string
    let totalSuccess = 0
    let totalFailed = 0
    let errorLog = ''

    if (existingJobs.documents.length > 0) {
      const existingJob = existingJobs.documents[0]
      jobId = existingJob.$id
      totalSuccess = (existingJob.successUrls as number) || 0
      totalFailed = (existingJob.failedUrls as number) || 0
      errorLog = (existingJob.errorLog as string) || ''

      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
        status: 'running',
        totalUrls: keywords.length + totalSuccess + totalFailed,
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
          totalUrls: keywords.length,
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

    regionQueues.push({
      projectId,
      domain,
      seoPathPrefix,
      queue: [...orderedKeywords],
      jobId,
      totalSuccess,
      totalFailed,
      errorLog,
      exhausted: false,
    })
  }

  if (regionQueues.length === 0) return

  // Round-robin: pick 1 URL from each region per round, keep going until
  // all regions are empty OR all tokens are exhausted (getBestToken → null)
  let totalProcessed = 0

  while (true) {
    // Check if all regions are done
    const activeRegions = regionQueues.filter(r => !r.exhausted && r.queue.length > 0)
    if (activeRegions.length === 0) break

    for (const region of activeRegions) {
      const kw = region.queue.shift()
      if (!kw) {
        region.exhausted = true
        continue
      }

      const url = getPublicUrl({ domain: region.domain, seoPathPrefix: region.seoPathPrefix }, kw.slug)

      // Get best token (resolves parent for regions)
      const best = await getBestToken(region.projectId)
      if (!best) {
        // All tokens exhausted — stop ALL regions
        const errEntry = `${new Date().toISOString()} | ALL_TOKENS_EXHAUSTED | all regions paused`
        for (const r of regionQueues) {
          r.errorLog = r.errorLog ? r.errorLog + '\n' + errEntry : errEntry
        }
        // Mark all as paused
        for (const r of regionQueues) {
          await finalizeRegionJob(r, 'paused_batch')
        }
        console.log(`[Cron] All tokens exhausted after ${totalProcessed} URLs total`)
        return
      }

      const result = await submitUrlForIndexing(url, best.tokenJson)

      if (result.success) {
        region.totalSuccess++
        totalProcessed++
        await updateKeywordStatus(region.projectId, [kw.slug], 'indexed')
        await incrementTokenUsage(best.tokenId)
      } else if (result.statusCode === 429) {
        await pauseToken(best.tokenId)
        const errEntry = `${new Date().toISOString()} | 429 | ${url} | token ${best.tokenId} paused`
        region.errorLog = region.errorLog ? region.errorLog + '\n' + errEntry : errEntry

        // Put keyword back — it wasn't processed
        region.queue.unshift(kw)

        // Don't stop — getBestToken will return null when ALL tokens are paused
        continue
      } else if (result.statusCode >= 400 && result.statusCode < 500) {
        region.totalFailed++
        totalProcessed++
        await updateKeywordStatus(region.projectId, [kw.slug], 'failed')
        const errEntry = `${new Date().toISOString()} | ${result.statusCode} | ${url} | ${result.message}`
        region.errorLog = region.errorLog ? region.errorLog + '\n' + errEntry : errEntry
      } else {
        region.totalFailed++
        totalProcessed++
        await updateKeywordStatus(region.projectId, [kw.slug], 'failed')
        const errEntry = `${new Date().toISOString()} | ${result.statusCode} | ${url} | ${result.message}`
        region.errorLog = region.errorLog ? region.errorLog + '\n' + errEntry : errEntry
      }

      // Update job progress
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, region.jobId, {
        processedUrls: region.totalSuccess + region.totalFailed,
        successUrls: region.totalSuccess,
        failedUrls: region.totalFailed,
        lastPosition: region.totalSuccess + region.totalFailed,
        errorLog: region.errorLog.slice(0, 10000),
      })

      // Delay between requests (25-35s)
      await randomDelay(DELAY_MIN_MS, DELAY_MAX_MS)
    }
  }

  // Finalize all regions
  for (const region of regionQueues) {
    const finalStatus = region.queue.length === 0 ? 'completed' : 'paused_batch'
    await finalizeRegionJob(region, finalStatus)
  }

  console.log(`[Cron] Finished: ${totalProcessed} URLs processed across ${regionQueues.length} regions`)
}

/**
 * Finalize a region's job: set status, update project totalIndexed.
 */
async function finalizeRegionJob(
  region: {
    projectId: string
    jobId: string
    totalSuccess: number
    totalFailed: number
    errorLog: string
  },
  status: string
) {
  try {
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, region.jobId, {
      status,
      ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
      errorLog: region.errorLog.slice(0, 10000),
    })

    const counts = await countKeywordsByStatus(region.projectId)
    const indexedCount = counts['indexed'] || 0
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, region.projectId, {
      totalIndexed: indexedCount,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`Error finalizing job for ${region.projectId}:`, err)
  }
}
