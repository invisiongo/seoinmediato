'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Key, Globe, Settings, ExternalLink, X,
  ChevronLeft, ChevronRight, Search, Play, Square, RotateCcw,
  AlertTriangle, CheckCircle2, Clock, Loader2, Sparkles, Save,
  Eye, RefreshCw, Layout, Upload, Trash2, Download, MapPin, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as projectService from '@/features/projects/services/projectService'
import * as keywordService from '@/features/keywords/services/keywordService'
import { projectNameToSlug } from '@/shared/lib/seo-urls'
import { ProjectWizard } from '@/features/projects/components/ProjectWizard'
import type { Project } from '@/features/projects/types'
import type { Keyword } from '@/features/keywords/types'

const KEYWORDS_PER_PAGE = 50

interface IndexingStatus {
  jobId?: string
  status: string
  totalUrls: number
  processedUrls: number
  successUrls: number
  failedUrls: number
  lastPosition: number
  startedAt?: string | null
  completedAt?: string | null
  errorLog: string
  remaining: number
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Keywords tab state
  const [kwPage, setKwPage] = useState(1)
  const [kwTotalPages, setKwTotalPages] = useState(1)
  const [kwTotal, setKwTotal] = useState(0)
  const [kwSearch, setKwSearch] = useState('')
  const [kwStatusFilter, setKwStatusFilter] = useState<string>('all')
  const [isLoadingKw, setIsLoadingKw] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ saved: number; total: number; elapsedMs: number } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const importAbortRef = useRef(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirmKw, setShowDeleteConfirmKw] = useState(false)

  // Keyword stats (from blocks - lightweight, no full data load)
  const [kwStats, setKwStats] = useState<{ total: number; pending: number; indexed: number; failed: number }>({
    total: 0, pending: 0, indexed: 0, failed: 0,
  })

  // Indexing state
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [editRate, setEditRate] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Landing tab state
  interface LandingData {
    $id?: string
    projectId: string
    businessDescription: string
    differentiators: string
    contentTone: string
    services: string
    testimonials: string
    stats: string
    socialProofMessages: string
    ctaWhatsappText: string
    ctaCallText: string
    colorScheme: string
    logoUrl: string
    backgroundImageUrl: string
    facebookUrl: string
    instagramUrl: string
    googleMapsUrl: string
  }
  const [landingData, setLandingData] = useState<LandingData | null>(null)
  const [isLoadingLanding, setIsLoadingLanding] = useState(false)
  const [isGeneratingLanding, setIsGeneratingLanding] = useState(false)
  const [isSavingLanding, setIsSavingLanding] = useState(false)
  const [showDeleteLanding, setShowDeleteLanding] = useState(false)

  // Kill switch state
  const [showDeindexConfirm, setShowDeindexConfirm] = useState(false)
  const [isDeindexing, setIsDeindexing] = useState(false)
  const [showPauseConfirm, setShowPauseConfirm] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)

  // SEO Article state
  const [articleTemplate, setArticleTemplate] = useState('')
  const [articleWordCount, setArticleWordCount] = useState(0)
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false)
  const [isSavingArticle, setIsSavingArticle] = useState(false)

  // Multi-token state
  interface TokenInfo {
    $id: string
    tokenName: string
    serviceAccountEmail: string
    dailyQuota: number
    urlsSentToday: number
    isActive: boolean
  }
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [totalQuota, setTotalQuota] = useState(0)
  const [usedToday, setUsedToday] = useState(0)
  const [showAddToken, setShowAddToken] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenJson, setNewTokenJson] = useState('')
  const [isAddingToken, setIsAddingToken] = useState(false)

  // Indexing order state
  const [indexingOrder, setIndexingOrder] = useState<string>('sequential')

  // Verification state
  interface VerifyResult {
    slug: string
    keyword: string
    url: string
    indexed: boolean
    verdict: string
    lastCrawlTime: string | null
    coverageState: string | null
  }
  const [verifyResults, setVerifyResults] = useState<VerifyResult[]>([])
  const [verifyPercentage, setVerifyPercentage] = useState<number | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // Regions state (parent projects only)
  const [regions, setRegions] = useState<Project[]>([])
  const [newRegionName, setNewRegionName] = useState('')
  const [isCreatingRegion, setIsCreatingRegion] = useState(false)
  const isParentProject = regions.length > 0 || (!project?.parentProjectId && project !== null)
  const isRegion = !!project?.parentProjectId
  const hasRegions = regions.length > 0

  // Aggregated region stats (parent only)
  interface RegionKwStats { total: number; pending: number; indexed: number; failed: number }
  interface RegionIndexStatus { regionId: string; regionName: string; status: string; successUrls: number; failedUrls: number; totalUrls: number; remaining: number }
  const [regionKwStats, setRegionKwStats] = useState<Map<string, RegionKwStats>>(new Map())
  const [regionIndexStatuses, setRegionIndexStatuses] = useState<RegionIndexStatus[]>([])
  const [isStartingAll, setIsStartingAll] = useState(false)

  const fetchRegions = useCallback(async () => {
    try {
      const data = await projectService.listRegions(projectId)
      setRegions(data)
    } catch { /* ignore */ }
  }, [projectId])

  const fetchRegionAggregates = useCallback(async (regs: Project[]) => {
    if (regs.length === 0) return
    // Fetch keyword stats for each region in parallel
    const kwPromises = regs.map(async (r) => {
      try {
        const res = await fetch(`/api/projects/${r.$id}/keywords/stats`)
        if (res.ok) {
          const data = await res.json()
          return [r.$id, { total: data.total, pending: data.pending, indexed: data.indexed, failed: data.failed }] as [string, RegionKwStats]
        }
      } catch { /* ignore */ }
      return [r.$id, { total: 0, pending: 0, indexed: 0, failed: 0 }] as [string, RegionKwStats]
    })
    const kwResults = await Promise.all(kwPromises)
    setRegionKwStats(new Map(kwResults))

    // Fetch indexing status for each region in parallel
    const idxPromises = regs.map(async (r) => {
      try {
        const res = await fetch(`/api/indexing/status/${r.$id}`)
        if (res.ok) {
          const data = await res.json()
          return { regionId: r.$id, regionName: r.name, status: data.status, successUrls: data.successUrls || 0, failedUrls: data.failedUrls || 0, totalUrls: data.totalUrls || 0, remaining: data.remaining || 0 }
        }
      } catch { /* ignore */ }
      return { regionId: r.$id, regionName: r.name, status: 'no_job', successUrls: 0, failedUrls: 0, totalUrls: 0, remaining: 0 }
    })
    const idxResults = await Promise.all(idxPromises)
    setRegionIndexStatuses(idxResults)
  }, [])

  const fetchIndexingStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/indexing/status/${projectId}`)
      if (res.ok) {
        const data: IndexingStatus = await res.json()
        setIndexingStatus(data)
        return data
      }
    } catch {
      // Silently fail on polling
    }
    return null
  }, [projectId])

  const fetchKeywordStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/keywords/stats`)
      if (res.ok) {
        const data = await res.json()
        setKwStats({ total: data.total, pending: data.pending, indexed: data.indexed, failed: data.failed })
      }
    } catch { /* ignore */ }
  }, [projectId])

  const fetchKeywordsPage = useCallback(async (page: number, status: string, search: string) => {
    setIsLoadingKw(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(KEYWORDS_PER_PAGE), status, search })
      const res = await fetch(`/api/projects/${projectId}/keywords?${params}`)
      if (res.ok) {
        const data = await res.json()
        setKeywords(data.keywords || [])
        setKwTotal(data.total || 0)
        setKwTotalPages(data.totalPages || 1)
        setKwPage(data.page || 1)
      }
    } catch { /* ignore */ }
    setIsLoadingKw(false)
  }, [projectId])

  useEffect(() => {
    async function load() {
      try {
        const p = await projectService.getProject(projectId)
        setProject(p)
        setEditRate(String(p.indexingRate || 200))
      } catch {
        toast.error('Error al cargar el proyecto')
      } finally {
        setIsLoading(false)
      }
    }
    load()
    fetchIndexingStatus()
    fetchKeywordStats()
    fetchKeywordsPage(1, 'all', '')
    // Load article template
    fetch(`/api/projects/${projectId}/article`).then(r => r.json()).then(data => {
      if (data.template) {
        setArticleTemplate(data.template)
        setArticleWordCount(data.wordCount || 0)
      }
    }).catch(() => {})
    // Load tokens
    fetch(`/api/projects/${projectId}/tokens`).then(r => r.json()).then(data => {
      if (data.tokens) {
        setTokens(data.tokens)
        setTotalQuota(data.totalQuota || 0)
        setUsedToday(data.usedToday || 0)
      }
    }).catch(() => {})
    // Load regions
    fetchRegions()
  }, [projectId, fetchIndexingStatus, fetchKeywordStats, fetchKeywordsPage, fetchRegions])

  // Fetch aggregated stats when regions are loaded (parent only)
  useEffect(() => {
    if (regions.length > 0) fetchRegionAggregates(regions)
  }, [regions, fetchRegionAggregates])

  // Polling when indexing is running
  useEffect(() => {
    if (indexingStatus?.status === 'running') {
      pollingRef.current = setInterval(fetchIndexingStatus, 5000)
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [indexingStatus?.status, fetchIndexingStatus])

  // Debounced search for keywords
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleKwSearchChange = useCallback((value: string) => {
    setKwSearch(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      fetchKeywordsPage(1, kwStatusFilter, value)
    }, 400)
  }, [kwStatusFilter, fetchKeywordsPage])

  const handleKwStatusChange = useCallback((value: string) => {
    setKwStatusFilter(value)
    fetchKeywordsPage(1, value, kwSearch)
  }, [kwSearch, fetchKeywordsPage])

  // Fetch landing data on mount
  useEffect(() => {
    async function loadLanding() {
      setIsLoadingLanding(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/landing`)
        if (res.ok) {
          const data = await res.json()
          setLandingData(data)
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoadingLanding(false)
      }
    }
    loadLanding()
  }, [projectId])

  const handleGenerateLanding = async () => {
    setIsGeneratingLanding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-landing`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Error al generar landing')
        return
      }
      const doc = await res.json()
      setLandingData(doc)
      toast.success('Landing generada con IA exitosamente')
    } catch {
      toast.error('Error de conexion al generar landing')
    } finally {
      setIsGeneratingLanding(false)
    }
  }

  const handleSaveLanding = async () => {
    if (!landingData) return
    setIsSavingLanding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/landing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDescription: landingData.businessDescription,
          differentiators: landingData.differentiators,
          contentTone: landingData.contentTone,
          services: landingData.services,
          testimonials: landingData.testimonials,
          stats: landingData.stats,
          socialProofMessages: landingData.socialProofMessages,
          ctaWhatsappText: landingData.ctaWhatsappText,
          ctaCallText: landingData.ctaCallText,
          colorScheme: landingData.colorScheme,
          logoUrl: landingData.logoUrl,
          backgroundImageUrl: landingData.backgroundImageUrl,
          facebookUrl: landingData.facebookUrl,
          instagramUrl: landingData.instagramUrl,
          googleMapsUrl: landingData.googleMapsUrl,
        }),
      })
      if (!res.ok) {
        toast.error('Error al guardar landing')
        return
      }
      const doc = await res.json()
      setLandingData(doc)
      toast.success('Landing guardada exitosamente')
    } catch {
      toast.error('Error de conexion')
    } finally {
      setIsSavingLanding(false)
    }
  }

  const handleDeleteLanding = async () => {
    setShowDeleteLanding(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/landing`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setLandingData(null)
      toast.success('Landing eliminada')
    } catch {
      toast.error('Error al eliminar la landing')
    }
  }

  const updateLandingField = (field: keyof LandingData, value: string) => {
    setLandingData((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleImportKeywords = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !project) return
    e.target.value = ''

    setIsImporting(true)
    try {
      const text = await file.text()
      const ext = file.name.split('.').pop()?.toLowerCase()

      let lines: string[]
      if (ext === 'csv') {
        // CSV: take first column
        lines = text
          .split(/\r?\n/)
          .map((line) => {
            const col = line.split(',')[0]?.trim().replace(/^["']|["']$/g, '')
            return col || ''
          })
          .filter((l) => l && l.toLowerCase() !== 'keyword' && l.toLowerCase() !== 'palabra clave')
      } else {
        // TXT: one keyword per line
        lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      }

      if (lines.length === 0) {
        toast.error('No se encontraron keywords en el archivo')
        setIsImporting(false)
        return
      }

      // Deduplicate
      const seen = new Set<string>()
      const kwList = lines
        .map((kw) => ({ keyword: kw, slug: slugify(kw) }))
        .filter((k) => {
          if (seen.has(k.slug) || !k.slug) return false
          seen.add(k.slug)
          return true
        })

      setImportProgress({ saved: 0, total: kwList.length, elapsedMs: 0 })
      importAbortRef.current = false

      const saved = await keywordService.saveKeywordsBatch(
        projectId,
        kwList,
        (s, t, ms) => setImportProgress({ saved: s, total: t, elapsedMs: ms }),
        () => importAbortRef.current
      )

      // Update project keyword count
      await projectService.updateProjectKeywordCount(
        projectId,
        (project.totalKeywords || 0) + saved
      )

      // Reload keywords + stats
      setProject((prev) => prev ? { ...prev, totalKeywords: (prev.totalKeywords || 0) + saved } : prev)
      fetchKeywordStats()
      fetchKeywordsPage(1, kwStatusFilter, kwSearch)

      if (importAbortRef.current) {
        toast.info(`Importacion detenida. ${saved.toLocaleString()} keywords guardadas parcialmente.`)
      } else {
        toast.success(`${saved.toLocaleString()} keywords importadas exitosamente`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al importar'
      toast.error(msg)
    } finally {
      setIsImporting(false)
      setImportProgress(null)
      importAbortRef.current = false
    }
  }

  const handleDeleteAllKeywords = async () => {
    if (!project) return
    setIsDeleting(true)
    setShowDeleteConfirmKw(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/keywords`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar')
      setKeywords([])
      setKwStats({ total: 0, pending: 0, indexed: 0, failed: 0 })
      setKwTotal(0)
      setProject((prev) => prev ? { ...prev, totalKeywords: 0, totalIndexed: 0 } : prev)
      toast.success(`${data.deleted} keywords eliminadas`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al eliminar'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportTxt = () => {
    if (keywords.length === 0) return
    const kwList = keywords.map((k) => ({ keyword: k.keyword, slug: k.slug }))
    const content = keywordService.exportToTxt(kwList)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'keywords'}-keywords.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = () => {
    if (keywords.length === 0) return
    const kwList = keywords.map((k) => ({ keyword: k.keyword, slug: k.slug }))
    const content = keywordService.exportToCsv(kwList, project?.domain || '', project?.seoPathPrefix || '')
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'keywords'}-keywords.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Article handlers
  const handleGenerateArticle = async () => {
    setIsGeneratingArticle(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-article`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al generar articulo')
        return
      }
      // Reload article
      const artRes = await fetch(`/api/projects/${projectId}/article`)
      const artData = await artRes.json()
      setArticleTemplate(artData.template || '')
      setArticleWordCount(artData.wordCount || 0)
      toast.success(`Articulo generado: ${artData.wordCount} palabras`)
    } catch {
      toast.error('Error de conexion')
    } finally {
      setIsGeneratingArticle(false)
    }
  }

  const handleSaveArticle = async () => {
    setIsSavingArticle(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/article`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: articleTemplate }),
      })
      const data = await res.json()
      if (res.ok) {
        setArticleWordCount(data.wordCount || 0)
        toast.success('Articulo guardado')
      }
    } catch {
      toast.error('Error al guardar')
    } finally {
      setIsSavingArticle(false)
    }
  }

  // Token handlers
  const handleAddToken = async () => {
    if (!newTokenName || !newTokenJson) return
    setIsAddingToken(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenName: newTokenName, tokenJson: newTokenJson }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al agregar token')
        return
      }
      // Reload tokens
      const tokRes = await fetch(`/api/projects/${projectId}/tokens`)
      const tokData = await tokRes.json()
      setTokens(tokData.tokens || [])
      setTotalQuota(tokData.totalQuota || 0)
      setUsedToday(tokData.usedToday || 0)
      setNewTokenName('')
      setNewTokenJson('')
      setShowAddToken(false)
      toast.success('Token agregado')
    } catch {
      toast.error('Error de conexion')
    } finally {
      setIsAddingToken(false)
    }
  }

  const handleDeleteToken = async (tokenId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/tokens/${tokenId}`, { method: 'DELETE' })
      setTokens(prev => prev.filter(t => t.$id !== tokenId))
      toast.success('Token eliminado')
    } catch {
      toast.error('Error al eliminar token')
    }
  }

  const handleToggleToken = async (tokenId: string, isActive: boolean) => {
    try {
      await fetch(`/api/projects/${projectId}/tokens/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      setTokens(prev => prev.map(t => t.$id === tokenId ? { ...t, isActive } : t))
    } catch {
      toast.error('Error al actualizar token')
    }
  }

  // Wizard handler
  const handleMarkWizardStep = async (step: number) => {
    if (!project) return
    const current = (() => { try { return JSON.parse(project.wizardState || '{}') } catch { return {} } })()
    const updated = { ...current, [`step${step}`]: true }
    const wizardState = JSON.stringify(updated)
    try {
      await projectService.updateProject(project.$id, { wizardState } as never)
      setProject({ ...project, wizardState })
      toast.success('Paso marcado como completado')
    } catch {
      toast.error('Error al actualizar')
    }
  }

  // Verify indexation handler
  const handleVerifyIndexation = async () => {
    setIsVerifying(true)
    try {
      const res = await fetch(`/api/indexing/verify/${projectId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setVerifyResults(data.results || [])
        setVerifyPercentage(data.percentage ?? null)
        toast.success(`Verificacion completada: ${data.percentage}% indexadas`)
      }
    } catch {
      toast.error('Error al verificar')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleStartIndexing = async () => {
    setIsStarting(true)
    try {
      const rateNum = parseInt(editRate) || 200
      const res = await fetch('/api/indexing/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, batchSize: rateNum, indexingOrder }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al iniciar indexacion')
        return
      }
      toast.success(`Indexacion iniciada: ${data.totalToProcess} URLs por procesar`)
      await fetchIndexingStatus()
    } catch {
      toast.error('Error de conexion')
    } finally {
      setIsStarting(false)
    }
  }

  const handleStartAllRegions = async () => {
    if (regions.length === 0) return
    setIsStartingAll(true)
    const rateNum = parseInt(editRate) || 200
    let started = 0
    let errors = 0
    for (const region of regions) {
      try {
        const res = await fetch('/api/indexing/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: region.$id, batchSize: rateNum, indexingOrder }),
        })
        if (res.ok) started++
        else errors++
      } catch {
        errors++
      }
    }
    if (started > 0) toast.success(`Indexacion iniciada en ${started} regiones`)
    if (errors > 0) toast.error(`${errors} regiones fallaron al iniciar`)
    await fetchRegionAggregates(regions)
    setIsStartingAll(false)
  }

  const handleStopIndexing = async () => {
    setIsStopping(true)
    try {
      const res = await fetch(`/api/indexing/stop/${projectId}`, { method: 'POST' })
      if (res.ok) {
        toast.success('Indexacion detenida')
        await fetchIndexingStatus()
      }
    } catch {
      toast.error('Error al detener')
    } finally {
      setIsStopping(false)
    }
  }

  const handleResetIndexing = async () => {
    setIsResetting(true)
    try {
      const res = await fetch(`/api/indexing/reset/${projectId}`, { method: 'POST' })
      if (res.ok) {
        toast.success('Indexacion reseteada')
        setShowResetConfirm(false)
        await fetchIndexingStatus()
        // Reload keyword stats to reflect status change
        fetchKeywordStats()
        fetchKeywordsPage(kwPage, kwStatusFilter, kwSearch)
      }
    } catch {
      toast.error('Error al resetear')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeindex = async () => {
    setIsDeindexing(true)
    try {
      const res = await fetch(`/api/indexing/deindex/${projectId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al desindexar')
        return
      }
      toast.success(`Desindexacion iniciada: ${data.totalToProcess} URLs`)
      setShowDeindexConfirm(false)
      await fetchIndexingStatus()
    } catch {
      toast.error('Error de conexion')
    } finally {
      setIsDeindexing(false)
    }
  }

  const handlePauseSite = async () => {
    setIsPausing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      })
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, status: 'paused' } : prev)
        setShowPauseConfirm(false)
        toast.success('Sitio pausado. Las paginas SEO retornaran 404.')
      }
    } catch {
      toast.error('Error al pausar')
    } finally {
      setIsPausing(false)
    }
  }

  const handleReactivate = async () => {
    setIsReactivating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, status: 'active' } : prev)
        toast.success('Proyecto reactivado')
      }
    } catch {
      toast.error('Error al reactivar')
    } finally {
      setIsReactivating(false)
    }
  }

  const handleRetryFailed = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/retry-failed`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.reset} keywords reiniciadas para re-indexacion`)
      fetchKeywordStats()
      fetchKeywordsPage(kwPage, kwStatusFilter, kwSearch)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al reintentar')
    }
  }

  const handleDownloadErrorLog = () => {
    if (!indexingStatus?.errorLog) return
    const blob = new Blob([indexingStatus.errorLog], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'project'}-error-log.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-muted mb-6" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!project) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Proyecto no encontrado</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a proyectos
        </Button>
      </div>
    )
  }

  const statusLabel: Record<string, string> = {
    active: 'Activo',
    paused: 'Pausado',
    completed: 'Completado',
  }
  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    paused: 'secondary',
    completed: 'outline',
  }

  const pendingKws = kwStats.pending
  const indexedKws = kwStats.indexed
  const failedKws = kwStats.failed

  // Aggregated stats across all regions (parent only)
  const aggKw = hasRegions ? Array.from(regionKwStats.values()).reduce(
    (acc, s) => ({ total: acc.total + s.total, pending: acc.pending + s.pending, indexed: acc.indexed + s.indexed, failed: acc.failed + s.failed }),
    { total: 0, pending: 0, indexed: 0, failed: 0 }
  ) : null
  const anyRegionRunning = regionIndexStatuses.some(s => s.status === 'running')
  const rawDomain = project.domain.replace(/\/$/, '')
  const projectDomain = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`
  const seoPathPrefix = (project.seoPathPrefix || '').replace(/^\/|\/$/g, '')
  const publicBase = seoPathPrefix ? `${projectDomain}/${seoPathPrefix}` : projectDomain
  const sitemapSlug = projectNameToSlug(project.name)
  const publicSitemapUrl = `${publicBase}/sitemap-${sitemapSlug}.xml`
  const seoTestBase = `/api/sites/${encodeURIComponent(projectDomain.replace(/^https?:\/\//, ''))}`
  const hasToken = tokens.length > 0 || Boolean(project.googleTokenJson?.trim())

  // Indexing computed values
  const isRunning = indexingStatus?.status === 'running'
  const actualProcessed = indexingStatus
    ? indexingStatus.successUrls + indexingStatus.failedUrls
    : 0
  const progressPercent = indexingStatus && indexingStatus.totalUrls > 0
    ? Math.round((actualProcessed / indexingStatus.totalUrls) * 100)
    : 0

  // Parse error log
  const errorEntries = indexingStatus?.errorLog
    ? indexingStatus.errorLog.split('\n').filter(Boolean).map((line) => {
        const parts = line.split(' | ')
        return {
          timestamp: parts[0] || '',
          statusCode: parts[1] || '',
          url: parts[2] || '',
          message: parts[3] || '',
        }
      })
    : []

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(isRegion ? `/dashboard/projects/${project.parentProjectId}` : '/dashboard/projects')}
          className="mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {isRegion ? 'Proyecto padre' : 'Proyectos'}
        </Button>
        <div className="flex items-center gap-3">
          {isRegion && <MapPin className="h-5 w-5 text-muted-foreground" />}
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge variant={statusVariant[project.status] || 'outline'}>
            {statusLabel[project.status] ?? project.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{project.domain}</p>
      </div>

      {/* ========== WIZARD (only for standalone/regions, not parents) ========== */}
      {regions.length === 0 && (
      <ProjectWizard
        project={project}
        hasArticle={articleWordCount >= 1200}
        hasTokens={tokens.length > 0 || !!(project.googleTokenJson?.trim())}
        hasIndexingJob={indexingStatus?.status === 'running' || indexingStatus?.status === 'completed'}
        onMarkCompleted={handleMarkWizardStep}
      />
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-1 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <Key className="mr-1 h-4 w-4" />
            Keywords ({(hasRegions && aggKw ? aggKw.total : kwStats.total).toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="indexing">
            <Globe className="mr-1 h-4 w-4" />
            Indexacion
            {(isRunning || anyRegionRunning) && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="landing">
            <Layout className="mr-1 h-4 w-4" />
            Landing
          </TabsTrigger>
          {!isRegion && (
            <TabsTrigger value="regions">
              <MapPin className="mr-1 h-4 w-4" />
              Regiones ({regions.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* ========== GENERAL TAB ========== */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{project.totalKeywords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Indexadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{project.totalIndexed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Tasa de indexacion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{project.indexingRate}/dia</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Modo SEO</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">
                  {project.seoMode === 'subdomain_redirect' ? 'Subdominio + Redirect' : 'Sitio completo'}
                </p>
              </CardContent>
            </Card>
          </div>

          {(project.businessName || project.businessPhone || project.businessEmail || project.niche) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informacion del negocio</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                  {project.businessName && (
                    <div>
                      <dt className="text-muted-foreground">Nombre</dt>
                      <dd>{project.businessName}</dd>
                    </div>
                  )}
                  {project.businessPhone && (
                    <div>
                      <dt className="text-muted-foreground">Telefono</dt>
                      <dd>{project.businessPhone}</dd>
                    </div>
                  )}
                  {project.businessEmail && (
                    <div>
                      <dt className="text-muted-foreground">Email</dt>
                      <dd>{project.businessEmail}</dd>
                    </div>
                  )}
                  {project.niche && (
                    <div>
                      <dt className="text-muted-foreground">Nicho</dt>
                      <dd>{project.niche}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuracion del Sitio SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Modo:</span>
                <Badge variant="outline">
                  {project.seoMode === 'subdomain_redirect' ? 'Subdominio + Redirect' : 'Sitio completo'}
                </Badge>
              </div>
              {project.seoMode === 'subdomain_redirect' && project.redirectUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Redirect a:</span>
                  <span className="text-sm">{project.redirectUrl}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">URLs publicadas:</span>
                <span className="text-sm font-medium">
                  {kwStats.total.toLocaleString()} keywords
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={publicSitemapUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Ver Sitemap
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`${seoTestBase}/robots.txt`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Ver robots.txt
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Multi-Token Management — only for parent/standalone, not regions */}
          {!project.parentProjectId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Tokens de Google Cloud
                <Badge variant={tokens.length > 0 ? 'default' : 'destructive'} className="text-xs">
                  {tokens.length > 0 ? `${tokens.filter(t => t.isActive).length} activos` : 'Sin tokens'}
                </Badge>
                {totalQuota > 0 && (
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    Capacidad: {totalQuota} URLs/dia ({usedToday} usadas hoy)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Token list */}
              {tokens.length > 0 && (
                <div className="space-y-2">
                  {tokens.map(token => (
                    <div key={token.$id} className="flex items-center gap-3 p-2 rounded border text-sm">
                      <div className={`w-2 h-2 rounded-full ${token.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{token.tokenName}</p>
                        <p className="text-xs text-muted-foreground truncate">{token.serviceAccountEmail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {token.urlsSentToday}/{token.dailyQuota}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleToggleToken(token.$id, !token.isActive)}
                      >
                        {token.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive"
                        onClick={() => handleDeleteToken(token.$id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add token form */}
              {showAddToken ? (
                <div className="space-y-2 p-3 border rounded">
                  <div className="space-y-1">
                    <Label>Nombre del token</Label>
                    <Input
                      value={newTokenName}
                      onChange={e => setNewTokenName(e.target.value)}
                      placeholder="Ej: Token principal"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Contenido del JSON</Label>
                    <Textarea
                      value={newTokenJson}
                      onChange={e => setNewTokenJson(e.target.value)}
                      placeholder='{"type": "service_account", ...}'
                      rows={5}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddToken} disabled={isAddingToken}>
                      {isAddingToken ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Agregar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddToken(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowAddToken(true)}>
                  + Agregar token
                </Button>
              )}

            </CardContent>
          </Card>
          ) : (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Los tokens se gestionan desde el proyecto padre.{' '}
                <Link href={`/dashboard/projects/${project.parentProjectId}`} className="text-primary hover:underline">
                  Ir al proyecto padre
                </Link>
              </p>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* ========== KEYWORDS TAB ========== */}
        <TabsContent value="keywords" className="mt-4">
          {/* Parent: aggregated keywords summary */}
          {hasRegions ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Keywords por Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 flex-wrap mb-4">
                    <Badge variant="secondary">{(aggKw?.pending || 0).toLocaleString()} pendientes</Badge>
                    <Badge variant="default">{(aggKw?.indexed || 0).toLocaleString()} indexadas</Badge>
                    {(aggKw?.failed || 0) > 0 && <Badge variant="destructive">{aggKw!.failed.toLocaleString()} fallidas</Badge>}
                    <span className="text-sm text-muted-foreground">Total: {(aggKw?.total || 0).toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    {regions.map((r) => {
                      const rs = regionKwStats.get(r.$id)
                      return (
                        <div key={r.$id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <Link href={`/dashboard/projects/${r.$id}`} className="font-medium hover:underline flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.name}
                          </Link>
                          <div className="flex gap-3 text-sm text-muted-foreground">
                            <span>{(rs?.total || 0).toLocaleString()} total</span>
                            <span className="text-green-600">{(rs?.indexed || 0).toLocaleString()} indexadas</span>
                            <span>{(rs?.pending || 0).toLocaleString()} pendientes</span>
                            {(rs?.failed || 0) > 0 && <span className="text-red-500">{rs!.failed.toLocaleString()} fallidas</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground">
                Las keywords se gestionan desde cada region individualmente. Haz clic en el nombre de la region para administrar sus keywords.
              </p>
            </div>
          ) : (
          <>
          {/* Hidden file input for import */}
          <input
            ref={importFileRef}
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={handleImportKeywords}
          />

          {/* Import progress bar */}
          {isImporting && importProgress && (() => {
            const pct = Math.round((importProgress.saved / importProgress.total) * 100)
            const speed = importProgress.elapsedMs > 0
              ? Math.round((importProgress.saved / importProgress.elapsedMs) * 1000)
              : 0
            const remaining = speed > 0
              ? Math.ceil((importProgress.total - importProgress.saved) / speed)
              : 0
            const mins = Math.floor(remaining / 60)
            const secs = remaining % 60
            return (
              <Card className="mb-4">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">
                        Importando: {importProgress.saved.toLocaleString()} / {importProgress.total.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {speed > 0 && `${speed.toLocaleString()} kw/s`}
                        {remaining > 0 && ` · ~${mins > 0 ? `${mins}m ` : ''}${secs}s restantes`}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { importAbortRef.current = true }}
                        className="gap-1"
                      >
                        <Square className="h-3 w-3" />
                        Detener
                      </Button>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3 flex-wrap items-center">
              <Badge variant="secondary">{pendingKws.toLocaleString()} pendientes</Badge>
              <Badge variant="default">{indexedKws.toLocaleString()} indexadas</Badge>
              {failedKws > 0 && <Badge variant="destructive">{failedKws.toLocaleString()} fallidas</Badge>}
              <span className="text-sm text-muted-foreground">
                Total: {kwStats.total.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              {kwStats.total > 0 && !showDeleteConfirmKw && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirmKw(true)}
                  disabled={isDeleting || isImporting}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Borrar todo
                </Button>
              )}
              {showDeleteConfirmKw && (
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-destructive font-medium">Seguro?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAllKeywords}
                    disabled={isDeleting}
                    className="gap-1"
                  >
                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Si, borrar {kwStats.total.toLocaleString()}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirmKw(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => importFileRef.current?.click()}
                disabled={isImporting || isDeleting}
                className="gap-1"
              >
                <Upload className="h-3 w-3" />
                Importar desde archivo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTxt}
                disabled={kwStats.total === 0 || isImporting}
                className="gap-1"
                title="Exportar keywords como TXT"
              >
                <Download className="h-3 w-3" />
                TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={kwStats.total === 0 || isImporting}
                className="gap-1"
                title="Exportar keywords con URLs como CSV"
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
              <select
                value={kwStatusFilter}
                onChange={(e) => handleKwStatusChange(e.target.value)}
                className="w-[140px] h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Filtrar por estado"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="indexed">Indexadas</option>
                <option value="failed">Fallidas</option>
              </select>
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar keyword..."
                  value={kwSearch}
                  onChange={(e) => handleKwSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {isLoadingKw ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cargando keywords...</p>
              </CardContent>
            </Card>
          ) : keywords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {kwStats.total === 0
                    ? 'No hay keywords en este proyecto. Créalas con el Generador de Keywords o importa una lista (TXT/CSV).'
                    : 'No se encontraron keywords con ese filtro.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Keyword</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Slug</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Estado</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keywords.map((kw) => {
                          const seoUrl = `${publicBase}/${kw.slug}/`
                          return (
                            <tr key={kw.$id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-2 max-w-[250px] truncate">{kw.keyword}</td>
                              <td className="px-4 py-2 text-muted-foreground font-mono text-xs max-w-[200px] truncate">
                                {kw.slug}
                              </td>
                              <td className="px-4 py-2">
                                <Badge
                                  variant={
                                    kw.status === 'indexed' ? 'default' :
                                    kw.status === 'failed' ? 'destructive' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {kw.status === 'indexed' ? 'Indexada' :
                                   kw.status === 'failed' ? 'Fallida' :
                                   kw.status === 'generated' ? 'Generada' : 'Pendiente'}
                                </Badge>
                              </td>
                              <td className="px-4 py-2">
                                <a
                                  href={seoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  Ver pagina
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {kwTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Pagina {kwPage} de {kwTotalPages} ({kwTotal.toLocaleString()} keywords)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={kwPage <= 1}
                      onClick={() => fetchKeywordsPage(kwPage - 1, kwStatusFilter, kwSearch)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={kwPage >= kwTotalPages}
                      onClick={() => fetchKeywordsPage(kwPage + 1, kwStatusFilter, kwSearch)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          </>
          )}
        </TabsContent>

        {/* ========== INDEXING TAB ========== */}
        <TabsContent value="indexing" className="mt-4 space-y-4">
          {hasRegions ? (
            <div className="space-y-4">
              {/* Token Status (shared) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Estado de Tokens (compartidos)</CardTitle>
                </CardHeader>
                <CardContent>
                  {tokens.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{tokens.length} token(s) activo(s)</span>
                      <Badge variant="secondary" className="text-xs">{totalQuota.toLocaleString()} URLs/dia</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Sin tokens configurados</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Aggregated badges */}
              <div className="flex gap-3 flex-wrap items-center">
                <Badge variant="secondary">{(aggKw?.pending || 0).toLocaleString()} pendientes</Badge>
                <Badge variant="default">{(aggKw?.indexed || 0).toLocaleString()} indexadas</Badge>
                {(aggKw?.failed || 0) > 0 && <Badge variant="destructive">{aggKw!.failed.toLocaleString()} fallidas</Badge>}
                <span className="text-sm text-muted-foreground">Total: {(aggKw?.total || 0).toLocaleString()}</span>
              </div>

              {/* Start All button */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Control de Indexacion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="parentRate" className="text-sm whitespace-nowrap">URLs por region:</Label>
                      <Input
                        id="parentRate"
                        type="number"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="w-28"
                        min={1}
                      />
                    </div>
                    <Button
                      onClick={handleStartAllRegions}
                      disabled={isStartingAll || !tokens.length || (aggKw?.pending || 0) === 0}
                      className="gap-2"
                    >
                      {isStartingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Iniciar Indexacion en Todas ({regions.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fetchRegionAggregates(regions)}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Actualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Per-region status table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Progreso por Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {regionIndexStatuses.map((ri) => {
                      const rs = regionKwStats.get(ri.regionId)
                      const statusColor = ri.status === 'running' ? 'text-blue-500' : ri.status === 'completed' ? 'text-green-500' : ri.status === 'paused_batch' ? 'text-yellow-500' : 'text-muted-foreground'
                      const pct = (rs?.total || 0) > 0 ? Math.round(((rs?.indexed || 0) / (rs?.total || 1)) * 100) : 0
                      return (
                        <div key={ri.regionId} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/projects/${ri.regionId}`} className="font-medium hover:underline flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ri.regionName}
                            </Link>
                            {ri.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                          </div>
                          <div className="flex gap-3 items-center text-sm">
                            <span className={statusColor}>{ri.status === 'no_job' ? 'Sin iniciar' : ri.status}</span>
                            <span>{ri.successUrls.toLocaleString()} enviadas</span>
                            <span className="text-muted-foreground">{pct}%</span>
                            <div className="w-20 bg-secondary rounded-full h-2">
                              <div className="bg-primary rounded-full h-2" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
          <>
          {/* Token Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estado de Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              {tokens.length > 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">
                    {tokens.filter(t => t.isActive).length} token(s) activo(s)
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {totalQuota} URLs/dia
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">
                    Agrega tokens de Google Cloud en la pestana General
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Control */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Control de Indexacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label htmlFor="editRate" className="text-sm whitespace-nowrap">
                    URLs por ejecucion:
                  </Label>
                  <Input
                    id="editRate"
                    type="number"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="w-28"
                    min={1}
                    disabled={isRunning}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="indexOrder" className="text-sm whitespace-nowrap">
                    Orden:
                  </Label>
                  <select
                    id="indexOrder"
                    value={indexingOrder}
                    onChange={(e) => setIndexingOrder(e.target.value)}
                    disabled={isRunning}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="sequential">Secuencial</option>
                    <option value="random">Aleatorio</option>
                    <option value="by_location">Por ubicacion</option>
                    <option value="by_priority">Por prioridad</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleStartIndexing}
                  disabled={isStarting || isRunning || !hasToken || pendingKws === 0}
                  className="gap-2"
                >
                  {isStarting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isRunning ? 'En curso...' : 'Iniciar Indexacion'}
                </Button>

                {isRunning && (
                  <Button
                    variant="destructive"
                    onClick={handleStopIndexing}
                    disabled={isStopping}
                    className="gap-2"
                  >
                    {isStopping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Detener
                  </Button>
                )}

                {!isRunning && (
                  showResetConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-destructive">Esto reseteara todo el progreso</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleResetIndexing}
                        disabled={isResetting}
                      >
                        {isResetting ? 'Reseteando...' : 'Confirmar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResetConfirm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowResetConfirm(true)}
                      className="gap-2"
                      disabled={!indexingStatus || indexingStatus.status === 'no_job'}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Resetear
                    </Button>
                  )
                )}

                {!isRunning && failedKws > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleRetryFailed}
                    className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reintentar fallidas ({failedKws})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {indexingStatus && indexingStatus.status !== 'no_job' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Progreso
                  {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  {indexingStatus.status === 'completed' && (
                    <Badge variant="default" className="text-xs">Completado</Badge>
                  )}
                  {indexingStatus.status === 'stopped' && (
                    <Badge variant="secondary" className="text-xs">Detenido</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {actualProcessed.toLocaleString()} / {indexingStatus.totalUrls.toLocaleString()} URLs
                    </span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        indexingStatus.failedUrls > 0 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total URLs</p>
                    <p className="text-xl font-bold">{indexingStatus.totalUrls.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                    <p className="text-xl font-bold">{actualProcessed.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-green-600">Exitosas</p>
                    <p className="text-xl font-bold text-green-600">
                      {indexingStatus.successUrls.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-red-500">Fallidas</p>
                    <p className="text-xl font-bold text-red-500">
                      {indexingStatus.failedUrls.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                    <p className="text-xl font-bold">{indexingStatus.remaining.toLocaleString()}</p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {indexingStatus.startedAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Inicio: {new Date(indexingStatus.startedAt).toLocaleString()}
                    </div>
                  )}
                  {indexingStatus.completedAt && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Fin: {new Date(indexingStatus.completedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Log */}
          {errorEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Log de errores ({errorEntries.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadErrorLog}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar log
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Codigo</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">URL</th>
                        <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorEntries.map((err, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-1.5 whitespace-nowrap">{err.timestamp}</td>
                          <td className="px-3 py-1.5">
                            <Badge variant="destructive" className="text-xs">{err.statusCode}</Badge>
                          </td>
                          <td className="px-3 py-1.5 max-w-[300px] truncate">{err.url}</td>
                          <td className="px-3 py-1.5 max-w-[200px] truncate">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No job yet */}
          {(!indexingStatus || indexingStatus.status === 'no_job') && (
            <Card>
              <CardContent className="py-8 text-center">
                <Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No se ha ejecutado ninguna indexacion todavia.
                  {!hasToken && ' Configura el token de Google Cloud primero.'}
                  {hasToken && pendingKws === 0 && ' No hay keywords pendientes de indexar.'}
                  {hasToken && pendingKws > 0 && ' Haz clic en "Iniciar Indexacion" para comenzar.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Kill Switch - Control de Proyecto */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Control de Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {/* Reactivate (only if paused) */}
                {project.status === 'paused' && (
                  <Button
                    variant="default"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={handleReactivate}
                    disabled={isReactivating}
                  >
                    {isReactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Reactivar Proyecto
                  </Button>
                )}

                {/* Pause Site */}
                {project.status === 'active' && (
                  showPauseConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-amber-600">Las paginas SEO dejaran de servirse (404)</span>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={handlePauseSite}
                        disabled={isPausing}
                      >
                        {isPausing ? 'Pausando...' : 'Confirmar Pausa'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowPauseConfirm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
                      onClick={() => setShowPauseConfirm(true)}
                    >
                      <Square className="h-4 w-4" />
                      Pausar Sitio
                    </Button>
                  )
                )}

                {/* Deindex Project */}
                {showDeindexConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-500">
                      Esto enviara URL_DELETED a Google para TODAS las URLs indexadas
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeindex}
                      disabled={isDeindexing || !hasToken || indexedKws === 0}
                    >
                      {isDeindexing ? 'Desindexando...' : 'Confirmar Desindexacion'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowDeindexConfirm(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setShowDeindexConfirm(true)}
                    disabled={indexedKws === 0}
                  >
                    <X className="h-4 w-4" />
                    Desindexar Proyecto
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {project.status === 'paused' && 'El proyecto esta pausado. Las paginas SEO retornan 404 y el sitemap esta vacio.'}
                {project.status === 'active' && 'Pausar detiene las paginas sin desindexar. Desindexar envia URL_DELETED a Google.'}
              </p>
            </CardContent>
          </Card>

          {/* Verification */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Verificacion Real de Indexacion
                {verifyPercentage !== null && (
                  <Badge variant={verifyPercentage > 50 ? 'default' : 'secondary'}>
                    {verifyPercentage}% indexadas
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Verifica si Google realmente indexo las URLs usando una muestra de 20 paginas.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerifyIndexation}
                disabled={isVerifying}
                className="gap-2"
              >
                {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                {isVerifying ? 'Verificando...' : 'Verificar indexacion'}
              </Button>
              {verifyResults.length > 0 && (
                <div className="space-y-1 mt-2">
                  {verifyResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.indexed ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className="truncate">{r.keyword}</span>
                      <span className="text-muted-foreground flex-shrink-0">
                        {r.verdict}{r.coverageState ? ` / ${r.coverageState}` : ''}
                      </span>
                      {r.lastCrawlTime && (
                        <span className="text-muted-foreground flex-shrink-0">
                          {new Date(r.lastCrawlTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">
                    Verificacion via URL Inspection API. Muestra de {verifyResults.length} URLs.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        {/* ========== LANDING TAB ========== */}
        <TabsContent value="landing" className="mt-4 space-y-4">
          {/* SEO Article (1200+ words) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Articulo SEO (1,200+ palabras)
                {articleWordCount > 0 && (
                  <Badge variant={articleWordCount >= 1200 ? 'default' : 'secondary'} className="text-xs">
                    {articleWordCount} palabras
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Genera un articulo base con IA que se reutiliza en las {project.totalKeywords.toLocaleString()} URLs.
                Usa placeholders {'{'} keyword {'}'}, {'{'} ubicacion {'}'} que se reemplazan automaticamente.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleGenerateArticle}
                  disabled={isGeneratingArticle}
                  className="gap-2"
                >
                  {isGeneratingArticle ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {articleTemplate ? 'Regenerar articulo' : 'Generar articulo SEO'}
                </Button>
                {articleTemplate && (
                  <Button size="sm" variant="outline" onClick={handleSaveArticle} disabled={isSavingArticle}>
                    <Save className="mr-1 h-3 w-3" />
                    Guardar cambios
                  </Button>
                )}
              </div>
              {articleTemplate && (
                <Textarea
                  value={articleTemplate}
                  onChange={(e) => setArticleTemplate(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                  placeholder="HTML del articulo SEO..."
                />
              )}
            </CardContent>
          </Card>

          {isLoadingLanding ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cargando landing...</p>
              </CardContent>
            </Card>
          ) : !landingData ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No hay landing generada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Genera una landing page con IA basada en los datos del negocio.
                </p>
                <Button
                  onClick={handleGenerateLanding}
                  disabled={isGeneratingLanding}
                  className="gap-2"
                >
                  {isGeneratingLanding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGeneratingLanding ? 'Generando con IA...' : 'Generar Landing con IA'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSaveLanding} disabled={isSavingLanding} className="gap-2">
                  {isSavingLanding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSavingLanding ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateLanding}
                  disabled={isGeneratingLanding}
                  className="gap-2"
                >
                  {isGeneratingLanding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isGeneratingLanding ? 'Regenerando...' : 'Regenerar con IA'}
                </Button>
                <Button variant="outline" asChild className="gap-2">
                  <a href={`${seoTestBase}/`} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                    Vista previa
                  </a>
                </Button>
                {!showDeleteLanding ? (
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteLanding(true)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar landing
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive font-medium">Seguro?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteLanding}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Si, eliminar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeleteLanding(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>

              {/* Business Description */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Descripcion del negocio</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={landingData.businessDescription}
                    onChange={(e) => updateLandingField('businessDescription', e.target.value)}
                    rows={4}
                    placeholder="Descripcion generada por IA..."
                  />
                </CardContent>
              </Card>

              {/* Differentiators & Tone */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Diferenciadores y tono</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="differentiators">Diferenciadores del negocio</Label>
                    <Textarea
                      id="differentiators"
                      value={landingData.differentiators || ''}
                      onChange={(e) => updateLandingField('differentiators', e.target.value)}
                      rows={3}
                      placeholder="Ej: 15 anos de experiencia, equipo certificado, garantia de satisfaccion, cobertura en toda la ciudad..."
                    />
                    <p className="text-xs text-muted-foreground">Separados por coma. Se usan en el generador de articulos SEO para hacer contenido unico.</p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contentTone">Tono del contenido</Label>
                    <select
                      id="contentTone"
                      value={landingData.contentTone || 'profesional'}
                      onChange={(e) => updateLandingField('contentTone', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="profesional">Profesional</option>
                      <option value="cercano">Cercano / Amigable</option>
                      <option value="premium">Premium / Exclusivo</option>
                      <option value="urgente">Urgente / Directo</option>
                      <option value="tecnico">Tecnico / Especializado</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Define como se redactan los articulos SEO generados automaticamente.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Services */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Servicios (JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={landingData.services}
                    onChange={(e) => updateLandingField('services', e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder='[{"name": "...", "description": "..."}]'
                  />
                </CardContent>
              </Card>

              {/* Testimonials */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Testimonios (JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={landingData.testimonials}
                    onChange={(e) => updateLandingField('testimonials', e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder='[{"name": "...", "text": "...", "rating": 5}]'
                  />
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Estadisticas (JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={landingData.stats}
                    onChange={(e) => updateLandingField('stats', e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                    placeholder='[{"value": "500+", "label": "Clientes"}]'
                  />
                </CardContent>
              </Card>

              {/* Social Proof Messages */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mensajes de prueba social (JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={landingData.socialProofMessages}
                    onChange={(e) => updateLandingField('socialProofMessages', e.target.value)}
                    rows={3}
                    className="font-mono text-xs"
                    placeholder='["Maria acaba de contactar...", "5 personas viendo esto"]'
                  />
                </CardContent>
              </Card>

              {/* CTA Texts */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Textos de CTA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="ctaWhatsapp">Boton WhatsApp</Label>
                      <Input
                        id="ctaWhatsapp"
                        value={landingData.ctaWhatsappText}
                        onChange={(e) => updateLandingField('ctaWhatsappText', e.target.value)}
                        placeholder="WhatsApp ahora"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ctaCall">Boton Llamar</Label>
                      <Input
                        id="ctaCall"
                        value={landingData.ctaCallText}
                        onChange={(e) => updateLandingField('ctaCallText', e.target.value)}
                        placeholder="Llamar ahora"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appearance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Apariencia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="colorScheme">Esquema de color</Label>
                    <select
                      id="colorScheme"
                      value={landingData.colorScheme}
                      onChange={(e) => updateLandingField('colorScheme', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="dark">Oscuro</option>
                      <option value="light">Claro</option>
                      <option value="blue">Azul</option>
                      <option value="green">Verde</option>
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="logoUrl">Favicon / Logo (URL completa con https://)</Label>
                      <Input
                        id="logoUrl"
                        value={landingData.logoUrl}
                        onChange={(e) => updateLandingField('logoUrl', e.target.value)}
                        placeholder="https://midominio.com/favicon.png"
                      />
                      <p className="text-xs text-muted-foreground">URL completa incluyendo https://. Formato: PNG cuadrado, minimo 48x48px, fondo de color solido (NO transparente). Google lo muestra en resultados de busqueda.</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bgUrl">URL de imagen de fondo</Label>
                      <Input
                        id="bgUrl"
                        value={landingData.backgroundImageUrl}
                        onChange={(e) => updateLandingField('backgroundImageUrl', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social & Maps Links */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Redes sociales y mapa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Se usan en el schema JSON-LD (sameAs) para mejorar SEO y en la landing page.</p>
                  <div className="space-y-1">
                    <Label htmlFor="facebookUrl">Facebook</Label>
                    <Input
                      id="facebookUrl"
                      value={landingData.facebookUrl || ''}
                      onChange={(e) => updateLandingField('facebookUrl', e.target.value)}
                      placeholder="https://www.facebook.com/TuPagina"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="instagramUrl">Instagram</Label>
                    <Input
                      id="instagramUrl"
                      value={landingData.instagramUrl || ''}
                      onChange={(e) => updateLandingField('instagramUrl', e.target.value)}
                      placeholder="https://www.instagram.com/tucuenta"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="googleMapsUrl">Google Maps (perfil de negocio)</Label>
                    <Input
                      id="googleMapsUrl"
                      value={landingData.googleMapsUrl || ''}
                      onChange={(e) => updateLandingField('googleMapsUrl', e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        {/* ========== REGIONS TAB ========== */}
        {!isRegion && (
          <TabsContent value="regions" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agregar Region</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 max-w-md">
                  <Input
                    placeholder="Nombre de la region (ej: CDMX, Guadalajara)"
                    value={newRegionName}
                    onChange={(e) => setNewRegionName(e.target.value)}
                  />
                  <Button
                    disabled={!newRegionName.trim() || isCreatingRegion || !project}
                    onClick={async () => {
                      if (!project || !newRegionName.trim()) return
                      setIsCreatingRegion(true)
                      try {
                        await projectService.createRegion(project, newRegionName.trim(), project.userId)
                        toast.success(`Region "${newRegionName}" creada`)
                        setNewRegionName('')
                        fetchRegions()
                      } catch {
                        toast.error('Error al crear la region')
                      } finally {
                        setIsCreatingRegion(false)
                      }
                    }}
                  >
                    {isCreatingRegion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Crear
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Las regiones heredan el dominio, datos del negocio, tokens y template SEO de este proyecto.
                  Solo necesitas crear o importar las keywords de cada región.
                </p>
              </CardContent>
            </Card>

            {regions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <MapPin className="mx-auto mb-2 h-8 w-8" />
                  <p>No hay regiones aun. Crea una para organizar keywords por zona geografica.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {regions.map((region) => (
                  <Card key={region.$id} className="border-l-2 border-l-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          href={`/dashboard/projects/${region.$id}`}
                          className="font-medium hover:underline"
                        >
                          <MapPin className="inline mr-1 h-4 w-4" />
                          {region.name}
                        </Link>
                        <Badge variant={region.status === 'active' ? 'default' : 'secondary'}>
                          {region.status === 'active' ? 'Activo' : region.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span><Key className="inline mr-1 h-3 w-3" />{region.totalKeywords.toLocaleString()} keywords</span>
                        <span><Globe className="inline mr-1 h-3 w-3" />{region.totalIndexed.toLocaleString()} indexadas</span>
                      </div>
                      <Button size="sm" variant="outline" className="mt-3" asChild>
                        <Link href={`/dashboard/projects/${region.$id}`}>
                          Gestionar
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {regions.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4 text-sm">
                    <span className="font-medium">Totales:</span>
                    <span>{regions.reduce((s, r) => s + r.totalKeywords, 0).toLocaleString()} keywords</span>
                    <span>{regions.reduce((s, r) => s + r.totalIndexed, 0).toLocaleString()} indexadas</span>
                    <span>{regions.length} regiones</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

      </Tabs>
    </div>
  )
}
