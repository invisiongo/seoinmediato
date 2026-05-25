export interface IndexingJob {
  $id: string
  projectId: string
  status: 'pending' | 'running' | 'completed' | 'stopped'
  totalUrls: number
  processedUrls: number
  successUrls: number
  failedUrls: number
  lastPosition: number
  startedAt?: string
  completedAt?: string
  errorLog?: string
  createdAt: string
}

export interface IndexingResult {
  processed: number
  success: number
  failed: number
  remaining: number
  status: string
}

export interface IndexingError {
  url: string
  statusCode: number
  message: string
  timestamp: string
}
