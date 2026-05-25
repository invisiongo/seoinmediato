import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { findKeywordBySlugCached, getTotalKeywordCount, getKeywordSlugsForSitemap, getRandomKeywords } from '@/features/keywords/services/keywordBlockService'
import { extractLocation } from '@/features/sites/templates/seo-content'
import { generateNeuroLanding } from '@/features/sites/templates/neuro-landing'
import { getPublicUrl, getPublicBase, projectNameToSlug, ensureProtocol } from '@/shared/lib/seo-urls'
import { findProjectBySitemapSlug, findProjectsByDomain } from '@/features/sites/services/projectLookup'

/** Deterministic number from string — same input always returns same output */
function hashToRange(str: string, min: number, max: number): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return min + (Math.abs(hash) % (max - min + 1))
}

interface RouteParams {
  params: Promise<{ domain: string; slug: string }>
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { domain: rawDomain, slug } = await params
  const domain = decodeURIComponent(rawDomain)

  // ─── Sitemap page: sitemap-{projectSlug}-N.xml (check BEFORE index) ─
  const sitemapPageMatch = slug.match(/^sitemap-([a-z0-9-]+?)-(\d+)\.xml$/)
  if (sitemapPageMatch) {
    return await handleSitemapPage(domain, sitemapPageMatch[1], parseInt(sitemapPageMatch[2], 10))
  }

  // ─── Sitemap index: sitemap-{projectSlug}.xml ─────────────────────
  const sitemapIndexMatch = slug.match(/^sitemap-([a-z0-9-]+)\.xml$/)
  if (sitemapIndexMatch) {
    const projectSlug = sitemapIndexMatch[1]
    // Legacy numeric page (sitemap-1.xml, sitemap-2.xml)
    if (/^\d+$/.test(projectSlug)) {
      return await handleSitemapPage(domain, null, parseInt(projectSlug, 10))
    }
    return await handleSitemapIndex(domain, projectSlug)
  }

  try {
    // Find all projects matching this domain (parent + regions)
    const matchingProjects = await findProjectsByDomain(domain)

    if (matchingProjects.length === 0) {
      return new NextResponse('Proyecto no encontrado', { status: 404 })
    }

    // Search keyword across all projects with this domain (regions first, then parent)
    const regions = matchingProjects.filter(p => p.parentProjectId)
    const parents = matchingProjects.filter(p => !p.parentProjectId)
    const searchOrder = [...regions, ...parents]

    let project: Record<string, unknown> | null = null
    let keyword: { keyword: string; slug: string; status: string } | null = null

    for (const candidate of searchOrder) {
      if ((candidate.status as string) === 'paused') continue
      const found = await findKeywordBySlugCached(candidate.$id as string, slug)
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
    const canonicalUrl = getPublicUrl(project, slug)

    const location = extractLocation(kw)

    const title = `${kw} | ${businessName}`
    const metaDesc = `ᐅ ${kw} ✅ Servicio Garantizado ✅ ${businessName}`

    // Deterministic date based on keyword hash (fixed, never changes between crawls)
    const dateHash = hashToRange(kw, 1, 28)
    const publishedDate = `2026-02-${String(dateHash).padStart(2, '0')}T12:00:00-06:00`

    const redirectScript =
      seoMode === 'subdomain_redirect' && redirectUrl
        ? `<script>(function(){var b=/googlebot|bingbot|slurp|duckduckbot|yandexbot|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|pinterestbot|developers\\.google\\.com/i;if(!b.test(navigator.userAgent)){window.location.replace("${escapeHtml(redirectUrl)}");}})();</script>`
        : ''

    // Fetch landing doc: try region first, then fall back to parent
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

    // Social profiles
    const socialLinks = {
      facebook: String(landingDoc?.facebookUrl || ''),
      instagram: String(landingDoc?.instagramUrl || ''),
      googleMaps: String(landingDoc?.googleMapsUrl || ''),
    }
    const sameAs = [socialLinks.facebook, socialLinks.instagram, socialLinks.googleMaps].filter(Boolean)

    // Get the main site URL for backlinks (parent project's redirect or its own domain)
    const mainSiteUrl = redirectUrl || ensureProtocol(projectDomain)

    // ─── Schemas (aligned with Rank Math output) ─────────────────────
    const domainUrl = ensureProtocol(projectDomain)

    // Schema: Organization
    const schemaOrganization = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: businessName,
      url: domainUrl,
      ...(String(landingDoc?.logoUrl || '') && { logo: String(landingDoc?.logoUrl || '') }),
      ...(sameAs.length > 0 && { sameAs }),
    })

