import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { findProjectsByDomain } from '@/features/sites/services/projectLookup'
import { generateNeuroLanding } from '@/features/sites/templates/neuro-landing'
import { ensureProtocol } from '@/shared/lib/seo-urls'

interface RouteParams {
  params: Promise<{ domain: string }>
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
  const { domain: rawDomain } = await params
  const domain = decodeURIComponent(rawDomain)

  const matchingProjects = await findProjectsByDomain(domain)
  if (matchingProjects.length === 0) {
    return new NextResponse('Proyecto no encontrado', { status: 404 })
  }

  // Use parent project for the landing (or first if no parent)
  const parent = matchingProjects.find(p => !p.parentProjectId) || matchingProjects[0]
  const businessName = (parent.businessName as string) || (parent.name as string)
  const businessPhone = (parent.businessPhone as string) || ''
  const businessEmail = (parent.businessEmail as string) || ''
  const niche = (parent.niche as string) || ''

  // Fetch landing doc
  let landingDoc: Record<string, unknown> | null = null
  try {
    const landingResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      [Query.equal('projectId', parent.$id as string), Query.limit(1)]
    )
    if (landingResult.documents.length > 0) {
      landingDoc = landingResult.documents[0] as Record<string, unknown>
    }
  } catch {
    // Continue without landing data
  }

  const neuroHtml = generateNeuroLanding({
    keyword: businessName,
    businessName,
    businessPhone,
    businessEmail,
    niche,
    content: '',
    h2: '',
    location: '',
    mainSiteUrl: ensureProtocol((parent.redirectUrl as string) || domain),
    landingData: landingDoc ? {
      businessDescription: String(landingDoc.businessDescription || ''),
      videoUrl: String(landingDoc.videoUrl || ''),
      faqs: String(landingDoc.faqs || '[]'),
      galleryTitle: String(landingDoc.galleryTitle || ''),
      gallerySubtitle: String(landingDoc.gallerySubtitle || ''),
      photo1: String(landingDoc.photo1 || ''), photo1Title: String(landingDoc.photo1Title || ''), photo1Custom: String(landingDoc.photo1Custom || ''), photo1Caption: String(landingDoc.photo1Caption || ''),
      photo2: String(landingDoc.photo2 || ''), photo2Title: String(landingDoc.photo2Title || ''), photo2Custom: String(landingDoc.photo2Custom || ''), photo2Caption: String(landingDoc.photo2Caption || ''),
      photo3: String(landingDoc.photo3 || ''), photo3Title: String(landingDoc.photo3Title || ''), photo3Custom: String(landingDoc.photo3Custom || ''), photo3Caption: String(landingDoc.photo3Caption || ''),
      photo4: String(landingDoc.photo4 || ''), photo4Title: String(landingDoc.photo4Title || ''), photo4Custom: String(landingDoc.photo4Custom || ''), photo4Caption: String(landingDoc.photo4Caption || ''),
      photo5: String(landingDoc.photo5 || ''), photo5Title: String(landingDoc.photo5Title || ''), photo5Custom: String(landingDoc.photo5Custom || ''), photo5Caption: String(landingDoc.photo5Caption || ''),
      photo6: String(landingDoc.photo6 || ''), photo6Title: String(landingDoc.photo6Title || ''), photo6Custom: String(landingDoc.photo6Custom || ''), photo6Caption: String(landingDoc.photo6Caption || ''),
      services: String(landingDoc.services || '[]'),
      testimonials: String(landingDoc.testimonials || '[]'),
      stats: String(landingDoc.stats || '[]'),
      socialProofMessages: String(landingDoc.socialProofMessages || '[]'),
      ctaWhatsappText: String(landingDoc.ctaWhatsappText || 'WhatsApp ahora'),
      ctaCallText: String(landingDoc.ctaCallText || 'Llamar ahora'),
      colorScheme: String(landingDoc.colorScheme || 'dark'),
      logoUrl: String(landingDoc.logoUrl || ''),
      backgroundImageUrl: String(landingDoc.backgroundImageUrl || ''),
      facebookUrl: String(landingDoc.facebookUrl || ''),
      instagramUrl: String(landingDoc.instagramUrl || ''),
      googleMapsUrl: String(landingDoc.googleMapsUrl || ''),
    } : undefined,
  })

  const logoUrl = String(landingDoc?.logoUrl || '')
  const canonicalUrl = `${ensureProtocol(domain)}/`
  const title = `${businessName} | ${niche}`
  const metaDesc = `ᐅ ${businessName} ✅ Servicio Garantizado ✅ ${niche}`

  // Social profiles for schema
  const sameAs = [
    String(landingDoc?.facebookUrl || ''),
    String(landingDoc?.instagramUrl || ''),
    String(landingDoc?.googleMapsUrl || ''),
  ].filter(Boolean)

  const schemaLocalBusiness = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: businessName,
    ...(businessPhone && { telephone: businessPhone }),
    ...(businessEmail && { email: businessEmail }),
    description: niche,
    ...(sameAs.length > 0 && { sameAs }),
    ...(landingDoc && landingDoc.googleMapsUrl ? { hasMap: String(landingDoc.googleMapsUrl) } : {}),
  })

  let homeFaqs: Array<{ question: string; answer: string }> = []
  try {
    const faqRaw = String(landingDoc?.faqs || '[]')
    const parsed = JSON.parse(faqRaw)
    if (Array.isArray(parsed)) homeFaqs = parsed
  } catch { /* no faqs */ }

  const schemaFaq = homeFaqs.length > 0 ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: homeFaqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }) : null

  const seoTags = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(metaDesc)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
${logoUrl ? `<link rel="icon" href="${escapeHtml(logoUrl)}" type="image/png">` : ''}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
${logoUrl ? `<meta property="og:image" content="${escapeHtml(logoUrl)}">` : ''}
<meta name="robots" content="index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
<script type="application/ld+json">${schemaLocalBusiness}</script>
${schemaFaq ? `<script type="application/ld+json">${schemaFaq}</script>` : ''}`

  // If project has a custom HTML (e.g. from Lovable), inject SEO tags and serve it
  const customHtml = String(landingDoc?.customHtml || '')
  if (customHtml.trim()) {
    const injected = customHtml.replace(/<\/head>/i, `${seoTags}\n</head>`)
    return new NextResponse(injected, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
${seoTags}
</head>
${neuroHtml}
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
