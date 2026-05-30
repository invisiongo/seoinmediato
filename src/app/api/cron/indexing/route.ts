import { NextRequest, NextResponse } from 'next/server'
import { runIndexingCycle } from '@/features/indexing/services/indexingCronRunner'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Manual trigger: GET /api/cron/indexing?secret=YOUR_SECRET
 * The same logic runs automatically every 30 min via instrumentation.ts
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runIndexingCycle()
  return NextResponse.json({ timestamp: new Date().toISOString(), ...result })
}
