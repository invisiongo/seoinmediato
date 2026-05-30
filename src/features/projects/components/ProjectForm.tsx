'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Project, ProjectFormData } from '../types'

const MX_STATES = ['CDMX', 'Jalisco', 'Nuevo León', 'Estado de México', 'Puebla', 'Guanajuato', 'Chihuahua', 'Veracruz', 'Michoacán', 'Yucatán']
const US_STATES = ['California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan']

const MX_HINT = /m[eé]xico|mx\b/i
const US_HINT = /\b(usa|us|united states|estados unidos)\b/i

function generateNameSuggestions(existingNames: string[]): string[] {
  if (existingNames.length === 0) return []

  const suggestions: string[] = []
  const usedSet = new Set(existingNames.map(n => n.toLowerCase()))

  for (const name of existingNames) {
    // 1) Numeric suffix: "Agencia SEO CDMX 1" → suggest 2, 3
    const numMatch = name.match(/^(.+?)\s+(\d+)$/)
    if (numMatch) {
      const base = numMatch[1]
      const num = parseInt(numMatch[2], 10)
      for (let i = num + 1; i <= num + 4; i++) {
        const s = `${base} ${i}`
        if (!usedSet.has(s.toLowerCase())) suggestions.push(s)
      }
      continue
    }

    // 2) Known region in name: swap for other regions in same list
    let matchedRegion: string | null = null
    let regionList: string[] = []

    for (const region of MX_STATES) {
      if (name.includes(region)) {
        matchedRegion = region
        regionList = MX_STATES
        break
      }
    }
    if (!matchedRegion) {
      for (const region of US_STATES) {
        if (name.includes(region)) {
          matchedRegion = region
          regionList = US_STATES
          break
        }
      }
    }

    if (matchedRegion) {
      const base = name.replace(matchedRegion, '').replace(/\s{2,}/g, ' ').trim()
      for (const region of regionList) {
        if (region === matchedRegion) continue
        const s = base ? `${base} ${region}` : region
        if (!usedSet.has(s.toLowerCase())) suggestions.push(s)
      }
      continue
    }

    // 3) Country hint: "Invision México" → append MX states
    if (MX_HINT.test(name)) {
      for (const region of MX_STATES) {
        const s = `${name} ${region}`
        if (!usedSet.has(s.toLowerCase())) suggestions.push(s)
      }
      continue
    }
    if (US_HINT.test(name)) {
      for (const region of US_STATES) {
        const s = `${name} ${region}`
        if (!usedSet.has(s.toLowerCase())) suggestions.push(s)
      }
      continue
    }

    // 4) No pattern: suggest numeric suffixes
    for (let i = 1; i <= 4; i++) {
      const s = `${name} ${i}`
      if (!usedSet.has(s.toLowerCase())) suggestions.push(s)
    }
  }

  // Deduplicate and limit to 4
  const unique: string[] = []
  const seen = new Set<string>()
  for (const s of suggestions) {
    const key = s.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(s)
    }
    if (unique.length >= 4) break
  }
  return unique
}

interface Props {
  project?: Project | null
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
}

