'use client'

import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { read, utils } from 'xlsx'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEFAULT_PREFIX_MODIFIERS, DEFAULT_SUFFIX_MODIFIERS } from '../types'
import type { LocationTemplate } from '@/features/locations/types'
import type { Project } from '@/features/projects/types'

interface Props {
  projects: Project[]
  templates: LocationTemplate[]
  onGenerate: (config: KeywordConfigState) => void
}

export interface KeywordConfigState {
  projectId: string
  services: string[]
  prefixes: string[]
  suffixes: string[]
  locations: string[]
  keywordLimit: number
}

function parseTextFile(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseXlsxKeywords(buffer: ArrayBuffer): string[] {
  const workbook = read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown as unknown[][]

  const keywords: string[] = []
  for (const row of rows) {
    const colA = row[0] != null ? String(row[0]).trim() : ''
    const colB = row[1] != null ? String(row[1]).trim() : ''

    // Skip category/subcategory rows (have value in column A like CAT, SUB, or header)
    if (colA.toUpperCase() === 'CAT' || colA.toUpperCase() === 'SUB') continue
    // Skip header row
    if (colB.toLowerCase() === 'palabra clave' || colB.toLowerCase() === 'keyword') continue

    if (colB) keywords.push(colB)
  }
  return keywords
}

function parseXlsxLocations(buffer: ArrayBuffer): string[] {
  const workbook = read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown as unknown[][]

  const locations: string[] = []
  for (const row of rows) {
    const val = row[0] != null ? String(row[0]).trim() : ''
    if (val && val.toLowerCase() !== 'ubicacion' && val.toLowerCase() !== 'location') {
      locations.push(val)
    }
  }
  return locations
}

async function handleFileImport(
  file: File,
  mode: 'services' | 'locations',
): Promise<string[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer()
    return mode === 'services' ? parseXlsxKeywords(buffer) : parseXlsxLocations(buffer)
  }

  // .txt or .csv
  const text = await file.text()
  return parseTextFile(text)
}

