'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  slugify,
  saveKeywordsBatch,
  deleteKeywordsByProject,
  type GeneratedKeyword,
} from '../services/keywordService'
import { updateProjectKeywordCount } from '@/features/projects/services/projectService'
import type { Project } from '@/features/projects/types'

interface Props {
  projects: Project[]
}

export function KeywordImport({ projects }: Props) {
  const [projectId, setProjectId] = useState('')
  const [keywordsText, setKeywordsText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState<{ saved: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const lines = keywordsText.split('\n').filter((l) => l.trim())

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      if (parsed.length === 0) {
        toast.error('No se encontraron keywords en el archivo')
        return
      }
      setKeywordsText((prev) => {
        const existing = prev.trim()
        return existing ? existing + '\n' + parsed.join('\n') : parsed.join('\n')
      })
      toast.success(`${parsed.length.toLocaleString()} keywords importadas del archivo`)
    } catch {
      toast.error('Error al leer el archivo')
    }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!projectId) {
      toast.error('Selecciona un proyecto')
      return
    }
    if (lines.length === 0) {
      toast.error('Pega o importa al menos una keyword')
      return
    }

    const project = projects.find((p) => p.$id === projectId)
    if (!project) return

    setIsSaving(true)
    setProgress({ saved: 0, total: lines.length })

    try {
      // Deduplicate and generate slugs
      const seen = new Set<string>()
      const keywords: GeneratedKeyword[] = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || seen.has(trimmed)) continue
        seen.add(trimmed)
        keywords.push({ keyword: trimmed, slug: slugify(trimmed) })
      }

      // Delete existing keywords
      const existingCount = project.totalKeywords || 0
      if (existingCount > 0) {
        toast.info('Eliminando keywords anteriores...')
        await deleteKeywordsByProject(projectId)
      }

      // Save in batches
      await saveKeywordsBatch(
        projectId,
        keywords,
        (saved, total) => setProgress({ saved, total })
      )

      // Update project count
      await updateProjectKeywordCount(projectId, keywords.length)

      toast.success(
        `${keywords.length.toLocaleString()} keywords importadas en "${project.name}"`
      )
      setKeywordsText('')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al importar'
      toast.error(msg)
    } finally {
      setIsSaving(false)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.csv"
        className="hidden"
        onChange={handleFileImport}
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

      {/* Keywords textarea */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Keywords (una por linea)</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1 h-3 w-3" />
              Importar .txt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder={"posicionamiento web en quito\nservicio de contabilidad en guayaquil\nclinica dental en cuenca"}
            rows={12}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {lines.length.toLocaleString()} keywords
          </p>
        </CardContent>
      </Card>

      {/* Import button + progress */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            {progress ? (
              <>
                <p className="text-sm text-muted-foreground">Importando...</p>
                <p className="text-3xl font-bold">
                  {progress.saved.toLocaleString()} / {progress.total.toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Keywords a importar</p>
                <p className="text-3xl font-bold">{lines.length.toLocaleString()}</p>
              </>
            )}
          </div>
          <Button
            size="lg"
            onClick={handleImport}
            disabled={!projectId || lines.length === 0 || isSaving}
          >
            {isSaving ? 'Importando...' : 'Importar keywords'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
