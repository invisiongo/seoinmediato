/**
 * Professional Landing Page HTML Generator v2
 * Inspired by Mario Galarza's Lovable-built landings + Invision Go look & feel.
 *
 * Key SEO principles:
 * - Keyword ONLY in H1, title, meta description, and 1-2 natural mentions
 * - NO keyword stuffing — generic professional content
 * - Rich heading hierarchy: H1 > H2 > H3
 * - Proper schema markup (added in route, not here)
 * - Fast, lightweight, mobile-first
 * - Dynamic content per service category (40 variations)
 */

import { getServiceContent } from './service-content'

function escapeHtml(str: string | undefined | null): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface LandingDataFromDb {
  businessDescription?: string
  services: string
  testimonials: string
  stats: string
  socialProofMessages: string
  ctaWhatsappText: string
  ctaCallText: string
  colorScheme: string
  logoUrl: string
  backgroundImageUrl: string
  videoUrl?: string
  faqs?: string
  galleryTitle?: string
  gallerySubtitle?: string
  photo1?: string; photo1Title?: string; photo1Custom?: string; photo1Caption?: string
  photo2?: string; photo2Title?: string; photo2Custom?: string; photo2Caption?: string
  photo3?: string; photo3Title?: string; photo3Custom?: string; photo3Caption?: string
  photo4?: string; photo4Title?: string; photo4Custom?: string; photo4Caption?: string
  photo5?: string; photo5Title?: string; photo5Custom?: string; photo5Caption?: string
  photo6?: string; photo6Title?: string; photo6Custom?: string; photo6Caption?: string
  facebookUrl?: string
  instagramUrl?: string
  googleMapsUrl?: string
}

function extractYouTubeId(input: string): string | null {
  const m = input.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface LandingParams {
  keyword: string
  businessName: string
  businessPhone: string
  businessEmail: string
  niche: string
  content: string
  h2: string
  location: string
  landingData?: LandingDataFromDb
  mainSiteUrl?: string
}

// Names for social proof — B2B oriented
const NAMES = [
  'Roberto M.', 'Patricia L.', 'Carlos V.', 'Gabriela T.', 'Fernando R.',
  'Ana María S.', 'Luis D.', 'Daniela P.', 'Andrés G.', 'Sofía H.',
  'Miguel Á.', 'Laura C.', 'Diego N.', 'Mariana F.', 'Jorge E.',
]

/** Deterministic number from string */
function hashToRange(str: string, min: number, max: number): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return min + (Math.abs(hash) % (max - min + 1))
}

interface Theme {
  bg: string          // page background
  bgCard: string      // card/panel background
  bgCardHover: string
  border: string      // card borders
  borderAccent: string
  navBg: string
  text: string        // body text
  textMuted: string   // secondary text
  textHead: string    // headings
  accent: string      // primary accent color (hex)
  accent2: string     // secondary accent (hex)
  accentGrad: string  // CSS gradient for accents
  accentGradText: string // gradient for text
  btnPrimary: string  // primary button background
  btnSecondary: string
  badge: string       // pill/badge background
  badgeText: string
  starColor: string
  footerBg: string
}

