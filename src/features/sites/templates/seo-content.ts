/**
 * SEO Content Generator
 * Generates varied paragraphs for each keyword to avoid thin content penalties.
 * Uses a deterministic hash of the slug to select template, ensuring consistency.
 */

interface ContentParams {
  keyword: string
  businessName: string
  niche: string
  location: string
  businessDescription?: string
  differentiators?: string
}

function getDiff(p: ContentParams): string {
  if (!p.differentiators) return ''
  const items = p.differentiators.split(',').map(d => d.trim()).filter(Boolean)
  if (items.length === 0) return ''
  const idx = hashSlug(p.keyword) % items.length
  return items[idx]
}

const templates: Array<(p: ContentParams) => string> = [
  (p) => {
    const diff = getDiff(p)
    const diffLine = diff ? ` Nos distingue: ${diff}.` : ''
    return `¿Buscas ${p.keyword}? En ${p.businessName} somos especialistas en ${p.niche} con años de experiencia brindando servicio de calidad.${diffLine} Contamos con los mejores profesionales${p.location ? ` en ${p.location}` : ''} listos para atenderte de manera inmediata. ${p.businessDescription ? p.businessDescription.slice(0, 200) + ' ' : ''}No busques más, contacta ahora por WhatsApp y recibe atención personalizada. ${p.businessName} — tu mejor opción en ${p.niche}.`
  },

  (p) => {
    const diff = getDiff(p)
    const diffLine = diff ? ` ${diff} es lo que nos hace diferentes.` : ''
    return `Si necesitas ${p.keyword}, has llegado al lugar indicado. ${p.businessName} ofrece soluciones profesionales en ${p.niche}${p.location ? ` para toda la zona de ${p.location}` : ''}.${diffLine} Nuestro equipo de expertos está disponible para brindarte la mejor atención y resultados garantizados. ${p.businessDescription ? p.businessDescription.slice(0, 200) + ' ' : ''}Llámanos o escríbenos por WhatsApp para una cotización sin compromiso.`
  },

  (p) => {
    const diff = getDiff(p)
    const diffLine = diff ? ` Nuestro diferencial: ${diff}.` : ''
    return `${p.businessName} es líder en ${p.niche}${p.location ? ` en ${p.location}` : ''} y te ofrece el mejor servicio de ${p.keyword}. Con un equipo altamente capacitado y años de trayectoria, garantizamos resultados excepcionales.${diffLine} ${p.businessDescription ? p.businessDescription.slice(0, 200) + ' ' : ''}Contáctanos hoy mismo y descubre por qué somos la primera opción.`
  },

  (p) => {
    const diff = getDiff(p)
    const diffLine = diff ? ` Contamos con ${diff}.` : ''
    return `¿Necesitas ${p.keyword}? No pierdas más tiempo buscando. En ${p.businessName} nos especializamos en ${p.niche} y ofrecemos atención inmediata${p.location ? ` en ${p.location} y zonas cercanas` : ''}.${diffLine} Trabajamos con los más altos estándares de calidad para asegurar tu completa satisfacción. Solicita tu presupuesto gratuito ahora mismo a través de WhatsApp o llamada telefónica.`
  },

  (p) => {
    const diff = getDiff(p)
    const diffLine = diff ? ` Lo que nos distingue: ${diff}.` : ''
    return `Encuentra el mejor servicio de ${p.keyword} con ${p.businessName}. Somos una empresa consolidada en el sector de ${p.niche}${p.location ? `, operando en ${p.location}` : ''} con presencia en múltiples zonas.${diffLine} ${p.businessDescription ? p.businessDescription.slice(0, 200) + ' ' : ''}Cientos de reseñas positivas nos avalan como la mejor elección del mercado.`
  },

  (p) => {
    const diff = getDiff(p)
    const diffLine = diff ? ` Destacamos por ${diff}.` : ''
    return `${p.keyword} — servicio profesional por ${p.businessName}. Nuestra experiencia en ${p.niche} nos permite ofrecer soluciones a medida${p.location ? ` para clientes en ${p.location}` : ''} con la mejor relación calidad-precio.${diffLine} Desde consulta inicial hasta entrega final, te acompañamos en cada paso del proceso. Agenda tu cita hoy y experimenta la diferencia de trabajar con verdaderos profesionales.`
  },
]

function hashSlug(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

export function extractLocation(keyword: string): string {
  // Extract location from keyword: everything after " en " (last occurrence)
  const parts = keyword.split(' en ')
  if (parts.length > 1) {
    return parts[parts.length - 1].trim()
  }
  return ''
}

export function generateSeoContent(slug: string, params: ContentParams): string {
  const index = hashSlug(slug) % templates.length
  return templates[index](params)
}

export function generateH2Variation(keyword: string, businessName: string): string {
  const variations = [
    `Servicio profesional de ${keyword}`,
    `${keyword} — Calidad y confianza`,
    `Expertos en ${keyword} — ${businessName}`,
    `Tu mejor opción para ${keyword}`,
    `${keyword} con garantía de satisfacción`,
    `${businessName} — Especialistas en ${keyword}`,
  ]
  let hash = 0
  for (let i = 0; i < keyword.length; i++) {
    hash = ((hash << 5) - hash) + keyword.charCodeAt(i)
    hash = hash & hash
  }
  return variations[Math.abs(hash) % variations.length]
}
