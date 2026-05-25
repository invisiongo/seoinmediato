/**
 * Centralized SEO URL construction.
 *
 * Projects with a `seoPathPrefix` (e.g. "servicios") generate public URLs like:
 *   https://tu-dominio.com/servicios/{slug}/
 *
 * Projects without a prefix (subdomain mode) generate:
 *   https://sub.tu-dominio.com/{slug}/
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectLike = Record<string, any>

/**
 * Ensure a domain always starts with https://.
 */
export function ensureProtocol(domain: string): string {
  if (domain.startsWith('https://') || domain.startsWith('http://')) return domain
  return `https://${domain}`
}

/**
 * Build the public URL for a keyword slug.
 * Handles trailing slashes and optional path prefix.
 */
export function getPublicUrl(project: ProjectLike, slug: string): string {
  const domain = ensureProtocol(String(project.domain || '').replace(/\/$/, ''))
  const prefix = String(project.seoPathPrefix || '').replace(/^\/|\/$/g, '')
  if (prefix) {
    return `${domain}/${prefix}/${slug}`
  }
  return `${domain}/${slug}`
}

/**
 * Build the base public URL (domain + prefix, no slug).
 * Useful for sitemaps and robots.txt.
 */
export function getPublicBase(project: ProjectLike): string {
  const domain = ensureProtocol(String(project.domain || '').replace(/\/$/, ''))
  const prefix = String(project.seoPathPrefix || '').replace(/^\/|\/$/g, '')
  if (prefix) {
    return `${domain}/${prefix}`
  }
  return domain
}

/**
 * Convert a project name to a sitemap-safe slug.
 * "Invision México " → "invision-mexico"
 */
export function projectNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Build the public sitemap index URL for a project.
 * Sitemaps live at root (no prefix) so GSC accepts them as standard sitemap URLs:
 *   https://example.com/sitemap-{name}.xml
 */
export function getSitemapUrl(project: ProjectLike): string {
  const domain = ensureProtocol(String(project.domain || '').replace(/\/$/, ''))
  const slug = projectNameToSlug(String(project.name || ''))
  return `${domain}/sitemap-${slug}.xml`
}