const THEMES: Record<string, Theme> = {
  // OSCUROS
  // 1. Dark Pro — noche con acentos morado/rosa
  'dark': {
    bg: '#060129', bgCard: 'rgba(15,13,40,0.6)', bgCardHover: 'rgba(110,0,255,0.15)',
    border: '#312c52', borderAccent: '#6e00ff', navBg: 'rgba(6,1,41,0.92)',
    text: '#c8c9e3', textMuted: '#8e90b3', textHead: '#ffffff',
    accent: '#ff0a78', accent2: '#6e00ff', accentGrad: 'linear-gradient(135deg,#ff0a78,#6e00ff)',
    accentGradText: 'linear-gradient(135deg,#fff 0%,#c8c9e3 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(110,0,255,0.25)',
    badge: 'rgba(255,10,120,0.12)', badgeText: '#ff0a78',
    starColor: '#ff0a78', footerBg: 'rgba(6,1,41,0.95)',
  },
  // 2. Dark Navy — azul marino elegante
  'dark-navy': {
    bg: '#0a0f1e', bgCard: 'rgba(16,24,48,0.7)', bgCardHover: 'rgba(59,130,246,0.12)',
    border: '#1e2d4a', borderAccent: '#3b82f6', navBg: 'rgba(10,15,30,0.95)',
    text: '#cbd5e1', textMuted: '#64748b', textHead: '#f1f5f9',
    accent: '#3b82f6', accent2: '#60a5fa', accentGrad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
    accentGradText: 'linear-gradient(135deg,#f1f5f9 0%,#cbd5e1 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(59,130,246,0.18)',
    badge: 'rgba(59,130,246,0.1)', badgeText: '#60a5fa',
    starColor: '#f59e0b', footerBg: 'rgba(10,15,30,0.98)',
  },

  // CLAROS / MINIMALISTAS
  // 3. Clean White — blanco puro, acento azul corporativo
  'light': {
    bg: '#ffffff', bgCard: '#f8fafc', bgCardHover: 'rgba(37,99,235,0.04)',
    border: '#e2e8f0', borderAccent: '#2563eb', navBg: 'rgba(255,255,255,0.97)',
    text: '#374151', textMuted: '#9ca3af', textHead: '#111827',
    accent: '#2563eb', accent2: '#3b82f6', accentGrad: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
    accentGradText: 'linear-gradient(135deg,#111827 0%,#1d4ed8 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(37,99,235,0.08)',
    badge: 'rgba(37,99,235,0.07)', badgeText: '#2563eb',
    starColor: '#f59e0b', footerBg: '#1e293b',
  },
  // 4. Soft Gray — gris claro, minimalista total, acento negro
  'gray': {
    bg: '#f4f4f5', bgCard: '#ffffff', bgCardHover: 'rgba(0,0,0,0.03)',
    border: '#e4e4e7', borderAccent: '#18181b', navBg: 'rgba(255,255,255,0.97)',
    text: '#3f3f46', textMuted: '#a1a1aa', textHead: '#09090b',
    accent: '#18181b', accent2: '#3f3f46', accentGrad: 'linear-gradient(135deg,#09090b,#3f3f46)',
    accentGradText: 'linear-gradient(135deg,#09090b 0%,#3f3f46 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(0,0,0,0.06)',
    badge: 'rgba(0,0,0,0.05)', badgeText: '#18181b',
    starColor: '#f59e0b', footerBg: '#18181b',
  },
  // 5. Warm Cream — crema / beige, acento terracota (ideal restaurantes, spas, boutiques)
  'cream': {
    bg: '#faf7f2', bgCard: '#ffffff', bgCardHover: 'rgba(180,83,9,0.04)',
    border: '#e8e0d0', borderAccent: '#b45309', navBg: 'rgba(250,247,242,0.97)',
    text: '#44403c', textMuted: '#a8a29e', textHead: '#1c1917',
    accent: '#b45309', accent2: '#d97706', accentGrad: 'linear-gradient(135deg,#92400e,#b45309)',
    accentGradText: 'linear-gradient(135deg,#1c1917 0%,#44403c 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(180,83,9,0.08)',
    badge: 'rgba(180,83,9,0.07)', badgeText: '#b45309',
    starColor: '#d97706', footerBg: '#1c1917',
  },
  // 6. Fresh Green — blanco con verde fresco (salud, nutrición, bienestar)
  'green': {
    bg: '#f0fdf4', bgCard: '#ffffff', bgCardHover: 'rgba(22,163,74,0.04)',
    border: '#dcfce7', borderAccent: '#16a34a', navBg: 'rgba(240,253,244,0.97)',
    text: '#374151', textMuted: '#9ca3af', textHead: '#14532d',
    accent: '#16a34a', accent2: '#22c55e', accentGrad: 'linear-gradient(135deg,#15803d,#16a34a)',
    accentGradText: 'linear-gradient(135deg,#14532d 0%,#166534 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(22,163,74,0.08)',
    badge: 'rgba(22,163,74,0.08)', badgeText: '#16a34a',
    starColor: '#16a34a', footerBg: '#14532d',
  },
  // 7. Corporate Blue — blanco con azul corporativo (B2B, finanzas, legal)
  'blue': {
    bg: '#f0f4ff', bgCard: '#ffffff', bgCardHover: 'rgba(37,99,235,0.04)',
    border: '#dbeafe', borderAccent: '#1d4ed8', navBg: 'rgba(255,255,255,0.97)',
    text: '#374151', textMuted: '#6b7280', textHead: '#1e3a8a',
    accent: '#1d4ed8', accent2: '#2563eb', accentGrad: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)',
    accentGradText: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(29,78,216,0.08)',
    badge: 'rgba(29,78,216,0.07)', badgeText: '#1d4ed8',
    starColor: '#f59e0b', footerBg: '#1e3a8a',
  },

  // OSCUROS ADICIONALES
  // 8. Midnight Gold — lujo/premium
  'midnight-gold': {
    bg: '#0a0800', bgCard: 'rgba(30,24,4,0.7)', bgCardHover: 'rgba(212,175,55,0.12)',
    border: '#2e2608', borderAccent: '#d4af37', navBg: 'rgba(10,8,0,0.95)',
    text: '#d4c89a', textMuted: '#8a7e5a', textHead: '#ffffff',
    accent: '#d4af37', accent2: '#f5d76e', accentGrad: 'linear-gradient(135deg,#d4af37,#f5d76e)',
    accentGradText: 'linear-gradient(135deg,#fff 0%,#d4c89a 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(212,175,55,0.2)',
    badge: 'rgba(212,175,55,0.12)', badgeText: '#d4af37',
    starColor: '#d4af37', footerBg: 'rgba(10,8,0,0.98)',
  },
  // 9. Crimson — energía/urgencia/fitness
  'crimson': {
    bg: '#0d0004', bgCard: 'rgba(30,2,8,0.65)', bgCardHover: 'rgba(220,38,38,0.15)',
    border: '#2a0008', borderAccent: '#dc2626', navBg: 'rgba(13,0,4,0.95)',
    text: '#fca5a5', textMuted: '#9f5858', textHead: '#ffffff',
    accent: '#dc2626', accent2: '#ef4444', accentGrad: 'linear-gradient(135deg,#dc2626,#ef4444)',
    accentGradText: 'linear-gradient(135deg,#fff 0%,#fca5a5 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(220,38,38,0.22)',
    badge: 'rgba(220,38,38,0.12)', badgeText: '#ef4444',
    starColor: '#ef4444', footerBg: 'rgba(13,0,4,0.98)',
  },
  // 10. Sunset Orange — creativo/inmobiliaria/gastronomía
  'orange': {
    bg: '#0c0600', bgCard: 'rgba(28,14,2,0.65)', bgCardHover: 'rgba(249,115,22,0.14)',
    border: '#2a1400', borderAccent: '#f97316', navBg: 'rgba(12,6,0,0.95)',
    text: '#fed7aa', textMuted: '#9a6a40', textHead: '#ffffff',
    accent: '#f97316', accent2: '#fb923c', accentGrad: 'linear-gradient(135deg,#f97316,#fbbf24)',
    accentGradText: 'linear-gradient(135deg,#fff 0%,#fed7aa 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(249,115,22,0.2)',
    badge: 'rgba(249,115,22,0.12)', badgeText: '#fb923c',
    starColor: '#f97316', footerBg: 'rgba(12,6,0,0.98)',
  },
  // 11. Royal Purple — belleza/moda/coaching
  'purple': {
    bg: '#080010', bgCard: 'rgba(20,4,40,0.65)', bgCardHover: 'rgba(168,85,247,0.14)',
    border: '#1e0840', borderAccent: '#a855f7', navBg: 'rgba(8,0,16,0.95)',
    text: '#e9d5ff', textMuted: '#8b5abf', textHead: '#ffffff',
    accent: '#a855f7', accent2: '#c084fc', accentGrad: 'linear-gradient(135deg,#a855f7,#ec4899)',
    accentGradText: 'linear-gradient(135deg,#fff 0%,#e9d5ff 100%)',
    btnPrimary: '#25d366', btnSecondary: 'rgba(168,85,247,0.2)',
    badge: 'rgba(168,85,247,0.1)', badgeText: '#c084fc',
    starColor: '#a855f7', footerBg: 'rgba(8,0,16,0.98)',
  },
}

