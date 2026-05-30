export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const INTERVAL_MS = 30 * 60 * 1000 // every 30 minutes
  const STARTUP_DELAY_MS = 60 * 1000  // wait 60s after boot before first run

  const run = async () => {
    try {
      const { runIndexingCycle } = await import('./src/features/indexing/services/indexingCronRunner')
      await runIndexingCycle()
    } catch (err) {
      console.error('[AutoCron] Unhandled error:', err)
    }
  }

  setTimeout(() => {
    run()
    setInterval(run, INTERVAL_MS)
  }, STARTUP_DELAY_MS)

  console.log('[AutoCron] Scheduler registered — first run in 60s, then every 30 min')
}
