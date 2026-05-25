import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

// App host is derived from NEXT_PUBLIC_APP_URL — single source of truth, no hardcoded domains.
const APP_URL_HOST = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
const APP_HOSTS = [APP_URL_HOST, 'localhost', '127.0.0.1'].filter(Boolean)

export function isAppHost(host: string): boolean {
  const hostname = host.split(':')[0]
  return APP_HOSTS.some(h => hostname === h)
}

export function getDomainFromHost(host: string): string {
  return host.split(':')[0]
}

// ─── Project Cache (TTL 5 min) ──────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000
let projectCache: Record<string, unknown>[] = []
let projectCacheTime = 0

async function getProjectsCached(): Promise<Record<string, unknown>[]> {
  const now = Date.now()
  if (projectCache.length > 0 && now - projectCacheTime < CACHE_TTL) {
    return projectCache
  }

  const allProjects = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    [Query.limit(100)]
  )
  projectCache = allProjects.documents as Record<string, unknown>[]
  projectCacheTime = now
  return projectCache
}

/** Strip protocol, www subdomain, and trailing slash for domain comparison */
const normalizeDomain = (d: string) =>
  d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

export async function findProjectByDomain(
  domain: string
): Promise<Record<string, unknown> | null> {
  const projects = await getProjectsCached()
  const norm = normalizeDomain(domain)
  const project = projects.find(
    (p) => normalizeDomain(p.domain as string) === norm
  )
  return project ?? null
}

/**
 * Find a project by domain + sitemap slug.
 * Multiple projects may share the same domain, so we match by both.
 */
export async function findProjectBySitemapSlug(
  domain: string,
  sitemapSlug: string
): Promise<Record<string, unknown> | null> {
  const { projectNameToSlug } = await import('@/shared/lib/seo-urls')
  const projects = await getProjectsCached()
  const norm = normalizeDomain(domain)
  const project = projects.find((p) => {
    if (normalizeDomain(p.domain as string) !== norm) return false
    return projectNameToSlug(p.name as string) === sitemapSlug
  })
  return project ?? null
}

/**
 * Find all projects matching a domain.
 */
export async function findProjectsByDomain(
  domain: string
): Promise<Record<string, unknown>[]> {
  const projects = await getProjectsCached()
  const norm = normalizeDomain(domain)
  return projects.filter(
    (p) => normalizeDomain(p.domain as string) === norm
  )
}
