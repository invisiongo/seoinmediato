import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { isAppHost, getDomainFromHost, findProjectsByDomain, findProjectBySitemapSlug } from '@/features/sites/services/projectLookup'
import { findKeywordBySlugCached, warmUpSlugCache, getTotalKeywordCount, getKeywordSlugsForSitemap } from '@/features/keywords/services/keywordBlockService'
import { extractLocation, generateSeoContent, generateH2Variation } from '@/features/sites/templates/seo-content'
import { generateNeuroLanding } from '@/features/sites/templates/neuro-landing'
import { renderArticle } from '@/features/projects/services/seoArticleService'
import { getPublicUrl, getPublicBase, ensureProtocol } from '@/shared/lib/seo-urls'

/** Deterministic number from string — same input always returns same output */
function hashToRange(str: string, min: number, max: number): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return min + (Math.abs(hash) % (max - min + 1))
}

interface RouteParams {
  params: Promise<{ slug: string[] }>
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug: slugSegments } = await params

  // Use 'host' (same as middleware) — x-forwarded-host may point to the app domain in Traefik
  const host = request.headers.get('host') || ''

  // App host: this catch-all should NOT handle dashboard routes.
  // More specific routes (/login, /dashboard/*) take priority in Next.js,
  // so this only fires for truly unmatched paths on the app host.
  if (isAppHost(host)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const fullPath = slugSegments.join('/')
  const domain = getDomainFromHost(host)

  try {
    // ─── Sitemap routing ────────────────────────────────────────────
    // Handles both root sitemaps (sitemap-name.xml) and prefixed sitemaps
    // (servicios/sitemap-name.xml) for projects with seoPathPrefix.

    // Check prefixed sitemap first: prefix/sitemap-name.xml or prefix/sitemap-name-N.xml
    const prefixedSitemapMatch = fullPath.match(/^([a-z0-9-]+)\/sitemap-([a-z0-9-]+)\.xml$/)
    if (prefixedSitemapMatch) {
      const urlPrefix = prefixedSitemapMatch[1]
      const possibleSlug = prefixedSitemapMatch[2]

      const indexProject = await findProjectBySitemapSlug(domain, possibleSlug)
      if (indexProject) {
        return await handleSitemapIndex(domain, possibleSlug, urlPrefix)
      }

      const pageMatch = possibleSlug.match(/^(.+)-(\d+)$/)
      if (pageMatch) {
        return await handleSitemapPage(domain, pageMatch[1], parseInt(pageMatch[2], 10), urlPrefix)
      }

      return new NextResponse('Sitemap no encontrado', { status: 404 })
    }

    // Root sitemap: sitemap-name.xml or sitemap-name-N.xml
    const sitemapMatch = fullPath.match(/^sitemap-([a-z0-9-]+)\.xml$/)
    if (sitemapMatch) {
      const possibleSlug = sitemapMatch[1]
      const { findProjectBySitemapSlug: findBySitemapSlug } = await import('@/features/sites/services/projectLookup')

      const indexProject = await findBySitemapSlug(domain, possibleSlug)
      if (indexProject) {
        return await handleSitemapIndex(domain, possibleSlug)
      }

      // No project matched — try interpreting trailing -N as page number
      const pageMatch = possibleSlug.match(/^(.+)-(\d+)$/)
      if (pageMatch) {
        return await handleSitemapPage(domain, pageMatch[1], parseInt(pageMatch[2], 10))
      }

      // Pure numeric legacy: sitemap-1.xml
      if (/^\d+$/.test(possibleSlug)) {
        return await handleSitemapPage(domain, null, parseInt(possibleSlug, 10))
      }

      return await handleSitemapIndex(domain, possibleSlug)
    }

    // ─── SEO Page ─────────────────────────────────────────────────────
    return await handleSeoPage(request, domain, fullPath)
  } catch (error) {
    console.error('Catch-all route error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}

async function handleSitemapIndex(domain: string, projectSlug: string, urlPrefix?: string): Promise<NextResponse> {
  const project = await findProjectBySitemapSlug(domain, projectSlug)
  if (!project) {
    return new NextResponse('Proyecto no encontrado', { status: 404 })
  }

  warmUpSlugCache(project.$id as string)

  if ((project.status as string) === 'paused') {
    const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</sitemapindex>`
    return new NextResponse(empty, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    })
  }

  const totalKeywords = await getTotalKeywordCount(project.$id as string)
  const URLS_PER_SITEMAP = 1000
  const totalSitemaps = Math.max(1, Math.ceil(totalKeywords / URLS_PER_SITEMAP))
  const domainOnly = ensureProtocol(String(project.domain || '').replace(/\/$/, ''))
  // Use prefix from URL if provided, else fall back to project's seoPathPrefix
  const prefix = urlPrefix || String(project.seoPathPrefix || '').replace(/^\/|\/$/g, '')
  const subSitemapBase = prefix
    ? `${domainOnly}/${prefix}/sitemap-${projectSlug}`
    : `${domainOnly}/sitemap-${projectSlug}`

  let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>\n`
  sitemapIndex += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  for (let i = 1; i <= totalSitemaps; i++) {
    sitemapIndex += `  <sitemap>\n`
    sitemapIndex += `    <loc>${subSitemapBase}-${i}.xml</loc>\n`
    sitemapIndex += `    <lastmod>2026-03-01</lastmod>\n`
    sitemapIndex += `  </sitemap>\n`
  }

  sitemapIndex += `</sitemapindex>`

  return new NextResponse(sitemapIndex, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
  })
}

async function handleSitemapPage(domain: string, projectSlug: string | null, page: number, _urlPrefix?: string): Promise<NextResponse> {
  if (isNaN(page) || page < 1) {
    return new NextResponse('Numero de sitemap invalido', { status: 400 })
  }

  // Find project: by sitemap slug if provided, otherwise first match by domain (legacy)
  const project = projectSlug
    ? await findProjectBySitemapSlug(domain, projectSlug)
    : (await findProjectsByDomain(domain))[0] ?? null

  if (!project) {
    return new NextResponse('Proyecto no encontrado', { status: 404 })
  }

  warmUpSlugCache(project.$id as string)

  if ((project.status as string) === 'paused') {
    const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`
    return new NextResponse(empty, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    })
  }

  const URLS_PER_SITEMAP = 1000
  const offset = (page - 1) * URLS_PER_SITEMAP

  const slugs = await getKeywordSlugsForSitemap(project.$id as string, offset, URLS_PER_SITEMAP)

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  for (const item of slugs) {
    const lastmod = item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
    sitemap += `  <url>\n`
    sitemap += `    <loc>${getPublicUrl(project, item.slug)}</loc>\n`
    sitemap += `    <lastmod>${lastmod}</lastmod>\n`
    sitemap += `    <changefreq>monthly</changefreq>\n`
    sitemap += `    <priority>0.8</priority>\n`
    sitemap += `  </url>\n`
  }

  sitemap += `</urlset>`

  return new NextResponse(sitemap, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
  })
}

async function handleSeoPage(
  _request: NextRequest,
  domain: string,
  slug: string
): Promise<NextResponse> {
  // Search keyword across all projects with this domain (regions first)
  const matchingProjects = await findProjectsByDomain(domain)

  if (matchingProjects.length === 0) {
    return new NextResponse('Proyecto no encontrado', { status: 404 })
  }

  const regions = matchingProjects.filter(p => p.parentProjectId)
  const parents = matchingProjects.filter(p => !p.parentProjectId)
  const searchOrder = [...regions, ...parents]

  let project: Record<string, unknown> | null = null
  let keyword: { keyword: string; slug: string; status: string } | null = null

  for (const candidate of searchOrder) {
    if ((candidate.status as string) === 'paused') continue
    // If candidate has a seoPathPrefix, strip it from the URL slug before lookup
    // (URLs are public-facing as /{prefix}/{slug} but DB stores raw slug only).
    const prefix = String(candidate.seoPathPrefix || '').replace(/^\/|\/$/g, '')
    const lookupSlug = prefix && slug.startsWith(`${prefix}/`)
      ? slug.slice(prefix.length + 1)
      : slug
    const found = await findKeywordBySlugCached(candidate.$id as string, lookupSlug)
    if (found) {
      project = candidate
      keyword = found
      break
    }
  }

  if (!project || !keyword) {
    return new NextResponse('Pagina no encontrada', { status: 404 })
  }

  const kw = keyword.keyword
  const businessName = (project.businessName as string) || (project.name as string)
  const businessPhone = (project.businessPhone as string) || ''
  const businessEmail = (project.businessEmail as string) || ''
  const niche = (project.niche as string) || ''
  const projectDomain = (project.domain as string).replace(/\/$/, '')
  const seoMode = (project.seoMode as string) || 'full_site'
  const redirectUrl = (project.redirectUrl as string) || ''
  const canonicalUrl = getPublicUrl(project, keyword.slug)

  const location = extractLocation(kw)

  const title = `${kw} | ${businessName}`
  const metaDesc = `ᐅ ${kw} ✅ Servicio Garantizado ✅ ${businessName}`

  // Deterministic date based on keyword hash (fixed, never changes between crawls)
  const dateHash = hashToRange(kw, 1, 28)
  const publishedDate = `2026-02-${String(dateHash).padStart(2, '0')}T12:00:00-06:00`

  // Fetch landing doc FIRST — needed for lovableUrl redirect
  let landingDoc: Record<string, unknown> | null = null
  try {
    const landingResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      [Query.equal('projectId', project.$id as string), Query.limit(1)]
    )
    if (landingResult.documents.length > 0) {
      landingDoc = landingResult.documents[0] as Record<string, unknown>
    } else if (project.parentProjectId) {
      const parentLanding = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECT_LANDING,
        [Query.equal('projectId', project.parentProjectId as string), Query.limit(1)]
      )
      if (parentLanding.documents.length > 0) {
        landingDoc = parentLanding.documents[0] as Record<string, unknown>
      }
    }
  } catch {
    // Continue without landing data
  }

  // lovableUrl overrides redirectUrl — if set, all non-bot visitors go to Lovable
  const effectiveRedirect = String(landingDoc?.lovableUrl || '').trim() || redirectUrl
  const lovableUrl = String(landingDoc?.lovableUrl || '').trim()
  const shouldRedirect = lovableUrl || (seoMode === 'subdomain_redirect' && effectiveRedirect)
  const redirectScript = shouldRedirect
    ? `<script>(function(){var b=/googlebot|bingbot|slurp|duckduckbot|yandexbot|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|pinterestbot|developers\\.google\\.com/i;if(!b.test(navigator.userAgent)){window.location.replace("${escapeHtml(effectiveRedirect)}");}})();</script>`
    : ''

  const socialLinks = {
    facebook: String(landingDoc?.facebookUrl || ''),
    instagram: String(landingDoc?.instagramUrl || ''),
    googleMaps: String(landingDoc?.googleMapsUrl || ''),
  }
  const sameAs = [socialLinks.facebook, socialLinks.instagram, socialLinks.googleMaps].filter(Boolean)
  const mainSiteUrl = redirectUrl || ensureProtocol(projectDomain)
  const domainUrl = ensureProtocol(projectDomain)

  // ─── Schemas (aligned with Rank Math) ──────────────────────────────
  const schemaOrganization = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: businessName,
    url: domainUrl,
    ...(String(landingDoc?.logoUrl || '') && { logo: String(landingDoc?.logoUrl || '') }),
    ...(sameAs.length > 0 && { sameAs }),
  })

  const schemaWebSite = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: businessName,
    url: domainUrl,
  })

  const schemaItemPage = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    name: title,
    url: canonicalUrl,
    datePublished: publishedDate,
    dateModified: publishedDate,
    publisher: { '@type': 'Organization', name: businessName },
  })

  const schemaLocalBusiness = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: businessName,
    ...(businessPhone && { telephone: businessPhone }),
    ...(businessEmail && { email: businessEmail }),
    description: niche,
    ...(location && { areaServed: location }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(socialLinks.googleMaps && { hasMap: socialLinks.googleMaps }),
  })

  const schemaBreadcrumb = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: businessName, item: domainUrl },
      { '@type': 'ListItem', position: 2, name: kw, item: canonicalUrl },
    ],
  })

  let faqsForSchema: Array<{ question: string; answer: string }> = []
  try {
    const faqRaw = String(landingDoc?.faqs || '[]')
    const parsed = JSON.parse(faqRaw)
    if (Array.isArray(parsed)) faqsForSchema = parsed
  } catch { /* no faqs */ }

  const schemaFaq = faqsForSchema.length > 0 ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqsForSchema.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }) : null

  const schemaProduct = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: kw,
    description: `${kw} - ${businessName}`,
    brand: { '@type': 'Brand', name: businessName },
    review: {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: businessName },
      datePublished: publishedDate,
    },
  })

  const articleTemplate = String(landingDoc?.seoArticleTemplate || '')
  const renderedArticle = articleTemplate
    ? renderArticle(articleTemplate, kw, location, businessName, niche, businessPhone)
    : ''

  const seoContent = generateSeoContent(keyword.slug, {
    keyword: kw,
    businessName,
    niche,
    location,
    businessDescription: String(landingDoc?.businessDescription || ''),
    differentiators: String(landingDoc?.differentiators || ''),
  })
  const h2 = generateH2Variation(kw, businessName)

  const bodyContent = generateNeuroLanding({
    keyword: kw,
    businessName,
    businessPhone,
    businessEmail,
    niche,
    content: renderedArticle || seoContent,
    h2,
    location,
    mainSiteUrl,
    landingData: landingDoc ? {
      businessDescription: String(landingDoc.businessDescription || ''),
      videoUrl: String(landingDoc.videoUrl || ''),
      faqs: String(landingDoc.faqs || '[]'),
      galleryTitle: String(landingDoc.galleryTitle || ''),
      gallerySubtitle: String(landingDoc.gallerySubtitle || ''),
      photo1: String(landingDoc.photo1 || ''), photo1Caption: String(landingDoc.photo1Caption || ''),
      photo2: String(landingDoc.photo2 || ''), photo2Caption: String(landingDoc.photo2Caption || ''),
      photo3: String(landingDoc.photo3 || ''), photo3Caption: String(landingDoc.photo3Caption || ''),
      photo4: String(landingDoc.photo4 || ''), photo4Caption: String(landingDoc.photo4Caption || ''),
      photo5: String(landingDoc.photo5 || ''), photo5Caption: String(landingDoc.photo5Caption || ''),
      photo6: String(landingDoc.photo6 || ''), photo6Caption: String(landingDoc.photo6Caption || ''),
      services: String(landingDoc.services || '[]'),
      testimonials: String(landingDoc.testimonials || '[]'),
      stats: String(landingDoc.stats || '[]'),
      socialProofMessages: String(landingDoc.socialProofMessages || '[]'),
      ctaWhatsappText: String(landingDoc.ctaWhatsappText || 'WhatsApp Directo'),
      ctaCallText: String(landingDoc.ctaCallText || 'Llamar Ahora'),
      colorScheme: String(landingDoc.colorScheme || 'dark'),
      logoUrl: String(landingDoc.logoUrl || ''),
      backgroundImageUrl: String(landingDoc.backgroundImageUrl || ''),
      facebookUrl: String(landingDoc.facebookUrl || ''),
      instagramUrl: String(landingDoc.instagramUrl || ''),
      googleMapsUrl: String(landingDoc.googleMapsUrl || ''),
    } : undefined,
  })

  const logoUrl = String(landingDoc?.logoUrl || '')
  const faviconTag = logoUrl ? `<link rel="icon" href="${logoUrl}" type="image/png">` : ''
  const ogImageTag = logoUrl ? `<meta property="og:image" content="${escapeHtml(logoUrl)}">` : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(metaDesc)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
${faviconTag}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="es_ES">
<meta property="article:published_time" content="${publishedDate}">
<meta property="article:modified_time" content="${publishedDate}">
${ogImageTag}
<meta name="robots" content="index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
<script type="application/ld+json">${schemaOrganization}</script>
<script type="application/ld+json">${schemaWebSite}</script>
<script type="application/ld+json">${schemaItemPage}</script>
<script type="application/ld+json">${schemaLocalBusiness}</script>
<script type="application/ld+json">${schemaProduct}</script>
<script type="application/ld+json">${schemaBreadcrumb}</script>
${schemaFaq ? `<script type="application/ld+json">${schemaFaq}</script>` : ''}
${redirectScript}
</head>
${bodyContent}
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