export function KeywordConfigForm({ projects, templates, onGenerate }: Props) {
  const [projectId, setProjectId] = useState('')
  const [servicesText, setServicesText] = useState('')
  const [locationsText, setLocationsText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [keywordLimit, setKeywordLimit] = useState(0)

  const [activePrefixes, setActivePrefixes] = useState<Set<string>>(
    new Set(DEFAULT_PREFIX_MODIFIERS)
  )
  const [activeSuffixes, setActiveSuffixes] = useState<Set<string>>(
    new Set(DEFAULT_SUFFIX_MODIFIERS)
  )
  const [customPrefix, setCustomPrefix] = useState('')
  const [customSuffix, setCustomSuffix] = useState('')

  const servicesFileRef = useRef<HTMLInputElement>(null)
  const locationsFileRef = useRef<HTMLInputElement>(null)

  const services = servicesText.split('\n').filter((s) => s.trim())
  const locations = locationsText.split('\n').filter((l) => l.trim())
  const prefixes = Array.from(activePrefixes)
  const suffixes = Array.from(activeSuffixes)

  // Real-time projection
  const projection =
    prefixes.length * services.length * suffixes.length * (locations.length + 1) +
    prefixes.length * services.length * locations.length

  const togglePrefix = (mod: string) => {
    setActivePrefixes((prev) => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
  }

  const toggleSuffix = (mod: string) => {
    setActiveSuffixes((prev) => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
  }

  const addCustomPrefix = () => {
    const trimmed = customPrefix.trim()
    if (trimmed && !activePrefixes.has(trimmed)) {
      setActivePrefixes((prev) => new Set(prev).add(trimmed))
      setCustomPrefix('')
    }
  }

  const addCustomSuffix = () => {
    const trimmed = customSuffix.trim()
    if (trimmed && !activeSuffixes.has(trimmed)) {
      setActiveSuffixes((prev) => new Set(prev).add(trimmed))
      setCustomSuffix('')
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find((t) => t.$id === templateId)
    if (template) {
      setLocationsText(template.locations)
    }
  }

  const handleGenerate = () => {
    onGenerate({ projectId, services, prefixes, suffixes, locations, keywordLimit })
  }

  const onServicesFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const lines = await handleFileImport(file, 'services')
      if (lines.length === 0) {
        toast.error('No se encontraron servicios en el archivo')
        return
      }
      setServicesText((prev) => {
        const existing = prev.trim()
        return existing ? existing + '\n' + lines.join('\n') : lines.join('\n')
      })
      toast.success(`${lines.length} servicios importados`)
    } catch {
      toast.error('Error al leer el archivo')
    }
    e.target.value = ''
  }

  const onLocationsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const lines = await handleFileImport(file, 'locations')
      if (lines.length === 0) {
        toast.error('No se encontraron ubicaciones en el archivo')
        return
      }
      setLocationsText((prev) => {
        const existing = prev.trim()
        return existing ? existing + '\n' + lines.join('\n') : lines.join('\n')
      })
      toast.success(`${lines.length} ubicaciones importadas`)
    } catch {
      toast.error('Error al leer el archivo')
    }
    e.target.value = ''
  }

  const allPrefixOptions = Array.from(
    new Set([...DEFAULT_PREFIX_MODIFIERS, ...activePrefixes])
  )
  const allSuffixOptions = Array.from(
    new Set([...DEFAULT_SUFFIX_MODIFIERS, ...activeSuffixes])
  )

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={servicesFileRef}
        type="file"
        accept=".txt,.csv,.xlsx,.xls"
        className="hidden"
        onChange={onServicesFileChange}
      />
      <input
        ref={locationsFileRef}
        type="file"
        accept=".txt,.csv,.xlsx,.xls"
        className="hidden"
        onChange={onLocationsFileChange}
      />

      {/* Project selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un proyecto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.$id} value={p.$id}>
                  {p.name} — {p.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Servicios / Productos</CardTitle>
            <div className="flex items-center gap-2">
              {servicesText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setServicesText('')}
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpiar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => servicesFileRef.current?.click()}
              >
                <Upload className="mr-1 h-3 w-3" />
                Importar archivo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
            placeholder={"Ej: Corte de cabello\nColoracion\nMasaje relajante\nLimpieza facial\nManicure"}
            rows={6}
          />
          <p className="mt-1 text-xs text-muted-foreground">{services.length} servicios</p>
        </CardContent>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ubicaciones</CardTitle>
            <div className="flex items-center gap-2">
              {locationsText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setLocationsText(''); setSelectedTemplate('') }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpiar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => locationsFileRef.current?.click()}
              >
                <Upload className="mr-1 h-3 w-3" />
                Importar archivo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Plantilla de ubicaciones guardada</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un template (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.$id} value={t.$id}>
                    {t.name} ({t.locations.split('\n').filter((l) => l.trim()).length} ubicaciones)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTemplate && (() => {
            const tpl = templates.find((t) => t.$id === selectedTemplate)
            if (!tpl) return null
            const count = tpl.locations.split('\n').filter((l) => l.trim()).length
            return (
              <Badge variant="secondary" className="text-xs">
                Template: {tpl.name} — {count} ubicaciones cargadas
              </Badge>
            )
          })()}
          <Textarea
            value={locationsText}
            onChange={(e) => setLocationsText(e.target.value)}
            placeholder={"Ej: Quito\nGuayaquil\nCuenca\nAmbato\nManta"}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            {locations.length} ubicaciones {selectedTemplate ? '(puedes editar manualmente)' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Prefix modifiers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Modificadores ANTES ({prefixes.length} activos)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActivePrefixes(new Set(allPrefixOptions))}
              >
                Seleccionar todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActivePrefixes(new Set())}
              >
                Deseleccionar todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {allPrefixOptions.map((mod) => (
              <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={activePrefixes.has(mod)}
                  onCheckedChange={() => togglePrefix(mod)}
                />
                {mod}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value)}
              placeholder="Agregar modificador custom"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomPrefix())}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addCustomPrefix}>
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suffix modifiers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Modificadores DESPUES ({suffixes.length} activos)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveSuffixes(new Set(allSuffixOptions))}
              >
                Seleccionar todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveSuffixes(new Set())}
              >
                Deseleccionar todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {allSuffixOptions.map((mod) => (
              <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={activeSuffixes.has(mod)}
                  onCheckedChange={() => toggleSuffix(mod)}
                />
                {mod}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={customSuffix}
              onChange={(e) => setCustomSuffix(e.target.value)}
              placeholder="Agregar modificador custom"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSuffix())}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addCustomSuffix}>
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projection + Generate */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">Proyeccion de terminos</p>
            <p className="text-3xl font-bold">
              {services.length > 0 && prefixes.length > 0 && suffixes.length > 0
                ? projection.toLocaleString()
                : '0'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <div className="flex items-center gap-2">
              <Label htmlFor="keywordLimit" className="text-sm whitespace-nowrap">Limite de keywords</Label>
              <input
                id="keywordLimit"
                type="number"
                min={0}
                step={1000}
                value={keywordLimit || ''}
                onChange={(e) => setKeywordLimit(e.target.value ? Math.max(0, parseInt(e.target.value)) : 0)}
                placeholder="Sin limite"
                className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            {keywordLimit > 0 && (
              <p className="text-xs text-muted-foreground">
                Se generaran max. {keywordLimit.toLocaleString()} keywords
              </p>
            )}
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!projectId || services.length === 0 || prefixes.length === 0}
            >
              Generar keywords
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