    // Schema: WebSite
    const schemaWebSite = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: businessName,
      url: domainUrl,
    })

    // Schema: ItemPage (like Rank Math — with fixed dates)
    const schemaItemPage = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemPage',
      name: title,
      url: canonicalUrl,
      datePublished: publishedDate,
      dateModified: publishedDate,
      ...(String(landingDoc?.logoUrl || '') && { image: String(landingDoc?.logoUrl || '') }),
      publisher: {
        '@type': 'Organization',
        name: businessName,
        ...(String(landingDoc?.logoUrl || '') && { logo: { '@type': 'ImageObject', url: String(landingDoc?.logoUrl || '') } }),
      },
    })

    // Schema: LocalBusiness
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

    // Schema: Product (with review like Mario/Rank Math — needed for rich snippets)
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

    // Fetch related keywords for internal linking
    const relatedKeywords = await getRandomKeywords(project.$id as string, slug, 6)
    const relatedLinksHtml = relatedKeywords.length > 0
      ? `<nav style="max-width:1100px;margin:0 auto;padding:0 20px 40px"><div style="background:rgba(15,13,40,0.6);border:1px solid #312c52;border-radius:16px;padding:24px">
        <h2 style="font-size:1.2rem;font-weight:700;color:#fff;margin:0 0 16px">Servicios Relacionados</h2>
        <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px">
          ${relatedKeywords.map(rk => {
            const rkUrl = getPublicUrl(project, rk.slug)
            return `<li><a href="${escapeHtml(rkUrl)}" style="display:block;padding:10px 14px;background:rgba(6,1,41,0.6);border:1px solid #312c52;border-radius:10px;color:#c8c9e3;text-decoration:none;font-size:14px;transition:border-color .3s" onmouseover="this.style.borderColor='#6e00ff'" onmouseout="this.style.borderColor='#312c52'">${escapeHtml(rk.keyword)}</a></li>`
          }).join('\n          ')}
        </ul>
      </div></nav>`
      : ''

    const neuroHtml = generateNeuroLanding({
      keyword: kw,
      businessName,
      businessPhone,
      businessEmail,
      niche,
      content: '',
      h2: '',
      location,
      mainSiteUrl,
      landingData: landingDoc ? {
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

    // Inject internal links before </main>
    const bodyContent = relatedLinksHtml
      ? neuroHtml.replace('</main>', `${relatedLinksHtml}\n</main>`)
      : neuroHtml

    const logoUrl = String(landingDoc?.logoUrl || '')
    const faviconTag = `<link rel="icon" href="/favicon-invision.png" type="image/png">`
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
${redirectScript}
</head>
${bodyContent}
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('SEO page error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}

// ─── Sitemap Handlers ─────────────────────────────────────────────────

async function handleSitemapIndex(domain: string, sitemapSlug: string): Promise<NextResponse> {
  try {
    const project = await findProjectBySitemapSlug(domain, sitemapSlug)
    if (!project) {
      return new NextResponse('Proyecto no encontrado', { status: 404 })
    }

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
    const publicBase = getPublicBase(project)

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

    for (let i = 1; i <= totalSitemaps; i++) {
      xml += `  <sitemap>\n`
      xml += `    <loc>${publicBase}/sitemap-${sitemapSlug}-${i}.xml</loc>\n`
      xml += `    <lastmod>2026-03-01</lastmod>\n`
      xml += `  </sitemap>\n`
    }

    xml += `</sitemapindex>`

    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    })
  } catch (error) {
    console.error('API sitemap index error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}

async function handleSitemapPage(domain: string, sitemapSlug: string | null, page: number): Promise<NextResponse> {
  if (isNaN(page) || page < 1) {
    return new NextResponse('Numero de sitemap invalido', { status: 400 })
  }

  try {
    // Find project: by sitemap slug if provided, otherwise first match by domain
    let project: Record<string, unknown> | null = null
    if (sitemapSlug) {
      project = await findProjectBySitemapSlug(domain, sitemapSlug)
    } else {
      const allProjects = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        [Query.limit(100)]
      )
      project = (allProjects.documents.find(
        (p) => (p.domain as string).includes(domain) || domain.includes(p.domain as string)
      ) as Record<string, unknown>) ?? null
    }

    if (!project) {
      return new NextResponse('Proyecto no encontrado', { status: 404 })
    }

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

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

    for (const item of slugs) {
      const lastmod = item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
      xml += `  <url>\n`
      xml += `    <loc>${getPublicUrl(project, item.slug)}</loc>\n`
      xml += `    <lastmod>${lastmod}</lastmod>\n`
      xml += `    <changefreq>monthly</changefreq>\n`
      xml += `    <priority>0.8</priority>\n`
      xml += `  </url>\n`
    }

    xml += `</urlset>`

    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    })
  } catch (error) {
    console.error('API sitemap page error:', error)
    return new NextResponse('Error interno', { status: 500 })
  }
}
