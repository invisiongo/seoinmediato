'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Zap,
  PauseCircle,
  Key,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { IndexingOverviewResponse, JobOverview, TokenOverview } from '@/features/indexing/types/overview'

const REFRESH_INTERVAL_MS = 30_000

// --- Helpers ---

function formatElapsed(ms: number | null): string {
  if (ms === null || ms < 0) return '-'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatNumber(n: number): string {
  return n.toLocaleString('es-MX')
}

// --- Sub-components ---

interface SummaryCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  colorClass: string
  description?: string
}

function SummaryCard({ label, value, icon: Icon, colorClass, description }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

function TokenDot({ token }: { token: TokenOverview }) {
  const exhausted = token.urlsSentToday >= token.dailyQuota
  const inactive = !token.isActive

  let dotColor = 'bg-green-500'
  let statusLabel = 'Activo'

  if (inactive) {
    dotColor = 'bg-gray-500'
    statusLabel = 'Inactivo'
  } else if (token.isPaused) {
    dotColor = 'bg-yellow-500'
    statusLabel = 'Pausado (429)'
  } else if (exhausted) {
    dotColor = 'bg-red-500'
    statusLabel = 'Cuota agotada'
  }

  const pct = Math.min(100, token.dailyQuota > 0 ? Math.round((token.urlsSentToday / token.dailyQuota) * 100) : 0)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor} ${token.isPaused ? 'animate-pulse' : ''}`}
            aria-label={statusLabel}
          />
          <span className="truncate text-sm font-medium">{token.tokenName}</span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{statusLabel}</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatNumber(token.urlsSentToday)} enviadas hoy</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              inactive ? 'bg-gray-400' : token.isPaused ? 'bg-yellow-500' : exhausted ? 'bg-red-500' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="truncate text-xs text-muted-foreground">{token.serviceAccountEmail || 'Sin email'}</p>
      </div>
    </div>
  )
}

interface JobRowProps {
  job: JobOverview
  variant: 'running' | 'paused'
}

function JobRow({ job, variant }: JobRowProps) {
  const pct =
    job.totalUrls > 0 ? Math.min(100, Math.round((job.successUrls / job.totalUrls) * 100)) : 0

  const badgeContent =
    variant === 'running' ? (
      <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Indexando
      </Badge>
    ) : (
      <Badge className="bg-yellow-500 text-white hover:bg-yellow-500 text-xs gap-1">
        <PauseCircle className="h-3 w-3" />
        Pausado
      </Badge>
    )

  const displayName = job.parentName ? `${job.parentName} / ${job.projectName}` : job.projectName

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {job.startedAt && (
            <p className="text-xs text-muted-foreground">Inicio: {formatTime(job.startedAt)}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">{badgeContent}</td>
      <td className="px-4 py-3 text-center text-sm font-medium text-green-500">
        {formatNumber(job.successUrls)}
      </td>
      <td className="hidden px-4 py-3 text-center text-sm text-muted-foreground sm:table-cell">
        {formatNumber(job.totalUrls)}
      </td>
      <td className="hidden px-4 py-3 md:table-cell">
        <div className="flex items-center gap-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-medium text-muted-foreground">
            {pct}%
          </span>
        </div>
      </td>
      <td className="hidden px-4 py-3 text-center text-xs text-muted-foreground lg:table-cell">
        {formatElapsed(job.elapsedMs)}
      </td>
    </tr>
  )
}

interface JobTableProps {
  jobs: JobOverview[]
  variant: 'running' | 'paused'
  title: string
  icon: React.ElementType
  emptyMessage: string
  headerColorClass: string
}

function JobTable({ jobs, variant, title, icon: Icon, emptyMessage, headerColorClass }: JobTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-base ${headerColorClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {jobs.length} {jobs.length === 1 ? 'tarea' : 'tareas'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {jobs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Region / Proyecto
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    Exitosas
                  </th>
                  <th className="hidden px-4 py-2.5 text-center text-xs font-medium text-muted-foreground sm:table-cell">
                    Total
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-muted-foreground md:table-cell">
                    Progreso
                  </th>
                  <th className="hidden px-4 py-2.5 text-center text-xs font-medium text-muted-foreground lg:table-cell">
                    Tiempo
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} variant={variant} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Main page ---

export default function IndexingStatusPage() {
  const [data, setData] = useState<IndexingOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000)
  const [selectedProject, setSelectedProject] = useState<string>('')

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const url = selectedProject
        ? `/api/indexing/overview?projectId=${selectedProject}`
        : '/api/indexing/overview'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: IndexingOverviewResponse = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(null)
      setCountdown(REFRESH_INTERVAL_MS / 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`No se pudo cargar el estado: ${message}`)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedProject])

  // Initial load
  useEffect(() => {
    fetchData(false)
  }, [fetchData])

  // Auto-refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => fetchData(true), REFRESH_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [fetchData])

  // Countdown timer
  useEffect(() => {
    const tickId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return REFRESH_INTERVAL_MS / 1000
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(tickId)
  }, [lastRefresh])

  if (isLoading) {
    return (
      <div>
        <PageHeader countdown={null} isRefreshing={false} lastRefresh={null} onRefresh={() => {}} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader countdown={null} isRefreshing={false} lastRefresh={null} onRefresh={() => fetchData(false)} />
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { summary, tokens, runningJobs, pausedJobs, parentProjects } = data

  return (
    <div className="space-y-6">
      <PageHeader
        countdown={countdown}
        isRefreshing={isRefreshing}
        lastRefresh={lastRefresh}
        onRefresh={() => fetchData(true)}
      />

      {/* Project filter */}
      {parentProjects && parentProjects.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Proyecto:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos los proyectos</option>
            {parentProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.domain})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="URLs Indexadas"
          value={formatNumber(summary.totalIndexed)}
          icon={CheckCircle2}
          colorClass="text-green-500"
          description="Enviadas a Google exitosamente"
        />
        <SummaryCard
          label="Indexando ahora"
          value={summary.totalRunning}
          icon={Activity}
          colorClass="text-blue-500"
          description={summary.totalRunning === 0 ? 'Sin tareas activas' : 'Tareas en ejecucion'}
        />
        <SummaryCard
          label="Pausadas"
          value={summary.totalPaused}
          icon={PauseCircle}
          colorClass={summary.totalPaused > 0 ? 'text-yellow-500' : 'text-muted-foreground'}
          description="Esperando siguiente ciclo"
        />
        <SummaryCard
          label="Pendientes"
          value={formatNumber(summary.totalPending)}
          icon={Clock}
          colorClass="text-muted-foreground"
          description="URLs aun sin indexar"
        />
      </div>

      {/* Token status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Tokens de Google ({tokens.length})
            {tokens.some((t) => t.isPaused) && (
              <Badge className="ml-auto bg-yellow-500 text-white hover:bg-yellow-500 text-xs">
                Hay tokens pausados
              </Badge>
            )}
            {tokens.every((t) => !t.isPaused && t.isActive) && tokens.length > 0 && (
              <Badge className="ml-auto bg-green-600 text-white hover:bg-green-600 text-xs">
                Todos operativos
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No hay tokens configurados
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tokens.map((token) => (
                <TokenDot key={token.id} token={token} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Running jobs */}
      <JobTable
        jobs={runningJobs}
        variant="running"
        title="Indexacion en curso"
        icon={TrendingUp}
        emptyMessage="No hay indexacion activa en este momento. El cron arranca cada 24 horas."
        headerColorClass="text-blue-500"
      />

      {/* Paused jobs */}
      <JobTable
        jobs={pausedJobs}
        variant="paused"
        title="Tareas pausadas"
        icon={PauseCircle}
        emptyMessage="No hay tareas pausadas."
        headerColorClass="text-yellow-500"
      />

      {/* Footer note */}
      <p className="pb-2 text-center text-xs text-muted-foreground">
        El cron de indexacion se ejecuta cada 24 horas automaticamente.
        Esta pagina se actualiza cada 30 segundos.
      </p>
    </div>
  )
}

// --- Page header sub-component ---

interface PageHeaderProps {
  countdown: number | null
  isRefreshing: boolean
  lastRefresh: Date | null
  onRefresh: () => void
}

function PageHeader({ countdown, isRefreshing, lastRefresh, onRefresh }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Estado de Indexacion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista en tiempo real del progreso de indexacion en Google.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {lastRefresh && (
          <span className="text-xs text-muted-foreground">
            Actualizado {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {countdown !== null && (
              <span className="ml-1 text-muted-foreground/60">
                (en {countdown}s)
              </span>
            )}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          aria-label="Actualizar datos ahora"
        >
          {isRefreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
          )}
          Actualizar
        </button>
        <div className="flex items-center gap-1 rounded-md border border-green-600/30 bg-green-600/10 px-2.5 py-1.5">
          <Zap className="h-3 w-3 text-green-500" aria-hidden="true" />
          <span className="text-xs font-medium text-green-500">Live</span>
        </div>
      </div>
    </div>
  )
}