export function generateNeuroLanding(params: LandingParams): string {
  const {
    keyword, businessName, businessPhone, businessEmail,
    niche, location,
  } = params

  const t: Theme = THEMES[params.landingData?.colorScheme || 'dark'] ?? THEMES['dark']

  const phone = businessPhone.replace(/[^0-9]/g, '')
  const waLink = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, estoy interesado en un servicio de ${keyword}`)}`
    : ''
  const telLink = phone ? `tel:+${phone}` : ''
  const mainSiteUrl = params.mainSiteUrl || '#'

  const ek = escapeHtml(keyword)
  const eb = escapeHtml(businessName)
  const en = escapeHtml(niche || keyword)
  const eEmail = escapeHtml(businessEmail)
  const eLoc = escapeHtml(location)

  // Parse data from Appwrite
  let services: Array<{ name: string; description: string }> = []
  let testimonials: Array<{ name: string; text: string; rating: number; role?: string }> = []
  let stats: Array<{ value: string; label: string }> = []
  let socialMessages: string[] = []
  let faqs: Array<{ question: string; answer: string }> = []
  const ctaWaText = params.landingData?.ctaWhatsappText || 'WhatsApp Directo'
  const ctaCallText = params.landingData?.ctaCallText || 'Llamar Ahora'
  const logoUrl = params.landingData?.logoUrl || ''

  if (params.landingData) {
    try {
      const s = JSON.parse(params.landingData.services)
      if (Array.isArray(s) && s.length > 0) {
        // Handle both formats: string[] or {name,description}[]
        services = s.map(item => typeof item === 'string'
          ? { name: item, description: '' }
          : { name: item.name || '', description: item.description || '' }
        )
      }
    } catch { /* default */ }
    try {
      const t = JSON.parse(params.landingData.testimonials)
      if (Array.isArray(t) && t.length > 0) {
        testimonials = t.map(item => ({
          name: item.name || '',
          text: item.text || '',
          rating: item.rating || 5,
          role: item.role || item.location || '',
        }))
      }
    } catch { /* default */ }
    try { const st = JSON.parse(params.landingData.stats); if (Array.isArray(st)) stats = st } catch { /* default */ }
    try { const sm = JSON.parse(params.landingData.socialProofMessages); if (Array.isArray(sm)) socialMessages = sm } catch { /* default */ }
    try { const fq = JSON.parse(params.landingData.faqs || '[]'); if (Array.isArray(fq)) faqs = fq } catch { /* default */ }
  }

  // Default stats if none configured
  if (stats.length === 0) {
    stats = [
      { value: '100%', label: 'Garantía de satisfacción' },
      { value: '24/7', label: 'Atención disponible' },
      { value: '★★★★★', label: 'Calificación de clientes' },
    ]
  }

  // Default testimonials if none configured
  if (testimonials.length === 0) {
    testimonials = [
      { name: 'Roberto M.', text: `${businessName} superó nuestras expectativas. Resultados visibles desde el primer mes.`, rating: 5, role: 'Cliente verificado' },
      { name: 'Patricia L.', text: 'Excelente servicio y atención personalizada. Totalmente recomendados.', rating: 5, role: 'Cliente verificado' },
      { name: 'Carlos V.', text: 'Profesionales de primer nivel. Cumplieron con todo lo prometido y más.', rating: 5, role: 'Cliente verificado' },
      { name: 'Gabriela T.', text: 'La mejor decisión que tomamos. El equipo es muy comprometido con los resultados.', rating: 5, role: 'Cliente verificado' },
    ]
  }

  // Default services if none configured — use niche-based generics
  if (services.length === 0) {
    const nicheLabel = niche || keyword || 'nuestros servicios'
    services = [
      { name: `${nicheLabel} profesional`, description: 'Servicio de alta calidad adaptado a tus necesidades específicas y objetivos de negocio.' },
      { name: 'Atención personalizada', description: 'Un equipo dedicado que entiende tu situación y trabaja para obtener los mejores resultados.' },
      { name: 'Resultados garantizados', description: 'Estrategias probadas y metodologías efectivas que generan resultados medibles y sostenibles.' },
      { name: 'Soporte continuo', description: 'Acompañamiento constante antes, durante y después del servicio para asegurar tu satisfacción.' },
    ]
  }

  // Social links (for footer + backlinks)
  const facebookUrl = params.landingData?.facebookUrl || ''
  const instagramUrl = params.landingData?.instagramUrl || ''
  const googleMapsUrl = params.landingData?.googleMapsUrl || ''

  const namesJson = JSON.stringify(NAMES)
  const socialMessagesJson = socialMessages.length > 0 ? JSON.stringify(socialMessages) : 'null'
  const viewerCount = hashToRange(keyword, 7, 14)
  // Use niche first for service content detection, fallback to keyword
  const serviceContent = getServiceContent(niche || keyword)

  // SVG icons
  const iconWhatsApp = `<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>`
  const iconPhone = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`
  const iconCheck = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25d366" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
  const iconArrow = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`

  return `<body style="margin:0;background:${t.bg};color:${t.text};font-family:'Segoe UI',system-ui,-apple-system,sans-serif;overflow-x:hidden">

<!-- Social Proof Popup -->
<div id="social-proof" style="position:fixed;bottom:20px;left:20px;background:${t.navBg};border:1px solid ${t.border};border-radius:12px;padding:12px 16px;max-width:340px;z-index:1000;opacity:0;transform:translateY(20px);transition:all .4s ease;box-shadow:0 8px 32px rgba(0,0,0,.5);display:flex;align-items:center;gap:10px;backdrop-filter:blur(10px)">
  <div style="width:36px;height:36px;border-radius:50%;background:${t.accentGrad};display:flex;align-items:center;justify-content:center;flex-shrink:0">
    ${iconCheck}
  </div>
  <div>
    <p id="sp-text" style="margin:0;font-size:13px;color:${t.text};line-height:1.4"></p>
    <p id="sp-time" style="margin:2px 0 0;font-size:11px;color:${t.textMuted}"></p>
  </div>
</div>

<!-- Floating WhatsApp -->
${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" id="wa-float" style="position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;z-index:1001;box-shadow:0 4px 20px rgba(37,211,102,.4);text-decoration:none;animation:pulse-green 2s infinite">
  <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
</a>` : ''}

