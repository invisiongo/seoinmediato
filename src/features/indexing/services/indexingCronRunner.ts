import { Query, ID } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { listTokensResolved, getBestToken, incrementTokenUsage, pauseToken } from './tokenService'
import { getKeywordsByStatus, updateKeywordStatus, countKeywordsByStatus } from '@/features/keywords/services/keywordBlockService'
import { reorderKeywords } from './indexingOrderService'
import { submitUrlForIndexing, randomDelay } from './googleIndexingService'
import { getPublicUrl } from '@/shared/lib/seo-urls'

const STUCK_JOB_THRESHOLD_MS = 15 * 60 * 1000
const DELAY_MIN_MS = 25000
const DELAY_MAX_MS = 35000

let isRunning = false

export async function runIndexingCycle(): Promise<{ launched: number; skipped: number }> {
  if (isRunning) {
    console.log('[AutoCron] Already running — skipping this tick')
    return { launched: 0, skipped: 0 }
  }

  isRunning = true
  console.log('[AutoCron] Starting indexing cycle —', new Date().toISOString())

  try {
    const projects = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(100)]
    )

    // Unstick dead jobs
    const stuckJobs = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [Query.equal('status', 'running'), Query.limit(50)]
    )
    for (const job of stuckJobs.documents) {
      const sinceLastUpdate = Date.now() - new Date(job.$updatedAt as string).getTime()
      if (sinceLastUpdate > STUCK_JOB_THRESHOLD_MS) {
        await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, job.$id, { status: 'paused_batch' })
      }
    }

    let launched = 0
    let skipped = 0

    for (const project of projects.documents) {
      if (project.parentProjectId) continue
      if ((project.status as string) === 'paused') { skipped++; continue }

      const tokens = await listTokensResolved(project.$id)
      if (!tokens.some(t => t.isActive)) { skipped++; continue }

      const regions = projects.documents.filter(p => (p.parentProjectId as string) === project.$id)
      const projectsToIndex = regions.length > 0 ? regions : [project]

      // indexingRate = max URLs per cron run for this project (default 200 = Google daily quota)
      const indexingRate = (project.indexingRate as number) || 200

      const regionsWithWork: Array<{ project: Record<string, unknown>; keywords: Array<{ slug: string; keyword: string }> }> = []
      let rateRemaining = indexingRate

      for (const proj of projectsToIndex) {
        if (rateRemaining <= 0) break
        const kws = await getKeywordsByStatus(proj.$id, ['generated', 'pending', 'failed'])
        if (kws.length > 0) {
          const limited = kws.slice(0, rateRemaining)
          regionsWithWork.push({ project: proj, keywords: limited })
          rateRemaining -= limited.length
        }
      }

      if (regionsWithWork.length === 0) { skipped++; continue }

      processProjectGroup(project.$id, regionsWithWork).catch(
        err => console.error(`[AutoCron] Error processing ${project.name}:`, err)
      )
      launched++
    }

    console.log(`[AutoCron] Cycle done — launched: ${launched}, skipped: ${skipped}`)
    return { launched, skipped }
  } finally {
    isRunning = false
  }
}

async function processProjectGroup(
  tokenProjectId: string,
  regionsWithWork: Array<{ project: Record<string, unknown>; keywords: Array<{ slug: string; keyword: string }> }>
) {
  const regionQueues: Array<{
    projectId: string; domain: string; seoPathPrefix: string
    queue: Array<{ slug: string; keyword: string }>
    jobId: string; totalSuccess: number; totalFailed: number; errorLog: string; exhausted: boolean
  }> = []

  for (const { project, keywords } of regionsWithWork) {
    const projectId = project.$id as string
    const domain = (project.domain as string).replace(/\/$/, '')
    const seoPathPrefix = (project.seoPathPrefix as string) || ''
    const indexingOrder = (project.indexingOrder as string) || 'sequential'

    const runningJobs = await serverDatabases.listDocuments(
      DATABASE_ID, COLLECTIONS.INDEXING_JOBS,
      [Query.equal('projectId', projectId), Query.equal('status', 'running'), Query.limit(1)]
    )
    if (runningJobs.documents.length > 0) continue

    const orderedKeywords = reorderKeywords(keywords, indexingOrder as 'sequential' | 'random' | 'by_location' | 'by_priority')

    const existingJobs = await serverDatabases.listDocuments(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, [
      Query.equal('projectId', projectId), Query.orderDesc('$createdAt'), Query.limit(1),
    ])

    let jobId: string
    let totalSuccess = 0
    let totalFailed = 0
    let errorLog = ''

    if (existingJobs.documents.length > 0) {
      const existing = existingJobs.documents[0]
      jobId = existing.$id
      totalSuccess = (existing.successUrls as number) || 0
      totalFailed = (existing.failedUrls as number) || 0
      errorLog = (existing.errorLog as string) || ''
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, jobId, {
        status: 'running',
        totalUrls: keywords.length + totalSuccess + totalFailed,
        startedAt: new Date().toISOString(),
      })
    } else {
      const job = await serverDatabases.createDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, ID.unique(), {
        projectId, status: 'running', totalUrls: keywords.length, processedUrls: 0,
        successUrls: 0, failedUrls: 0, lastPosition: 0,
        startedAt: new Date().toISOString(), errorLog: '', createdAt: new Date().toISOString(),
      })
      jobId = job.$id
    }

    regionQueues.push({ projectId, domain, seoPathPrefix, queue: [...orderedKeywords], jobId, totalSuccess, totalFailed, errorLog, exhausted: false })
  }

  if (regionQueues.length === 0) return

  while (true) {
    const activeRegions = regionQueues.filter(r => !r.exhausted && r.queue.length > 0)
    if (activeRegions.length === 0) break

    for (const region of activeRegions) {
      const kw = region.queue.shift()
      if (!kw) { region.exhausted = true; continue }

      const url = getPublicUrl({ domain: region.domain, seoPathPrefix: region.seoPathPrefix }, kw.slug)
      const best = await getBestToken(region.projectId)

      if (!best) {
        const errEntry = `${new Date().toISOString()} | ALL_TOKENS_EXHAUSTED`
        for (const r of regionQueues) r.errorLog = r.errorLog ? r.errorLog + '\n' + errEntry : errEntry
        for (const r of regionQueues) await finalizeRegionJob(r, 'paused_batch')
        return
      }

      const result = await submitUrlForIndexing(url, best.tokenJson)

      if (result.success) {
        region.totalSuccess++
        await updateKeywordStatus(region.projectId, [kw.slug], 'indexed')
        await incrementTokenUsage(best.tokenId)
      } else if (result.statusCode === 429) {
        await pauseToken(best.tokenId)
        region.queue.unshift(kw)
        region.errorLog += `\n${new Date().toISOString()} | 429 | token ${best.tokenId} paused`
      } else {
        region.totalFailed++
        await updateKeywordStatus(region.projectId, [kw.slug], 'failed')
        region.errorLog += `\n${new Date().toISOString()} | ${result.statusCode} | ${url}`
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
    await finalizeRegionJob(region, region.queue.length === 0 ? 'completed' : 'paused_batch')
  }
}

async function finalizeRegionJob(
  region: { projectId: string; jobId: string; totalSuccess: number; totalFailed: number; errorLog: string },
  status: string
) {
  try {
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, region.jobId, {
      status,
      ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
      errorLog: region.errorLog.slice(0, 10000),
    })
    const counts = await countKeywordsByStatus(region.projectId)
    await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, region.projectId, {
      totalIndexed: counts['indexed'] || 0,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`[AutoCron] Error finalizing job for ${region.projectId}:`, err)
  }
}