export function ProjectForm({ project, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(project?.name ?? '')
  const [domain, setDomain] = useState(project?.domain ?? '')
  const [businessName, setBusinessName] = useState(project?.businessName ?? '')
  const [businessPhone, setBusinessPhone] = useState(project?.businessPhone ?? '')
  const [businessEmail, setBusinessEmail] = useState(project?.businessEmail ?? '')
  const [niche, setNiche] = useState(project?.niche ?? '')
  const [seoMode, setSeoMode] = useState(project?.seoMode ?? 'full_site')
  const [seoPathPrefix, setSeoPathPrefix] = useState(project?.seoPathPrefix ?? '')
  const [redirectUrl, setRedirectUrl] = useState(project?.redirectUrl ?? '')
  const [indexingRate, setIndexingRate] = useState(project?.indexingRate ?? 200)
  const [logoUrl, setLogoUrl] = useState('')
  const [differentiators, setDifferentiators] = useState('')
  const [contentTone, setContentTone] = useState('profesional')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useRef(async (currentDomain: string) => {
    if (!currentDomain || currentDomain.length < 5) {
      setNameSuggestions([])
      return
    }

    try {
      const res = await fetch(`/api/projects/by-domain?domain=${encodeURIComponent(currentDomain)}`)
      if (!res.ok) {
        console.error('by-domain API error:', res.status)
        setNameSuggestions([])
        return
      }
      const matching: { name: string; domain: string }[] = await res.json()
      if (matching.length > 0) {
        setNameSuggestions(generateNameSuggestions(matching.map(p => p.name)))
      } else {
        setNameSuggestions([])
      }
    } catch (err) {
      console.error('Failed to fetch projects for suggestions:', err)
      setNameSuggestions([])
    }
  })

  useEffect(() => {
    // Only suggest for new projects
    if (project) {
      setNameSuggestions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!domain || domain.length < 5) {
      setNameSuggestions([])
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions.current(domain)
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [domain, project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        name,
        domain,
        businessName,
        businessPhone,
        businessEmail,
        niche,
        seoMode,
        seoPathPrefix,
        redirectUrl: seoMode === 'subdomain_redirect' ? redirectUrl : '',
        indexingRate,
        logoUrl: logoUrl || undefined,
        differentiators: differentiators || undefined,
        contentTone: contentTone || undefined,
        facebookUrl: facebookUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        googleMapsUrl: googleMapsUrl || undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{project ? 'Editar proyecto' : 'Nuevo proyecto'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del proyecto *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi Proyecto SEO"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Dominio *</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="https://ejemplo.com"
                required
              />
            </div>
          </div>

          {nameSuggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Sugerencias basadas en tus proyectos existentes:
              </p>
              <div className="flex flex-wrap gap-2">
                {nameSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setName(s)
                      setTimeout(() => {
                        const input = document.getElementById('name') as HTMLInputElement
                        if (input) {
                          input.focus()
                          input.setSelectionRange(s.length, s.length)
                        }
                      }, 0)
                    }}
                    className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded-full border"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Haz clic en una sugerencia y edita el nombre a tu gusto
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre del negocio</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Mi Empresa S.A."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessPhone">Telefono</Label>
              <Input
                id="businessPhone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Email del negocio</Label>
              <Input
                id="businessEmail"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="info@ejemplo.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="niche">Nicho</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ej: Cafeterias, Abogados, Plomeros"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seoMode">Modo SEO</Label>
              <Select value={seoMode} onValueChange={setSeoMode}>
                <SelectTrigger id="seoMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_site">Sitio completo</SelectItem>
                  <SelectItem value="subdomain_redirect">Subdominio + Redirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seoPathPrefix">Prefijo de ruta SEO</Label>
            <Input
              id="seoPathPrefix"
              value={seoPathPrefix}
              onChange={(e) => setSeoPathPrefix(e.target.value.replace(/^\/|\/$/g, ''))}
              placeholder="Ej: servicios (para /servicios/{slug})"
            />
            <p className="text-xs text-muted-foreground">
              Dejar vacio si las URLs SEO van en la raiz del dominio. Ej: &quot;servicios&quot; genera dominio.com/servicios/slug/
            </p>
          </div>

          {seoMode === 'subdomain_redirect' && (
            <div className="space-y-2">
              <Label htmlFor="redirectUrl">URL de redireccion</Label>
              <Input
                id="redirectUrl"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://dominio-principal.com"
              />
            </div>
          )}

          <div className="space-y-2 sm:max-w-[200px]">
            <Label htmlFor="indexingRate">Tasa de indexacion (URLs/batch)</Label>
            <Input
              id="indexingRate"
              type="number"
              min={1}
              max={10000}
              value={indexingRate}
              onChange={(e) => setIndexingRate(Number(e.target.value))}
            />
          </div>

          {/* Onboarding: Branding y contenido */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium mb-3">Branding y contenido SEO</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Favicon / Logo (URL)</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://tudominio.com/favicon.png"
                />
                <p className="text-xs text-muted-foreground">
                  URL completa con https://. PNG cuadrado, min 48x48px, fondo NO transparente.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contentTone">Tono del contenido</Label>
                <Select value={contentTone} onValueChange={setContentTone}>
                  <SelectTrigger id="contentTone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesional">Profesional</SelectItem>
                    <SelectItem value="cercano">Cercano / Amigable</SelectItem>
                    <SelectItem value="premium">Premium / Exclusivo</SelectItem>
                    <SelectItem value="urgente">Urgente / Directo</SelectItem>
                    <SelectItem value="tecnico">Tecnico / Especializado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="differentiators">Diferenciadores del negocio</Label>
              <Input
                id="differentiators"
                value={differentiators}
                onChange={(e) => setDifferentiators(e.target.value)}
                placeholder="Ej: equipo certificado, atencion personalizada, garantia de satisfaccion, precios competitivos"
              />
              <p className="text-xs text-muted-foreground">
                Separados por coma. Se usan en los articulos SEO para hacer contenido unico por cliente.
              </p>
            </div>
          </div>

          {/* Onboarding: Redes sociales */}
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium mb-3">Redes sociales (para schema SEO)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="facebookUrl">Facebook</Label>
                <Input
                  id="facebookUrl"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://www.facebook.com/TuPagina"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram</Label>
                <Input
                  id="instagramUrl"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://www.instagram.com/tucuenta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="googleMapsUrl">Google Maps</Label>
                <Input
                  id="googleMapsUrl"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : project ? 'Actualizar' : 'Crear proyecto'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