<main>

  <!-- NAVBAR -->
  <nav style="position:sticky;top:0;z-index:100;background:${t.navBg};backdrop-filter:blur(12px);border-bottom:1px solid ${t.border};padding:12px 0">
    <div style="max-width:1100px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${eb}" style="height:32px;width:auto" loading="lazy">` : `<span style="font-size:18px;font-weight:700;color:${t.textHead}">${eb}</span>`}
      </div>
      <div style="display:flex;gap:20px;align-items:center;font-size:14px">
        <a href="#inicio" style="color:${t.text};text-decoration:none">Inicio</a>
        <a href="#servicios" style="color:${t.text};text-decoration:none">Servicios</a>
        <a href="#proceso" style="color:${t.text};text-decoration:none">Proceso</a>
        <a href="#testimonios" style="color:${t.text};text-decoration:none">Clientes</a>
        <a href="#contacto" style="color:${t.text};text-decoration:none">Contacto</a>
        ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" style="background:${t.accentGrad};color:#fff;padding:8px 20px;border-radius:50px;text-decoration:none;font-weight:600;font-size:13px">Cotización</a>` : ''}
      </div>
    </div>
  </nav>

  <!-- HERO -->
  <section id="inicio" style="max-width:1100px;margin:0 auto;padding:60px 20px 40px;text-align:center">
    <div style="display:inline-block;background:${t.badge};border:1px solid ${t.borderAccent};border-radius:50px;padding:6px 20px;margin-bottom:24px">
      <span style="font-size:13px;color:${t.badgeText};font-weight:600">${en}${eLoc ? ` · ${eLoc}` : ''}</span>
    </div>
    <h1 style="font-size:clamp(1.8rem,5vw,3rem);font-weight:800;line-height:1.15;margin:0 0 12px;background:${t.accentGradText};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${ek}</h1>
    <p style="font-size:20px;color:${t.accent};font-weight:600;margin:0 0 16px">${escapeHtml(serviceContent.heroSubtitle)}</p>
    <p style="font-size:16px;color:${t.textMuted};max-width:640px;margin:0 auto 32px;line-height:1.7">${escapeHtml(params.landingData?.businessDescription?.split('\n')[0] || serviceContent.description)}</p>

    ${(() => {
      const vid = params.landingData?.videoUrl ? extractYouTubeId(params.landingData.videoUrl) : null
      if (!vid) return ''
      return `<div style="max-width:780px;margin:0 auto 40px;position:relative;width:100%;padding-bottom:min(56.25%, calc(780px * 0.5625));border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.35)">
      <iframe src="https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1" title="${escapeHtml(businessName)}" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%" loading="lazy"></iframe>
    </div>`
    })()}

    <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:32px">
      ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;background:#25d366;color:#fff;font-size:16px;font-weight:700;padding:16px 32px;border-radius:50px;text-decoration:none;animation:pulse-green 2s infinite">${iconWhatsApp} ${escapeHtml(ctaWaText)}</a>` : ''}
      <a href="${escapeHtml(mainSiteUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;background:${t.btnSecondary};border:1px solid ${t.borderAccent};color:${t.textHead};font-size:16px;font-weight:700;padding:16px 32px;border-radius:50px;text-decoration:none">${iconArrow} Ver nuestros servicios</a>
    </div>

    <div style="display:inline-flex;align-items:center;gap:8px;background:${t.badge};border:1px solid ${t.borderAccent};border-radius:50px;padding:8px 18px">
      <span style="width:8px;height:8px;border-radius:50%;background:${t.accent};animation:blink 1.5s infinite"></span>
      <span id="viewer-count" style="font-size:14px;color:${t.text}">🔥 <strong>${viewerCount} personas</strong> están mirando esta oferta ahora</span>
    </div>

    <div style="display:flex;justify-content:center;gap:40px;margin-top:40px;flex-wrap:wrap">
      ${stats.map(s => `<div style="text-align:center">
        <div style="font-size:2rem;font-weight:800;background:${t.accentGrad};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${escapeHtml(s.value)}</div>
        <div style="font-size:13px;color:${t.textMuted};margin-top:4px">${escapeHtml(s.label)}</div>
      </div>`).join('\n      ')}
    </div>
  </section>

  ${(() => {
    const ld = params.landingData
    const photos = [
      { url: ld?.photo1 || '', title: ld?.photo1Title || '', custom: ld?.photo1Custom || '', cap: ld?.photo1Caption || '' },
      { url: ld?.photo2 || '', title: ld?.photo2Title || '', custom: ld?.photo2Custom || '', cap: ld?.photo2Caption || '' },
      { url: ld?.photo3 || '', title: ld?.photo3Title || '', custom: ld?.photo3Custom || '', cap: ld?.photo3Caption || '' },
      { url: ld?.photo4 || '', title: ld?.photo4Title || '', custom: ld?.photo4Custom || '', cap: ld?.photo4Caption || '' },
      { url: ld?.photo5 || '', title: ld?.photo5Title || '', custom: ld?.photo5Custom || '', cap: ld?.photo5Caption || '' },
      { url: ld?.photo6 || '', title: ld?.photo6Title || '', custom: ld?.photo6Custom || '', cap: ld?.photo6Caption || '' },
    ].filter(p => p.url.trim())
    if (photos.length === 0) return ''

    const gTitle = ld?.galleryTitle || ''
    const gSubtitle = ld?.gallerySubtitle || ''
    const cols = photos.length === 1 ? '1fr'
      : photos.length === 2 ? 'repeat(2,1fr)'
      : photos.length <= 4 ? 'repeat(auto-fit,minmax(280px,1fr))'
      : 'repeat(auto-fit,minmax(240px,1fr))'
    const centerStyle = photos.length === 1 ? 'max-width:520px;margin:0 auto' : ''

    return `<!-- GALLERY -->
  <section style="max-width:1100px;margin:0 auto;padding:60px 20px">
    ${gTitle || gSubtitle ? `<div style="text-align:center;margin-bottom:32px">
      ${gTitle ? `<h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:${t.textHead};margin:0 0 10px">${escapeHtml(gTitle)}</h2>` : ''}
      ${gSubtitle ? `<p style="font-size:16px;color:${t.textMuted};max-width:640px;margin:0 auto">${escapeHtml(gSubtitle)}</p>` : ''}
    </div>` : ''}
    <div style="display:grid;grid-template-columns:${cols};gap:16px;${centerStyle}">
      ${photos.map(p => `<figure style="margin:0;border-radius:16px;overflow:hidden;background:${t.bgCard};border:1px solid ${t.border}">
        <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.title || p.cap || gTitle || businessName)}" loading="lazy" style="width:100%;height:220px;object-fit:cover;display:block">
        ${(p.title || p.custom || p.cap) ? `<div style="padding:12px 14px">
          ${p.title ? `<p style="font-size:14px;font-weight:700;color:${t.textHead};margin:0 0 4px">${escapeHtml(p.title)}</p>` : ''}
          ${p.custom ? `<p style="font-size:12px;color:${t.accent};margin:0 0 4px;font-weight:600">${escapeHtml(p.custom)}</p>` : ''}
          ${p.cap ? `<p style="font-size:13px;color:${t.textMuted};margin:0">${escapeHtml(p.cap)}</p>` : ''}
        </div>` : ''}
      </figure>`).join('')}
    </div>
  </section>`
  })()}

  <!-- SERVICES -->
  <section id="servicios" style="max-width:1100px;margin:0 auto;padding:60px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <span style="font-size:13px;color:${t.accent};font-weight:600;text-transform:uppercase;letter-spacing:2px">Soluciones profesionales</span>
      <h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:${t.textHead};margin:12px 0 0">Lo que hacemos por ti</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
      ${services.map((s, i) => `<div style="background:${t.bgCard};border:1px solid ${t.border};border-radius:16px;padding:28px;transition:border-color .3s,box-shadow .3s" onmouseover="this.style.borderColor='${t.borderAccent}';this.style.boxShadow='0 0 24px ${t.bgCardHover}'" onmouseout="this.style.borderColor='${t.border}';this.style.boxShadow='none'">
        <div style="width:44px;height:44px;border-radius:12px;background:${t.accentGrad};display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:20px">${['💡', '⚡', '🛡️', '🎯', '🚀', '📊', '🔧', '🤝'][i % 8]}</div>
        <h3 style="font-size:16px;font-weight:700;color:${t.textHead};margin:0 0 8px">${escapeHtml(s.name)}</h3>
        <p style="font-size:14px;color:${t.textMuted};margin:0;line-height:1.6">${escapeHtml(s.description)}</p>
      </div>`).join('\n      ')}
    </div>
  </section>

  <!-- PROCESS -->
  <section id="proceso" style="max-width:1100px;margin:0 auto;padding:60px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <span style="font-size:13px;color:${t.accent};font-weight:600;text-transform:uppercase;letter-spacing:2px">Nuestro proceso</span>
      <h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:${t.textHead};margin:12px 0 0">Cómo trabajamos contigo</h2>
      <p style="font-size:16px;color:${t.textMuted};max-width:600px;margin:12px auto 0">Un proceso claro, transparente y orientado a resultados.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px">
      ${[
        { step: '01', title: 'Diagnóstico', desc: 'Analizamos tu situación actual y definimos los objetivos a alcanzar.' },
        { step: '02', title: 'Estrategia', desc: 'Diseñamos un plan de acción personalizado con plazos y entregables claros.' },
        { step: '03', title: 'Ejecución', desc: 'Implementamos la solución con los más altos estándares de calidad.' },
        { step: '04', title: 'Resultados', desc: 'Medimos, optimizamos y aseguramos que los resultados superen expectativas.' },
      ].map(p => `<div style="background:${t.bgCard};border:1px solid ${t.border};border-radius:16px;padding:28px;text-align:center">
        <div style="font-size:2rem;font-weight:800;background:${t.accentGrad};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px">${p.step}</div>
        <h3 style="font-size:16px;font-weight:700;color:${t.textHead};margin:0 0 8px">${p.title}</h3>
        <p style="font-size:14px;color:${t.textMuted};margin:0;line-height:1.6">${p.desc}</p>
      </div>`).join('\n      ')}
    </div>
  </section>

  <!-- WHY US -->
  <section style="max-width:1100px;margin:0 auto;padding:60px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <span style="font-size:13px;color:${t.accent};font-weight:600;text-transform:uppercase;letter-spacing:2px">¿Por qué elegirnos?</span>
      <h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:${t.textHead};margin:12px 0 0">Lo que nos hace diferentes</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
      ${serviceContent.benefits.map((b, i) => `<div style="display:flex;gap:16px;align-items:flex-start;background:${t.bgCard};border:1px solid ${t.border};border-radius:16px;padding:24px">
        <div style="font-size:28px;flex-shrink:0">${['🏆', '⚡', '🎯', '🤝'][i % 4]}</div>
        <div>
          <h3 style="font-size:15px;font-weight:700;color:${t.textHead};margin:0 0 6px">${escapeHtml(b.title)}</h3>
          <p style="font-size:14px;color:${t.textMuted};margin:0;line-height:1.5">${escapeHtml(b.desc)}</p>
        </div>
      </div>`).join('\n      ')}
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section id="testimonios" style="max-width:1100px;margin:0 auto;padding:60px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <span style="font-size:13px;color:${t.accent};font-weight:600;text-transform:uppercase;letter-spacing:2px">Testimonios</span>
      <h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:${t.textHead};margin:12px 0 0">Lo que dicen nuestros clientes</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
      ${testimonials.map(tm => `<div style="background:${t.bgCard};border:1px solid ${t.border};border-radius:16px;padding:24px">
        <div style="margin-bottom:12px;color:${t.starColor}">${'★'.repeat(Math.min(tm.rating || 5, 5))}</div>
        <p style="font-size:14px;color:${t.text};margin:0 0 16px;line-height:1.7;font-style:italic">"${escapeHtml(tm.text)}"</p>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:50%;background:${t.accentGrad};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px">${tm.name.charAt(0)}</div>
          <div>
            <p style="margin:0;font-size:14px;font-weight:600;color:${t.textHead}">${escapeHtml(tm.name)}</p>
            ${tm.role ? `<p style="margin:2px 0 0;font-size:12px;color:${t.textMuted}">${escapeHtml(tm.role)}</p>` : ''}
          </div>
        </div>
      </div>`).join('\n      ')}
    </div>
  </section>

  ${faqs.length > 0 ? `<!-- FAQ -->
  <section id="faq" style="max-width:800px;margin:0 auto;padding:60px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <span style="font-size:13px;color:${t.accent};font-weight:600;text-transform:uppercase;letter-spacing:2px">Preguntas frecuentes</span>
      <h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:700;color:${t.textHead};margin:12px 0 0">Lo que todos preguntan</h2>
    </div>
    <div style="space-y:12px">
      ${faqs.map((faq, i) => `<details style="background:${t.bgCard};border:1px solid ${t.border};border-radius:12px;margin-bottom:10px;overflow:hidden" ${i === 0 ? 'open' : ''}>
        <summary style="padding:18px 20px;cursor:pointer;font-size:15px;font-weight:600;color:${t.textHead};list-style:none;display:flex;justify-content:space-between;align-items:center">
          ${escapeHtml(faq.question)}
          <span style="font-size:20px;color:${t.accent};margin-left:12px;flex-shrink:0">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:14px;color:${t.textMuted};line-height:1.7">${escapeHtml(faq.answer)}</div>
      </details>`).join('')}
    </div>
  </section>` : ''}

  <!-- CTA FINAL -->
  <section id="contacto" style="max-width:800px;margin:0 auto;padding:60px 20px">
    <div style="background:${t.btnSecondary};border:1px solid ${t.borderAccent};border-radius:24px;padding:48px 32px;text-align:center">
      <h2 style="font-size:clamp(1.4rem,3vw,2rem);font-weight:800;color:${t.textHead};margin:0 0 12px">¿Listo para empezar?</h2>
      <p style="font-size:16px;color:${t.textMuted};margin:0 0 32px;max-width:500px;display:inline-block">Contáctanos hoy. Nuestro equipo está listo para atenderte y darte la mejor solución.</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:24px">
        ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;background:#25d366;color:#fff;font-size:16px;font-weight:700;padding:16px 32px;border-radius:50px;text-decoration:none;animation:pulse-green 2s infinite">${iconWhatsApp} Hablar por WhatsApp</a>` : ''}
        <a href="${escapeHtml(mainSiteUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:10px;background:${t.btnSecondary};border:1px solid ${t.borderAccent};color:${t.textHead};font-size:16px;font-weight:700;padding:16px 32px;border-radius:50px;text-decoration:none">${iconArrow} Ver nuestros servicios</a>
      </div>
      ${eEmail ? `<p style="font-size:13px;color:${t.textMuted}">Email: <a href="mailto:${eEmail}" style="color:${t.accent};text-decoration:none">${eEmail}</a></p>` : ''}
    </div>
  </section>

  <!-- BACKLINK -->
  <section style="max-width:800px;margin:0 auto;padding:20px 20px 40px;text-align:center">
    <a href="${escapeHtml(mainSiteUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;color:${t.textMuted};text-decoration:none;font-size:14px;padding:12px 24px;border:1px solid ${t.border};border-radius:50px;transition:border-color .3s" onmouseover="this.style.borderColor='${t.borderAccent}'" onmouseout="this.style.borderColor='${t.border}'">
      Conoce todos nuestros servicios ${iconArrow}
    </a>
  </section>

  <!-- FOOTER -->
  <footer style="background:${t.footerBg};border-top:1px solid ${t.border};padding:40px 20px">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px">
      <div>
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${eb}" style="height:28px;margin-bottom:12px" loading="lazy">` : `<p style="font-size:18px;font-weight:700;color:${t.textHead};margin:0 0 12px">${eb}</p>`}
        <p style="font-size:13px;color:${t.textMuted};line-height:1.6;margin:0">${escapeHtml(niche || businessName)} — Servicio profesional con garantía de satisfacción para cada cliente.</p>
      </div>
      <div>
        <h4 style="font-size:14px;font-weight:700;color:${t.textHead};margin:0 0 12px">Contacto</h4>
        ${waLink ? `<p style="font-size:13px;color:${t.textMuted};margin:0 0 8px"><a href="${waLink}" target="_blank" rel="noopener" style="color:${t.textMuted};text-decoration:none">💬 WhatsApp Directo</a></p>` : ''}
        ${eEmail ? `<p style="font-size:13px;color:${t.textMuted};margin:0 0 8px"><a href="mailto:${eEmail}" style="color:${t.textMuted};text-decoration:none">✉️ ${eEmail}</a></p>` : ''}
        ${facebookUrl ? `<p style="font-size:13px;margin:0 0 8px"><a href="${escapeHtml(facebookUrl)}" target="_blank" rel="noopener nofollow" style="color:${t.textMuted};text-decoration:none">📘 Facebook</a></p>` : ''}
        ${instagramUrl ? `<p style="font-size:13px;margin:0 0 8px"><a href="${escapeHtml(instagramUrl)}" target="_blank" rel="noopener nofollow" style="color:${t.textMuted};text-decoration:none">📸 Instagram</a></p>` : ''}
        ${googleMapsUrl ? `<p style="font-size:13px;margin:0 0 8px"><a href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener nofollow" style="color:${t.textMuted};text-decoration:none">📍 Google Maps</a></p>` : ''}
      </div>
      <div>
        <h4 style="font-size:14px;font-weight:700;color:${t.textHead};margin:0 0 12px">Navegación</h4>
        <p style="margin:0 0 6px"><a href="#inicio" style="font-size:13px;color:${t.textMuted};text-decoration:none">Inicio</a></p>
        <p style="margin:0 0 6px"><a href="#servicios" style="font-size:13px;color:${t.textMuted};text-decoration:none">Servicios</a></p>
        <p style="margin:0 0 6px"><a href="#proceso" style="font-size:13px;color:${t.textMuted};text-decoration:none">Proceso</a></p>
        <p style="margin:0 0 6px"><a href="#testimonios" style="font-size:13px;color:${t.textMuted};text-decoration:none">Clientes</a></p>
        <p style="margin:0"><a href="${escapeHtml(mainSiteUrl)}" target="_blank" rel="noopener" style="font-size:13px;color:${t.accent};text-decoration:none">Ver todos los servicios →</a></p>
      </div>
    </div>
    <div style="max-width:1100px;margin:32px auto 0;padding-top:20px;border-top:1px solid ${t.border};display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px">
      <p style="margin:0;font-size:12px;color:${t.textMuted}">© 2026 ${eb}. Todos los derechos reservados.</p>
      <div style="display:flex;gap:16px">
        <a href="#" style="font-size:12px;color:${t.textMuted};text-decoration:none">Política de Privacidad</a>
        <a href="#" style="font-size:12px;color:${t.textMuted};text-decoration:none">Términos y Condiciones</a>
      </div>
    </div>
  </footer>

