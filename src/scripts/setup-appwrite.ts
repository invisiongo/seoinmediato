import { Client, Databases, ID, IndexType, Permission, Role } from 'node-appwrite'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Load .env.local manually (standalone script, no dotenv dependency)
// ---------------------------------------------------------------------------

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}

  if (!fs.existsSync(envPath)) {
    console.warn(`[WARN] .env.local not found at ${envPath}`)
    return env
  }

  const content = fs.readFileSync(envPath, 'utf-8')

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = value
  }

  return env
}

const envVars = loadEnvLocal()

function getEnv(key: string, fallback?: string): string {
  const value = envVars[key] ?? process.env[key] ?? fallback
  if (value === undefined) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENDPOINT = getEnv('NEXT_PUBLIC_APPWRITE_ENDPOINT', 'https://db.invisiongo.com/v1')
const PROJECT_ID = getEnv('NEXT_PUBLIC_APPWRITE_PROJECT_ID', '6a144cb200033adb6dbb')
const API_KEY = getEnv('APPWRITE_API_KEY')
const DATABASE_ID = 'seoinmediato'
const DATABASE_NAME = 'SEOImediato'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tryRun(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
    console.log(`  [OK] ${label}`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (
      message.includes('already exists') ||
      message.includes('Attribute with the requested ID already exists') ||
      message.includes('Index with the requested ID already exists') ||
      message.includes('Collection with the requested ID already exists') ||
      message.includes('Database with the requested ID already exists')
    ) {
      console.log(`  [SKIP] ${label} — already exists`)
    } else {
      console.error(`  [ERROR] ${label}: ${message}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== SEOImediato Appwrite Setup ===')
  console.log(`Endpoint  : ${ENDPOINT}`)
  console.log(`Project   : ${PROJECT_ID}`)
  console.log(`Database  : ${DATABASE_ID}`)
  console.log('')

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY)

  const databases = new Databases(client)

  const USER_PERMS = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ]

  // -------------------------------------------------------------------------
  // 1. Create database
  // -------------------------------------------------------------------------

  console.log('Creating database...')
  await tryRun(`database "${DATABASE_ID}"`, () =>
    databases.create(DATABASE_ID, DATABASE_NAME)
  )
  await sleep(1000)

  // -------------------------------------------------------------------------
  // 2. projects
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: projects')
  await tryRun('collection projects', () =>
    databases.createCollection(DATABASE_ID, 'projects', 'projects', USER_PERMS)
  )
  await sleep(1000)

  const projectsAttrs: Array<() => Promise<unknown>> = [
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'name', 255, true),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'domain', 255, true),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'status', 20, true),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'businessName', 255, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'businessPhone', 50, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'businessEmail', 255, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'niche', 255, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'googleTokenJson', 10000, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'redirectUrl', 500, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'seoMode', 30, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'seoPathPrefix', 100, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'wizardState', 2000, false),
    () => databases.createIntegerAttribute(DATABASE_ID, 'projects', 'totalKeywords', false, undefined, undefined, 0),
    () => databases.createIntegerAttribute(DATABASE_ID, 'projects', 'totalIndexed', false, undefined, undefined, 0),
    () => databases.createIntegerAttribute(DATABASE_ID, 'projects', 'indexingRate', false, undefined, undefined, 200),
    () => databases.createDatetimeAttribute(DATABASE_ID, 'projects', 'createdAt', true),
    () => databases.createDatetimeAttribute(DATABASE_ID, 'projects', 'updatedAt', true),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'userId', 255, true),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'parentProjectId', 255, false),
    () => databases.createStringAttribute(DATABASE_ID, 'projects', 'indexingOrder', 30, false),
  ]

  for (const attrFn of projectsAttrs) {
    const fnStr = attrFn.toString()
    const keyMatch = fnStr.match(/'projects',\s*'([^']+)'/)
    const label = keyMatch ? `projects.${keyMatch[1]}` : 'projects attribute'
    await tryRun(label, attrFn)
    await sleep(500)
  }

  // -------------------------------------------------------------------------
  // 3. keywords
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: keywords')
  await tryRun('collection keywords', () =>
    databases.createCollection(DATABASE_ID, 'keywords', 'keywords', USER_PERMS)
  )
  await sleep(1000)

  const keywordsAttrs: Array<[string, () => Promise<unknown>]> = [
    ['keywords.projectId', () => databases.createStringAttribute(DATABASE_ID, 'keywords', 'projectId', 255, true)],
    ['keywords.keyword', () => databases.createStringAttribute(DATABASE_ID, 'keywords', 'keyword', 500, true)],
    ['keywords.slug', () => databases.createStringAttribute(DATABASE_ID, 'keywords', 'slug', 500, true)],
    ['keywords.status', () => databases.createStringAttribute(DATABASE_ID, 'keywords', 'status', 20, true)],
    ['keywords.indexedAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'keywords', 'indexedAt', false)],
    ['keywords.createdAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'keywords', 'createdAt', true)],
  ]

  for (const [label, attrFn] of keywordsAttrs) {
    await tryRun(label, attrFn)
    await sleep(500)
  }

  console.log('  Creating indexes for keywords...')
  await sleep(3000) // Wait for attributes to be ready before creating indexes
  await tryRun('index keywords.projectId', () =>
    databases.createIndex(DATABASE_ID, 'keywords', 'idx_projectId', IndexType.Key, ['projectId'], ['ASC'])
  )
  await sleep(500)
  await tryRun('index keywords.status', () =>
    databases.createIndex(DATABASE_ID, 'keywords', 'idx_status', IndexType.Key, ['status'], ['ASC'])
  )
  await sleep(500)
  await tryRun('index keywords.slug', () =>
    databases.createIndex(DATABASE_ID, 'keywords', 'idx_slug', IndexType.Key, ['slug'], ['ASC'])
  )
  await sleep(500)

  // -------------------------------------------------------------------------
  // 4. keyword_configs
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: keyword_configs')
  await tryRun('collection keyword_configs', () =>
    databases.createCollection(DATABASE_ID, 'keyword_configs', 'keyword_configs', USER_PERMS)
  )
  await sleep(1000)

  const keywordConfigsAttrs: Array<[string, () => Promise<unknown>]> = [
    ['keyword_configs.projectId', () => databases.createStringAttribute(DATABASE_ID, 'keyword_configs', 'projectId', 255, true)],
    ['keyword_configs.services', () => databases.createStringAttribute(DATABASE_ID, 'keyword_configs', 'services', 4000, false)],
    ['keyword_configs.prefixModifiers', () => databases.createStringAttribute(DATABASE_ID, 'keyword_configs', 'prefixModifiers', 2000, false)],
    ['keyword_configs.suffixModifiers', () => databases.createStringAttribute(DATABASE_ID, 'keyword_configs', 'suffixModifiers', 2000, false)],
    ['keyword_configs.locations', () => databases.createStringAttribute(DATABASE_ID, 'keyword_configs', 'locations', 4000, false)],
    ['keyword_configs.totalCombinations', () => databases.createIntegerAttribute(DATABASE_ID, 'keyword_configs', 'totalCombinations', false)],
    ['keyword_configs.createdAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'keyword_configs', 'createdAt', true)],
  ]

  for (const [label, attrFn] of keywordConfigsAttrs) {
    await tryRun(label, attrFn)
    await sleep(500)
  }

  // -------------------------------------------------------------------------
  // 5. indexing_jobs
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: indexing_jobs')
  await tryRun('collection indexing_jobs', () =>
    databases.createCollection(DATABASE_ID, 'indexing_jobs', 'indexing_jobs', USER_PERMS)
  )
  await sleep(1000)

  const indexingJobsAttrs: Array<[string, () => Promise<unknown>]> = [
    ['indexing_jobs.projectId', () => databases.createStringAttribute(DATABASE_ID, 'indexing_jobs', 'projectId', 255, true)],
    ['indexing_jobs.status', () => databases.createStringAttribute(DATABASE_ID, 'indexing_jobs', 'status', 20, true)],
    ['indexing_jobs.totalUrls', () => databases.createIntegerAttribute(DATABASE_ID, 'indexing_jobs', 'totalUrls', true)],
    ['indexing_jobs.processedUrls', () => databases.createIntegerAttribute(DATABASE_ID, 'indexing_jobs', 'processedUrls', false, undefined, undefined, 0)],
    ['indexing_jobs.successUrls', () => databases.createIntegerAttribute(DATABASE_ID, 'indexing_jobs', 'successUrls', false, undefined, undefined, 0)],
    ['indexing_jobs.failedUrls', () => databases.createIntegerAttribute(DATABASE_ID, 'indexing_jobs', 'failedUrls', false, undefined, undefined, 0)],
    ['indexing_jobs.lastPosition', () => databases.createIntegerAttribute(DATABASE_ID, 'indexing_jobs', 'lastPosition', false, undefined, undefined, 0)],
    ['indexing_jobs.startedAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'indexing_jobs', 'startedAt', false)],
    ['indexing_jobs.completedAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'indexing_jobs', 'completedAt', false)],
    ['indexing_jobs.errorLog', () => databases.createStringAttribute(DATABASE_ID, 'indexing_jobs', 'errorLog', 10000, false)],
    ['indexing_jobs.createdAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'indexing_jobs', 'createdAt', true)],
  ]

  for (const [label, attrFn] of indexingJobsAttrs) {
    await tryRun(label, attrFn)
    await sleep(500)
  }

  console.log('  Creating indexes for indexing_jobs...')
  await sleep(3000)
  await tryRun('index indexing_jobs.projectId', () =>
    databases.createIndex(DATABASE_ID, 'indexing_jobs', 'idx_projectId', IndexType.Key, ['projectId'], ['ASC'])
  )
  await sleep(500)

  // -------------------------------------------------------------------------
  // 6. location_templates
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: location_templates')
  await tryRun('collection location_templates', () =>
    databases.createCollection(DATABASE_ID, 'location_templates', 'location_templates', USER_PERMS)
  )
  await sleep(1000)

  const locationTemplatesAttrs: Array<[string, () => Promise<unknown>]> = [
    ['location_templates.name', () => databases.createStringAttribute(DATABASE_ID, 'location_templates', 'name', 255, true)],
    ['location_templates.country', () => databases.createStringAttribute(DATABASE_ID, 'location_templates', 'country', 100, true)],
    ['location_templates.locations', () => databases.createStringAttribute(DATABASE_ID, 'location_templates', 'locations', 50000, true)],
    ['location_templates.createdAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'location_templates', 'createdAt', true)],
    ['location_templates.userId', () => databases.createStringAttribute(DATABASE_ID, 'location_templates', 'userId', 255, true)],
  ]

  for (const [label, attrFn] of locationTemplatesAttrs) {
    await tryRun(label, attrFn)
    await sleep(500)
  }

  // -------------------------------------------------------------------------
  // 7. project_landing
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: project_landing')
  await tryRun('collection project_landing', () =>
    databases.createCollection(DATABASE_ID, 'project_landing', 'project_landing', USER_PERMS)
  )
  await sleep(1000)

  const projectLandingAttrs: Array<[string, () => Promise<unknown>]> = [
    ['project_landing.projectId', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'projectId', 255, true)],
    // JSON-blob fields use size > 16383 so Appwrite stores them as TEXT (off-page),
    // keeping the VARCHAR row under the ~64KB MariaDB limit so all attributes fit.
    ['project_landing.businessDescription', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'businessDescription', 20000, false)],
    ['project_landing.services', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'services', 20000, false)],
    ['project_landing.testimonials', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'testimonials', 20000, false)],
    ['project_landing.stats', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'stats', 20000, false)],
    ['project_landing.ctaWhatsappText', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'ctaWhatsappText', 200, false, 'WhatsApp ahora')],
    ['project_landing.ctaCallText', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'ctaCallText', 200, false, 'Llamar ahora')],
    ['project_landing.socialProofMessages', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'socialProofMessages', 20000, false)],
    ['project_landing.colorScheme', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'colorScheme', 50, false, 'dark')],
    ['project_landing.logoUrl', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'logoUrl', 500, false)],
    ['project_landing.backgroundImageUrl', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'backgroundImageUrl', 500, false)],
    ['project_landing.seoArticleTemplate', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'seoArticleTemplate', 50000, false)],
    ['project_landing.facebookUrl', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'facebookUrl', 500, false)],
    ['project_landing.instagramUrl', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'instagramUrl', 500, false)],
    ['project_landing.googleMapsUrl', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'googleMapsUrl', 500, false)],
    ['project_landing.differentiators', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'differentiators', 1000, false)],
    ['project_landing.contentTone', () => databases.createStringAttribute(DATABASE_ID, 'project_landing', 'contentTone', 50, false)],
    ['project_landing.createdAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'project_landing', 'createdAt', true)],
  ]

  for (const [label, attrFn] of projectLandingAttrs) {
    await tryRun(label, attrFn)
    await sleep(500)
  }

  console.log('  Creating indexes for project_landing...')
  await sleep(3000)
  await tryRun('index project_landing.projectId', () =>
    databases.createIndex(DATABASE_ID, 'project_landing', 'idx_projectId', IndexType.Key, ['projectId'], ['ASC'])
  )

  // -------------------------------------------------------------------------
  // 8. keyword_blocks
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: keyword_blocks')
  await tryRun('collection keyword_blocks', () =>
    databases.createCollection(DATABASE_ID, 'keyword_blocks', 'keyword_blocks', USER_PERMS)
  )
  await sleep(1000)

  const keywordBlocksAttrs: Array<[string, () => Promise<unknown>]> = [
    ['keyword_blocks.projectId', () => databases.createStringAttribute(DATABASE_ID, 'keyword_blocks', 'projectId', 255, true)],
    ['keyword_blocks.blockIndex', () => databases.createIntegerAttribute(DATABASE_ID, 'keyword_blocks', 'blockIndex', true)],
    ['keyword_blocks.keywords', () => databases.createStringAttribute(DATABASE_ID, 'keyword_blocks', 'keywords', 1000000, true)],
    ['keyword_blocks.count', () => databases.createIntegerAttribute(DATABASE_ID, 'keyword_blocks', 'count', true)],
    ['keyword_blocks.createdAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'keyword_blocks', 'createdAt', true)],
  ]

  for (const [label, attrFn] of keywordBlocksAttrs) {
    await tryRun(label, attrFn)
    await sleep(500)
  }

  console.log('  Creating indexes for keyword_blocks...')
  await sleep(3000)
  await tryRun('index keyword_blocks.idx_projectId', () =>
    databases.createIndex(DATABASE_ID, 'keyword_blocks', 'idx_projectId', IndexType.Key, ['projectId'], ['ASC'])
  )
  await sleep(500)
  await tryRun('index keyword_blocks.idx_blockIndex', () =>
    databases.createIndex(DATABASE_ID, 'keyword_blocks', 'idx_blockIndex', IndexType.Key, ['projectId', 'blockIndex'], ['ASC', 'ASC'])
  )
  await sleep(500)

  // -------------------------------------------------------------------------
  // 9. google_tokens
  // -------------------------------------------------------------------------

  console.log('\nCreating collection: google_tokens')
  await tryRun('collection google_tokens', () =>
    databases.createCollection(DATABASE_ID, 'google_tokens', 'google_tokens', USER_PERMS)
  )
  await sleep(1000)

  const googleTokensAttrs: Array<[string, () => Promise<unknown>]> = [
    ['google_tokens.projectId', () => databases.createStringAttribute(DATABASE_ID, 'google_tokens', 'projectId', 255, true)],
    ['google_tokens.tokenName', () => databases.createStringAttribute(DATABASE_ID, 'google_tokens', 'tokenName', 255, true)],
    ['google_tokens.tokenJson', () => databases.createStringAttribute(DATABASE_ID, 'google_tokens', 'tokenJson', 5000, true)],
    ['google_tokens.serviceAccountEmail', () => databases.createStringAttribute(DATABASE_ID, 'google_tokens', 'serviceAccountEmail', 500, false)],
    ['google_tokens.dailyQuota', () => databases.createIntegerAttribute(DATABASE_ID, 'google_tokens', 'dailyQuota', false, undefined, undefined, 200)],
    ['google_tokens.urlsSentToday', () => databases.createIntegerAttribute(DATABASE_ID, 'google_tokens', 'urlsSentToday', false, undefined, undefined, 0)],
    ['google_tokens.lastResetDate', () => databases.createStringAttribute(DATABASE_ID, 'google_tokens', 'lastResetDate', 20, false)],
    ['google_tokens.isActive', () => databases.createBooleanAttribute(DATABASE_ID, 'google_tokens', 'isActive', false, true)],
    ['google_tokens.pausedUntil', () => databases.createStringAttribute(DATABASE_ID, 'google_tokens', 'pausedUntil', 30, false)],
    ['google_tokens.createdAt', () => databases.createDatetimeAttribute(DATABASE_ID, 'google_tokens', 'createdAt', true)],
  ]

  for (const [label, attrFn] of googleTokensAttrs) {
    await tryRun(label, attrFn)
    await sleep(500)
  }

  console.log('  Creating indexes for google_tokens...')
  await sleep(3000)
  await tryRun('index google_tokens.idx_projectId', () =>
    databases.createIndex(DATABASE_ID, 'google_tokens', 'idx_projectId', IndexType.Key, ['projectId'], ['ASC'])
  )

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------

  console.log('\n=== Setup complete ===')
}

main().catch((err) => {
  console.error('\n[FATAL]', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
