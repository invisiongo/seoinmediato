import { ID } from 'appwrite'
import { getDatabases } from '@/shared/lib/appwrite-client'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import type { Keyword, KeywordConfig } from '../types'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')    // remove special chars
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '')           // trim hyphens
}

export interface GeneratedKeyword {
  keyword: string
  slug: string
}

export function generateCombinations(
  services: string[],
  prefixes: string[],
  suffixes: string[],
  locations: string[]
): GeneratedKeyword[] {
  const results: GeneratedKeyword[] = []
  const seen = new Set<string>()

  function add(keyword: string) {
    const trimmed = keyword.replace(/\s+/g, ' ').trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    results.push({ keyword: trimmed, slug: slugify(trimmed) })
  }

  for (const prefix of prefixes) {
    for (const service of services) {
      for (const suffix of suffixes) {
        // prefix + service + suffix + location
        for (const location of locations) {
          add(`${prefix} ${service} ${suffix} en ${location}`)
        }
        // prefix + service + suffix (without location)
        add(`${prefix} ${service} ${suffix}`)
      }
      // prefix + service + location (without suffix)
      for (const location of locations) {
        add(`${prefix} ${service} en ${location}`)
      }
    }
  }

  return results
}

export function calculateProjection(
  servicesCount: number,
  prefixesCount: number,
  suffixesCount: number,
  locationsCount: number
): number {
  // prefix * service * suffix * (locations + 1 for no-location) + prefix * service * locations
  return (
    prefixesCount * servicesCount * suffixesCount * (locationsCount + 1) +
    prefixesCount * servicesCount * locationsCount
  )
}

/**
 * Delete all keyword blocks for a project via server-side API route.
 * Uses node-appwrite server SDK to avoid client rate limits.
 */
export async function deleteKeywordsByProject(projectId: string): Promise<number> {
  const res = await fetch(`/api/projects/${projectId}/keywords`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al eliminar keywords')
  return data.deleted as number
}

/**
 * Bulk save keywords via server-side API route.
 * Sends 5000 keywords per request; server stores each batch as a single
 * keyword_block document — one createDocument call per 5000 keywords.
 */
export async function saveKeywordsBatch(
  projectId: string,
  keywords: GeneratedKeyword[],
  onProgress?: (saved: number, total: number, elapsedMs: number) => void,
  shouldAbort?: () => boolean
): Promise<number> {
  const BATCH_SIZE = 5000
  const startTime = Date.now()
  let saved = 0

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    if (shouldAbort?.()) break

    const batch = keywords.slice(i, i + BATCH_SIZE)
    const res = await fetch(`/api/projects/${projectId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: batch }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Error al guardar batch')
    }

    const data = await res.json()
    saved += data.saved as number
    onProgress?.(saved, keywords.length, Date.now() - startTime)
  }

  return saved
}

export async function saveKeywordConfig(
  projectId: string,
  services: string[],
  prefixes: string[],
  suffixes: string[],
  locations: string[],
  totalCombinations: number
): Promise<KeywordConfig> {
  const doc = await getDatabases().createDocument(
    DATABASE_ID,
    COLLECTIONS.KEYWORD_CONFIGS,
    ID.unique(),
    {
      projectId,
      services: services.join('\n'),
      prefixModifiers: prefixes.join('\n'),
      suffixModifiers: suffixes.join('\n'),
      locations: locations.join('\n'),
      totalCombinations,
      createdAt: new Date().toISOString(),
    }
  )
  return doc as unknown as KeywordConfig
}

/**
 * List all keywords for a project via server-side API route.
 * The server assembles keywords from keyword_block documents and returns
 * a flat array with synthetic IDs.
 */
export async function listKeywordsByProject(projectId: string): Promise<Keyword[]> {
  const res = await fetch(`/api/projects/${projectId}/keywords`)
  if (!res.ok) return []
  const data = await res.json()
  return (data.keywords || []) as Keyword[]
}

export function exportToTxt(keywords: GeneratedKeyword[]): string {
  return keywords.map((k) => k.keyword).join('\n')
}

export function exportToCsv(keywords: GeneratedKeyword[], domain: string, seoPathPrefix?: string): string {
  const header = 'keyword,slug,url_completa'
  const base = domain.replace(/\/$/, '')
  const prefix = (seoPathPrefix || '').replace(/^\/|\/$/g, '')
  const rows = keywords.map((k) => {
    const url = prefix ? `${base}/${prefix}/${k.slug}/` : `${base}/${k.slug}/`
    return `"${k.keyword}","${k.slug}","${url}"`
  })
  return [header, ...rows].join('\n')
}
