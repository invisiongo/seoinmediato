import { ID, Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import type { KeywordEntry, KeywordBlock } from '../types'

const BLOCK_SIZE = 5000

/**
 * Save keywords as blocks. Returns total saved count.
 */
export async function saveKeywordBlocks(
  projectId: string,
  keywords: { keyword: string; slug: string }[]
): Promise<number> {
  let saved = 0

  for (let i = 0; i < keywords.length; i += BLOCK_SIZE) {
    const chunk = keywords.slice(i, i + BLOCK_SIZE)
    const entries: KeywordEntry[] = chunk.map(kw => ({
      keyword: kw.keyword,
      slug: kw.slug,
      status: 'pending',
    }))

    await serverDatabases.createDocument(
      DATABASE_ID,
      COLLECTIONS.KEYWORD_BLOCKS,
      ID.unique(),
      {
        projectId,
        blockIndex: Math.floor(i / BLOCK_SIZE),
        keywords: JSON.stringify(entries),
        count: entries.length,
        createdAt: new Date().toISOString(),
      }
    )
    saved += entries.length
  }

  return saved
}

/**
 * Delete all keyword blocks for a project.
 */
export async function deleteKeywordBlocks(projectId: string): Promise<number> {
  let deleted = 0
  let hasMore = true

  while (hasMore) {
    const response = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.KEYWORD_BLOCKS,
      [Query.equal('projectId', projectId), Query.limit(100)]
    )

    if (response.documents.length === 0) {
      hasMore = false
      break
    }

    for (const doc of response.documents) {
      await serverDatabases.deleteDocument(DATABASE_ID, COLLECTIONS.KEYWORD_BLOCKS, doc.$id)
      deleted += (doc.count as number) || 0
    }
  }

  return deleted
}

/**
 * Get all keyword entries for a project (parsed from blocks).
 */
export async function getAllKeywordEntries(projectId: string): Promise<KeywordEntry[]> {
  const blocks = await listBlocks(projectId)
  const entries: KeywordEntry[] = []

  for (const block of blocks) {
    const parsed = JSON.parse(block.keywords as string) as KeywordEntry[]
    entries.push(...parsed)
  }

  return entries
}

/**
 * List all blocks for a project, ordered by blockIndex.
 */
export async function listBlocks(projectId: string): Promise<Array<Record<string, unknown>>> {
  const allBlocks: Array<Record<string, unknown>> = []
  let offset = 0

  while (true) {
    const response = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.KEYWORD_BLOCKS,
      [
        Query.equal('projectId', projectId),
        Query.orderAsc('blockIndex'),
        Query.limit(100),
        Query.offset(offset),
      ]
    )
    allBlocks.push(...response.documents)
    if (response.documents.length < 100) break
    offset += 100
  }

  return allBlocks
}

/**
 * Find a keyword by slug across blocks (lazy: fetches one block at a time).
 * @deprecated Use findKeywordBySlugCached for production SEO routes.
 */
export async function findKeywordBySlug(
  projectId: string,
  slug: string
): Promise<{ keyword: string; slug: string; status: string } | null> {
  let offset = 0

  while (true) {
    const response = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.KEYWORD_BLOCKS,
      [
        Query.equal('projectId', projectId),
        Query.limit(1),
        Query.offset(offset),
      ]
    )

    if (response.documents.length === 0) break

    const block = response.documents[0]
    const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
    const found = entries.find(e => e.slug === slug)
    if (found) return found

    offset++
  }

  return null
}

// ─── In-Memory Slug Cache (TTL 5 min) ──────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000
const PARALLEL_BATCH = 5 // fetch 5 blocks concurrently at a time

interface SlugCacheEntry {
  map: Map<string, KeywordEntry>
  builtAt: number
}

const slugCacheByProject = new Map<string, SlugCacheEntry>()
const buildingPromises = new Map<string, Promise<Map<string, KeywordEntry>>>()

/**
 * Fetch block IDs only (lightweight: no keywords payload).
 */
async function getBlockIds(projectId: string): Promise<string[]> {
  const response = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.KEYWORD_BLOCKS,
    [
      Query.equal('projectId', projectId),
      Query.limit(100),
      Query.select(['$id']),
    ]
  )
  return response.documents.map(d => d.$id)
}

/**
 * Fetch a single block by ID.
 */
async function fetchBlock(blockId: string): Promise<Record<string, unknown>> {
  return await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.KEYWORD_BLOCKS, blockId)
}

/**
 * Build the slug HashMap by fetching blocks in parallel batches.
 * 17 blocks × 5 concurrent = 4 rounds of ~500KB each (vs 1 round of 8.5MB).
 */
