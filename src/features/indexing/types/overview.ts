export interface TokenOverview {
  id: string
  tokenName: string
  serviceAccountEmail: string
  urlsSentToday: number
  dailyQuota: number
  isActive: boolean
  isPaused: boolean
  pausedUntil: string | null
}

export interface JobOverview {
  id: string
  projectId: string
  projectName: string
  parentName: string | null
  status: string
  totalUrls: number
  processedUrls: number
  successUrls: number
  failedUrls: number
  startedAt: string | null
  completedAt: string | null
  elapsedMs: number | null
}

export interface IndexingOverviewResponse {
  fetchedAt: string
  summary: {
    totalIndexed: number
    totalRunning: number
    totalPaused: number
    totalFailed: number
    totalPending: number
  }
  tokens: TokenOverview[]
  runningJobs: JobOverview[]
  pausedJobs: JobOverview[]
  parentProjects?: Array<{ id: string; name: string; domain: string }>
}