</main>

<style>
html{scroll-behavior:smooth}
@keyframes pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,.5)}50%{box-shadow:0 0 0 14px rgba(37,211,102,0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
@media(max-width:768px){
  nav div:last-child a:not([style*="gradient"]){display:none}
  nav div:last-child{gap:10px}
  #wa-float{width:52px;height:52px;bottom:16px;right:16px}
  #wa-float svg{width:28px;height:28px}
}
</style>

<script>
(function(){
  var names=${namesJson};
  var customMsgs=${socialMessagesJson};
  var actions=["ha solicitado información","pidió una cotización","contactó por WhatsApp","solicitó una consulta","agendó una reunión"];
  var times=["hace 1 minuto","hace 2 minutos","hace 3 minutos","hace 5 minutos","hace pocos minutos"];
  var el=document.getElementById("social-proof");
  var txt=document.getElementById("sp-text");
  var tm=document.getElementById("sp-time");
  function show(){
    var t=times[Math.floor(Math.random()*times.length)];
    if(customMsgs&&customMsgs.length>0){
      txt.textContent=customMsgs[Math.floor(Math.random()*customMsgs.length)];
    }else{
      var n=names[Math.floor(Math.random()*names.length)];
      var a=actions[Math.floor(Math.random()*actions.length)];
      txt.textContent=n+" "+a;
    }
    tm.textContent=t;
    el.style.opacity="1";el.style.transform="translateY(0)";
    setTimeout(function(){el.style.opacity="0";el.style.transform="translateY(20px)"},5000);
  }
  setTimeout(show,10000);
  setInterval(show,Math.floor(Math.random()*15000)+20000);
})();
(function(){
  var vc=document.getElementById("viewer-count");
  if(!vc)return;
  var c=${viewerCount};
  setInterval(function(){
    c+=Math.floor(Math.random()*3)-1;
    if(c<7)c=7;if(c>16)c=16;
    vc.innerHTML="🔥 <strong>"+c+" personas</strong> están mirando esta oferta ahora";
  },Math.floor(Math.random()*3000)+3000);
})();
</script>
</body>`
}