async function buildSlugMap(projectId: string): Promise<Map<string, KeywordEntry>> {
  const t0 = Date.now()

  const blockIds = await getBlockIds(projectId)
  const t1 = Date.now()
  console.log(`[SlugCache] ${projectId}: ${blockIds.length} blocks found in ${t1 - t0}ms`)

  const map = new Map<string, KeywordEntry>()

  // Fetch blocks in parallel batches
  for (let i = 0; i < blockIds.length; i += PARALLEL_BATCH) {
    const batch = blockIds.slice(i, i + PARALLEL_BATCH)
    const blocks = await Promise.all(batch.map(id => fetchBlock(id)))

    for (const block of blocks) {
      const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
      for (const entry of entries) {
        map.set(entry.slug, entry)
      }
    }
  }

  const t2 = Date.now()
  console.log(`[SlugCache] ${projectId}: ${map.size} slugs cached in ${t2 - t0}ms (fetch: ${t2 - t1}ms)`)

  slugCacheByProject.set(projectId, { map, builtAt: Date.now() })
  return map
}

/**
 * Get the slug map, using cache if available.
 * Deduplicates concurrent builds (multiple requests during cold start share the same promise).
 */
async function getSlugMap(projectId: string): Promise<Map<string, KeywordEntry>> {
  const cached = slugCacheByProject.get(projectId)
  if (cached && Date.now() - cached.builtAt < CACHE_TTL) {
    return cached.map
  }

  // Deduplicate: if a build is already in progress, reuse it
  const existing = buildingPromises.get(projectId)
  if (existing) return existing

  const promise = buildSlugMap(projectId).finally(() => {
    buildingPromises.delete(projectId)
  })
  buildingPromises.set(projectId, promise)
  return promise
}

/**
 * Parallel search across blocks WITHOUT waiting for full cache.
 * Used as fallback during cold start — searches blocks in parallel batches,
 * returns as soon as slug is found (early exit).
 */
async function parallelSlugSearch(
  projectId: string,
  slug: string
): Promise<KeywordEntry | null> {
  const t0 = Date.now()
  const blockIds = await getBlockIds(projectId)

  for (let i = 0; i < blockIds.length; i += PARALLEL_BATCH) {
    const batch = blockIds.slice(i, i + PARALLEL_BATCH)
    const blocks = await Promise.all(batch.map(id => fetchBlock(id)))

    for (const block of blocks) {
      const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
      const found = entries.find(e => e.slug === slug)
      if (found) {
        console.log(`[SlugCache] parallelSearch found "${slug}" in ${Date.now() - t0}ms`)
        return found
      }
    }
  }

  console.log(`[SlugCache] parallelSearch "${slug}" not found in ${Date.now() - t0}ms`)
  return null
}

/**
 * O(1) keyword lookup using an in-memory HashMap with 5-min TTL.
 * Cold start strategy:
 * - If cache is building (background), does parallel search (doesn't wait for full cache)
 * - If no build in progress, kicks off build AND does parallel search concurrently
 * Cache hit: <1ms
 */
export async function findKeywordBySlugCached(
  projectId: string,
  slug: string
): Promise<KeywordEntry | null> {
  // Fast path: cache hit
  const cached = slugCacheByProject.get(projectId)
  if (cached && Date.now() - cached.builtAt < CACHE_TTL) {
    return cached.map.get(slug) ?? null
  }

  // Cold start: kick off cache build in background (if not already running)
  if (!buildingPromises.has(projectId)) {
    const promise = buildSlugMap(projectId).finally(() => {
      buildingPromises.delete(projectId)
    })
    buildingPromises.set(projectId, promise)
  }

  // Don't wait for full cache — do parallel search immediately
  return parallelSlugSearch(projectId, slug)
}

/**
 * Warm up the cache for a project in background (non-blocking).
 */
export function warmUpSlugCache(projectId: string): void {
  const cached = slugCacheByProject.get(projectId)
  if (cached && Date.now() - cached.builtAt < CACHE_TTL) return
  if (buildingPromises.has(projectId)) return

  const promise = buildSlugMap(projectId).finally(() => {
    buildingPromises.delete(projectId)
  })
  buildingPromises.set(projectId, promise)
}

/**
 * Invalidate the slug cache for a project (call after keyword imports/deletes).
 */
export function invalidateSlugCache(projectId: string): void {
  slugCacheByProject.delete(projectId)
  buildingPromises.delete(projectId)
}

/**
 * Update keyword status in blocks. Returns count of updated keywords.
 */
export async function updateKeywordStatus(
  projectId: string,
  slugs: string[],
  newStatus: KeywordEntry['status']
): Promise<number> {
  const slugSet = new Set(slugs)
  let updated = 0
  const blocks = await listBlocks(projectId)

  for (const block of blocks) {
    const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
    let modified = false

    for (const entry of entries) {
      if (slugSet.has(entry.slug)) {
        entry.status = newStatus
        if (newStatus === 'indexed') {
          entry.indexedAt = new Date().toISOString()
        }
        modified = true
        updated++
        slugSet.delete(entry.slug)
      }
    }

    if (modified) {
      await serverDatabases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.KEYWORD_BLOCKS,
        block.$id as string,
        { keywords: JSON.stringify(entries) }
      )
    }

    if (slugSet.size === 0) break
  }

  return updated
}

