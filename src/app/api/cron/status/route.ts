import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { listTokensResolved } from '@/features/indexing/services/tokenService'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Status endpoint: shows current indexing state across all projects.
 * No SSH needed — just hit this URL in the browser.
 *
 * GET /api/cron/status?secret=YOUR_SECRET
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all indexing jobs
    const jobs = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.INDEXING_JOBS,
      [Query.orderDesc('$updatedAt'), Query.limit(50)]
    )

    // Get all projects for name lookup
    const projects = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.limit(100)]
    )
    const projectMap = new Map(projects.documents.map(p => [p.$id, p]))

    // Get token status
    const parentProjects = projects.documents.filter(p => !(p.parentProjectId as string))
    const tokenStatus: Array<{ project: string; tokens: Array<{ name: string; usedToday: number; paused: boolean; pausedUntil: string }> }> = []

    for (const parent of parentProjects) {
      const tokens = await listTokensResolved(parent.$id)
      if (tokens.length === 0) continue
      tokenStatus.push({
        project: (parent.name as string) || parent.$id,
        tokens: tokens.map(t => ({
          name: t.tokenName,
          usedToday: t.urlsSentToday,
          paused: t.pausedUntil ? new Date(t.pausedUntil).getTime() > Date.now() : false,
          pausedUntil: t.pausedUntil || '',
        })),
      })
    }

    // Format jobs
    const jobSummary = jobs.documents.map(job => {
      const project = projectMap.get(job.projectId as string)
      const startedAt = job.startedAt as string
      const elapsed = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000) : 0

      return {
        region: (project?.name as string) || (job.projectId as string),
        status: job.status as string,
        success: job.successUrls as number,
        failed: job.failedUrls as number,
        total: job.totalUrls as number,
        elapsedMin: elapsed,
        lastUpdate: job.$updatedAt as string,
        errorLog: ((job.errorLog as string) || '').split('\n').filter(Boolean).slice(-3),
      }
    })

    // Running vs paused vs completed
    const running = jobSummary.filter(j => j.status === 'running')
    const paused = jobSummary.filter(j => j.status === 'paused_batch')
    const completed = jobSummary.filter(j => j.status === 'completed')

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        running: running.length,
        paused: paused.length,
        completed: completed.length,
        totalIndexed: jobSummary.reduce((sum, j) => sum + j.success, 0),
        totalFailed: jobSummary.reduce((sum, j) => sum + j.failed, 0),
      },
      tokens: tokenStatus,
      activeJobs: running,
      pausedJobs: paused,
      recentCompleted: completed.slice(0, 5),
    })
  } catch (error) {
    console.error('Status endpoint error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
