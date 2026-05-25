import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import type { TokenOverview, JobOverview, IndexingOverviewResponse } from '@/features/indexing/types/overview'

export type { TokenOverview, JobOverview, IndexingOverviewResponse }

const JOB_STATUSES_ACTIVE = ['running']
const JOB_STATUSES_PAUSED = ['paused_batch', 'paused']

export async function GET(request: NextRequest) {
  try {
    const now = Date.now()
    const { searchParams } = new URL(request.url)
    const filterProjectId = searchParams.get('projectId') || null

    // --- Fetch all projects (needed for names + filtering) ---
    const projectsRes = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(200)]
    )
    const projects = projectsRes.documents

    const projectMap = new Map<string, { name: string; parentProjectId: string | null; totalIndexed: number; totalKeywords: number }>(
      projects.map((p) => [
        p.$id,
        {
          name: p.name as string,
          parentProjectId: (p.parentProjectId as string) || null,
          totalIndexed: (p.totalIndexed as number) || 0,
          totalKeywords: (p.totalKeywords as number) || 0,
        },
      ])
    )

    // Build set of project IDs to include (parent + its regions)
    let filteredProjectIds: Set<string> | null = null
    if (filterProjectId) {
      filteredProjectIds = new Set<string>()
      filteredProjectIds.add(filterProjectId)
      // Add all regions (children) of this parent
      for (const [id, info] of projectMap.entries()) {
        if (info.parentProjectId === filterProjectId) {
          filteredProjectIds.add(id)
        }
      }
    }

    // Filter projects for stats
    const relevantProjects = filteredProjectIds
      ? projects.filter(p => filteredProjectIds!.has(p.$id))
      : projects

    // --- Aggregate stats from relevant projects ---
    const totalIndexed = relevantProjects.reduce((sum, p) => sum + ((p.totalIndexed as number) || 0), 0)
    const totalKeywords = relevantProjects.reduce((sum, p) => sum + ((p.totalKeywords as number) || 0), 0)

    // --- Fetch tokens (filtered by project if needed) ---
    const tokensQueries = filterProjectId
      ? [Query.equal('projectId', filterProjectId), Query.limit(100)]
      : [Query.limit(100)]
    const tokensRes = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.GOOGLE_TOKENS,
      tokensQueries
    )

    const today = new Date().toISOString().split('T')[0]
    const tokens: TokenOverview[] = tokensRes.documents.map((t) => {
      const pausedUntil = (t.pausedUntil as string) || null
      const isPaused = !!pausedUntil && new Date(pausedUntil).getTime() > now
      const urlsSentToday = (t.lastResetDate as string) === today
        ? ((t.urlsSentToday as number) || 0)
        : 0

      return {
        id: t.$id,
        tokenName: (t.tokenName as string) || 'Token',
        serviceAccountEmail: (t.serviceAccountEmail as string) || '',
        urlsSentToday,
        dailyQuota: (t.dailyQuota as number) || 200,
        isActive: (t.isActive as boolean) ?? true,
        isPaused,
        pausedUntil: isPaused ? pausedUntil : null,
      }
    })

    // --- Fetch running jobs ---
    const runningRes = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [
        Query.equal('status', JOB_STATUSES_ACTIVE),
        Query.orderDesc('$updatedAt'),
        Query.limit(50),
      ]
    )

    // --- Fetch paused jobs ---
    const pausedRes = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [
        Query.equal('status', JOB_STATUSES_PAUSED),
        Query.orderDesc('$updatedAt'),
        Query.limit(50),
      ]
    )

    // --- Count failed jobs ---
    const failedRes = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [
        Query.equal('status', ['stopped', 'failed']),
        Query.orderDesc('$updatedAt'),
        Query.limit(1),
      ]
    )

    function buildJobOverview(job: Record<string, unknown>): JobOverview {
      const projectId = job.projectId as string
      const proj = projectMap.get(projectId)
      const parentId = proj?.parentProjectId ?? null
      const parentProj = parentId ? projectMap.get(parentId) : null
      const startedAt = (job.startedAt as string) || null
      const elapsedMs = startedAt ? now - new Date(startedAt).getTime() : null

      return {
        id: job.$id as string,
        projectId,
        projectName: proj?.name ?? projectId,
        parentName: parentProj?.name ?? null,
        status: job.status as string,
        totalUrls: (job.totalUrls as number) || 0,
        processedUrls: (job.processedUrls as number) || 0,
        successUrls: (job.successUrls as number) || 0,
        failedUrls: (job.failedUrls as number) || 0,
        startedAt,
        completedAt: (job.completedAt as string) || null,
        elapsedMs,
      }
    }

    let runningJobs = runningRes.documents.map(buildJobOverview)
    let pausedJobs = pausedRes.documents.map(buildJobOverview)

    // Filter jobs by project if needed
    if (filteredProjectIds) {
      runningJobs = runningJobs.filter(j => filteredProjectIds!.has(j.projectId))
      pausedJobs = pausedJobs.filter(j => filteredProjectIds!.has(j.projectId))
    }

    // Live totalIndexed: project counters + active/paused jobs' successUrls
    const runningSuccessUrls = runningJobs.reduce((sum, j) => sum + j.successUrls, 0)
    const pausedSuccessUrls = pausedJobs.reduce((sum, j) => sum + j.successUrls, 0)
    const liveTotalIndexed = totalIndexed + runningSuccessUrls + pausedSuccessUrls

    const totalPending = Math.max(0, totalKeywords - liveTotalIndexed)

    // Build parent projects list for the selector
    const parentProjects = projects
      .filter(p => !p.parentProjectId)
      .map(p => ({ id: p.$id, name: p.name as string, domain: p.domain as string }))

    const response: IndexingOverviewResponse = {
      fetchedAt: new Date().toISOString(),
      summary: {
        totalIndexed: liveTotalIndexed,
        totalRunning: runningJobs.length,
        totalPaused: pausedJobs.length,
        totalFailed: filteredProjectIds ? 0 : failedRes.total,
        totalPending,
      },
      tokens,
      runningJobs,
      pausedJobs,
      parentProjects,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[IndexingOverview] Error:', error)
    return NextResponse.json({ error: 'Error interno al obtener el estado de indexacion' }, { status: 500 })
  }
}
