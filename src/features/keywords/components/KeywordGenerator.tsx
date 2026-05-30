'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KeywordConfigForm, type KeywordConfigState } from './KeywordConfigForm'
import { KeywordPreview } from './KeywordPreview'
import { KeywordImport } from './KeywordImport'
import {
  generateCombinations,
  saveKeywordsBatch,
  saveKeywordConfig,
  deleteKeywordsByProject,
  type GeneratedKeyword,
} from '../services/keywordService'
import { updateProjectKeywordCount } from '@/features/projects/services/projectService'
import * as projectService from '@/features/projects/services/projectService'
import * as locationService from '@/features/locations/services/locationService'
import type { Project } from '@/features/projects/types'
import type { LocationTemplate } from '@/features/locations/types'

export function KeywordGenerator() {
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<LocationTemplate[]>([])
  const [generated, setGenerated] = useState<GeneratedKeyword[]>([])
  const [currentConfig, setCurrentConfig] = useState<KeywordConfigState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<{ saved: number; total: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [p, t] = await Promise.all([
          projectService.listProjects(),
          locationService.listTemplates(),
        ])
        setProjects(p)
        setTemplates(t)
      } catch {
        toast.error('Error al cargar proyectos y templates')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleGenerate = (config: KeywordConfigState) => {
    if (!config.projectId) {
      toast.error('Selecciona un proyecto')
      return
    }
    if (config.services.length === 0) {
      toast.error('Agrega al menos un servicio/producto')
      return
    }
    if (config.prefixes.length === 0) {
      toast.error('Activa al menos un modificador ANTES')
      return
    }

    setCurrentConfig(config)
    const all = generateCombinations(
      config.services,
      config.prefixes,
      config.suffixes,
      config.locations
    )
    const result = config.keywordLimit > 0 ? all.slice(0, config.keywordLimit) : all
    setGenerated(result)
    const limitMsg = config.keywordLimit > 0 && result.length < all.length
      ? ` (limitado de ${all.length.toLocaleString()})`
      : ''
    toast.success(`${result.length.toLocaleString()} keywords generadas${limitMsg}`)
  }

  const handleSave = async () => {
    if (!currentConfig || generated.length === 0) return

    const project = projects.find((p) => p.$id === currentConfig.projectId)
    if (!project) {
      toast.error('Proyecto no encontrado. Recarga la página e intenta de nuevo.')
      return
    }

    setIsSaving(true)
    setSaveProgress({ saved: 0, total: generated.length })

    try {
      // Delete existing keywords for this project before saving new ones
      const existingCount = project.totalKeywords || 0
      if (existingCount > 0) {
        setSaveProgress({ saved: 0, total: generated.length })
        await deleteKeywordsByProject(currentConfig.projectId)
      }

      await saveKeywordsBatch(
        currentConfig.projectId,
        generated,
        (saved, total) => setSaveProgress({ saved, total })
      )

      await saveKeywordConfig(
        currentConfig.projectId,
        currentConfig.services,
        currentConfig.prefixes,
        currentConfig.suffixes,
        currentConfig.locations,
        generated.length
      )

      await updateProjectKeywordCount(
        currentConfig.projectId,
        generated.length
      )

      toast.success(
        `${generated.length.toLocaleString()} keywords guardadas en "${project.name}"`
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al guardar'
      toast.error(msg)
    } finally {
      setIsSaving(false)
      setSaveProgress(null)
    }
  }

  const currentProject = currentConfig
    ? projects.find((p) => p.$id === currentConfig.projectId)
    : null

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <Tabs defaultValue="generator" className="space-y-6">
      <TabsList>
        <TabsTrigger value="generator">Generador combinatorio</TabsTrigger>
        <TabsTrigger value="import">Importar lista</TabsTrigger>
      </TabsList>

      <TabsContent value="generator" className="space-y-6">
        <KeywordConfigForm
          projects={projects}
          templates={templates}
          onGenerate={handleGenerate}
        />

        {generated.length > 0 && (
          <KeywordPreview
            keywords={generated}
            domain={currentProject?.domain ?? ''}
            isSaving={isSaving}
            saveProgress={saveProgress}
            onSave={handleSave}
          />
        )}
      </TabsContent>

      <TabsContent value="import">
        <KeywordImport projects={projects} />
      </TabsContent>
    </Tabs>
  )
}
