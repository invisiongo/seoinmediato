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
const STUCK_JOB_THRESHOLD_MS = 15 * 60 * 1000

const DELAY_MIN_MS = 25000
const DELAY_MAX_MS = 35000

/**
 * Cron endpoint: processes all active projects with pending keywords.
 * NO artificial batch cap — processes until all tokens get 429'd by Google.
 *
 * FIRE-AND-FORGET: Returns immediately after launching background processing.
 *
 * GET /api/cron/indexing?secret=YOUR_SECRET
 * Called by Dokploy cron every 30 minutes.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let projectOffset = 0
    let allProjectDocs = (await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(100), Query.offset(0)]
    )).documents
    while (allProjectDocs.length % 100 === 0 && allProjectDocs.length > 0) {
      projectOffset += 100
      const page = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        [Query.limit(100), Query.offset(projectOffset)]
      )
      if (page.documents.length === 0) break
      allProjectDocs = [...allProjectDocs, ...page.documents]
      if (page.documents.length < 100) break
    }
    const projects = { documents: allProjectDocs }

    // Unstick dead jobs — a live job updates $updatedAt every 10-15s
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

      processProjectGroup(parentProjectId || projectId, regionsWithWork).catch(
        (err) => console.error(`Cron background error for ${name}:`, err)
      )

      launched.push({ projectId, name, regions: regionsWithWork.length, totalPending })
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

async function processProjectGroup(
  tokenProjectId: string,
  regionsWithWork: Array<{ project: Record<string, unknown>; keywords: Array<{ slug: string; keyword: string }> }>
) {
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
    // Use project.totalKeywords as stable denominator — avoids inflation from accumulated failedUrls
    const projectTotalKeywords = (project.totalKeywords as number) || keywords.length

    const runningJobs = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [Query.equal('projectId', projectId), Query.equal('status', 'running'), Query.limit(1)]
    )
    if (runningJobs.documents.length > 0) continue

    const orderedKeywords = reorderKeywords(keywords, indexingOrder as 'sequential' | 'random' | 'by_location' | 'by_priority')

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
        totalUrls: projectTotalKeywords,
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
          totalUrls: projectTotalKeywords,
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

  let totalProcessed = 0

  while (true) {
    const activeRegions = regionQueues.filter(r => !r.exhausted && r.queue.length > 0)
    if (activeRegions.length === 0) break

    for (const region of activeRegions) {
      const kw = region.queue.shift()
      if (!kw) {
        region.exhausted = true
        continue
      }

      const url = getPublicUrl({ domain: region.domain, seoPathPrefix: region.seoPathPrefix }, kw.slug)

      const best = await getBestToken(region.projectId)
      if (!best) {
        const errEntry = `${new Date().toISOString()} | ALL_TOKENS_EXHAUSTED | all regions paused`
        for (const r of regionQueues) {
          r.errorLog = r.errorLog ? r.errorLog + '\n' + errEntry : errEntry
        }
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
        region.queue.unshift(kw)
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

      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, region.jobId, {
        processedUrls: region.totalSuccess + region.totalFailed,
        successUrls: region.totalSuccess,
        failedUrls: region.totalFailed,
        lastPosition: region.totalSuccess + region.totalFailed,
        errorLog: region.errorLog.slice(0, 10000),
      })

      await randomDelay(DELAY_MIN_MS, DELAY_MAX_MS)
    }
  }

  for (const region of regionQueues) {
    const finalStatus = region.queue.length === 0 ? 'completed' : 'paused_batch'
    await finalizeRegionJob(region, finalStatus)
  }

  console.log(`[Cron] Finished: ${totalProcessed} URLs processed across ${regionQueues.length} regions`)
}

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