/**
 * Get keywords by status for indexing. Returns array with slug info.
 */
export async function getKeywordsByStatus(
  projectId: string,
  statuses: string[]
): Promise<Array<{ slug: string; keyword: string }>> {
  const blocks = await listBlocks(projectId)
  const results: Array<{ slug: string; keyword: string }> = []

  for (const block of blocks) {
    const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
    for (const entry of entries) {
      if (statuses.includes(entry.status)) {
        results.push({ slug: entry.slug, keyword: entry.keyword })
      }
    }
  }

  return results
}

/**
 * Count keywords by status across all blocks.
 */
export async function countKeywordsByStatus(
  projectId: string
): Promise<Record<string, number>> {
  const blocks = await listBlocks(projectId)
  const counts: Record<string, number> = {}

  for (const block of blocks) {
    const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
    for (const entry of entries) {
      counts[entry.status] = (counts[entry.status] || 0) + 1
    }
  }

  return counts
}

/**
 * Get total keyword count for a project from blocks (only fetches count field).
 */
export async function getTotalKeywordCount(projectId: string): Promise<number> {
  const response = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.KEYWORD_BLOCKS,
    [
      Query.equal('projectId', projectId),
      Query.limit(100),
      Query.select(['count']),
    ]
  )

  return response.documents.reduce((sum, doc) => sum + ((doc.count as number) || 0), 0)
}

/**
 * Get paginated keyword slugs for sitemap generation.
 * Optimized: skips blocks before offset range, stops after collecting enough.
 */
export async function getKeywordSlugsForSitemap(
  projectId: string,
  offset: number,
  limit: number
): Promise<Array<{ slug: string; createdAt: string }>> {
  const results: Array<{ slug: string; createdAt: string }> = []
  let skipped = 0
  let blockOffset = 0

  while (results.length < limit) {
    const response = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.KEYWORD_BLOCKS,
      [
        Query.equal('projectId', projectId),
        Query.orderAsc('blockIndex'),
        Query.limit(5),
        Query.offset(blockOffset),
      ]
    )

    if (response.documents.length === 0) break

    for (const block of response.documents) {
      const count = (block.count as number) || 0

      // Skip entire block if all its entries are before our offset
      if (skipped + count <= offset) {
        skipped += count
        continue
      }

      const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
      const createdAt = block.createdAt as string

      for (const entry of entries) {
        if (skipped < offset) {
          skipped++
          continue
        }
        results.push({ slug: entry.slug, createdAt })
        if (results.length >= limit) break
      }

      if (results.length >= limit) break
    }

    blockOffset += 5
  }

  return results
}

/**
 * Reset all keywords of certain statuses back to a target status.
 */
export async function resetKeywordStatuses(
  projectId: string,
  fromStatuses: string[],
  toStatus: KeywordEntry['status']
): Promise<number> {
  const blocks = await listBlocks(projectId)
  let reset = 0

  for (const block of blocks) {
    const entries = JSON.parse(block.keywords as string) as KeywordEntry[]
    let modified = false

    for (const entry of entries) {
      if (fromStatuses.includes(entry.status)) {
        entry.status = toStatus
        modified = true
        reset++
      }
    }

    if (modified) {
      await serverDatabases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.KEYWORD_BLOCKS,
        block.$id as string,
        { keywords: JSON.stringify(entries) }
      )
    }
  }

  return reset
}

/**
 * Get random keywords from a project (efficient: loads only 1 random block).
 * Used for internal linking between SEO pages.
 * Excludes the current slug so we don't link to ourselves.
 */
export async function getRandomKeywords(
  projectId: string,
  excludeSlug: string,
  count: number = 6
): Promise<Array<{ keyword: string; slug: string }>> {
  // Use cache if available (no extra DB hit)
  const cached = slugCacheByProject.get(projectId)
  if (cached && Date.now() - cached.builtAt < CACHE_TTL) {
    const all = Array.from(cached.map.values())
      .filter(e => e.slug !== excludeSlug)
    // Fisher-Yates shuffle on a small sample
    for (let i = all.length - 1; i > 0 && i > all.length - count - 1; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(-count).map(e => ({ keyword: e.keyword, slug: e.slug }))
  }

  // No cache: fetch 1 random block (lightweight)
  try {
    const blockIds = await getBlockIds(projectId)
    if (blockIds.length === 0) return []

    const randomIdx = Math.floor(Math.random() * blockIds.length)
    const block = await fetchBlock(blockIds[randomIdx])
    const entries = JSON.parse(block.keywords as string) as KeywordEntry[]

    const filtered = entries.filter(e => e.slug !== excludeSlug)
    // Fisher-Yates partial shuffle
    for (let i = filtered.length - 1; i > 0 && i > filtered.length - count - 1; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[filtered[i], filtered[j]] = [filtered[j], filtered[i]]
    }
    return filtered.slice(-count).map(e => ({ keyword: e.keyword, slug: e.slug }))
  } catch (error) {
    console.error('[getRandomKeywords] Error:', error)
    return []
  }
}
