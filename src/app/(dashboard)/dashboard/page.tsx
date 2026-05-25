'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderKanban, Key, Globe, Activity, Plus, Loader2, MapPin } from 'lucide-react'
import { Query } from 'appwrite'
import { getDatabases } from '@/shared/lib/appwrite-client'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  totalProjects: number
  totalKeywords: number
  totalIndexed: number
  activeProjects: number
}

interface IndexingGroup {
  parentId: string
  parentName: string
  domain: string
  regions: { id: string; name: string; processed: number; total: number }[]
  totalProcessed: number
  totalUrls: number
}

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  description: string
  valueColor?: string
}

function StatCard({ title, value, icon: Icon, description, valueColor }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${valueColor || ''}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <FolderKanban className="mb-4 h-14 w-14 text-muted-foreground" aria-hidden="true" />
        <h2 className="mb-2 text-lg font-semibold">No hay proyectos aun</h2>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Crea tu primer proyecto para comenzar a gestionar tus keywords e indexacion SEO.
        </p>
        <Button asChild>
          <Link href="/dashboard/projects">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Crear primer proyecto
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [indexingGroups, setIndexingGroups] = useState<IndexingGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function safeList(
      db: ReturnType<typeof getDatabases>,
      collectionId: string,
      queries?: string[],
    ) {
      try {
        return await db.listDocuments(DATABASE_ID, collectionId, queries)
      } catch {
        return { total: 0, documents: [] }
      }
    }

    async function fetchStats() {
      try {
        const db = getDatabases()
        const projects = await safeList(db, COLLECTIONS.PROJECTS)

        // Separate parents/standalone from regions
        const allDocs = projects.documents
        const parents = allDocs.filter((p) => !p.parentProjectId)
        const regions = allDocs.filter((p) => !!p.parentProjectId)

        // Stats: count only parents/standalone to avoid double counting
        const activeParents = parents.filter((p) => p.status === 'active').length
        const totalKeywords = allDocs.reduce(
          (sum, p) => sum + ((p.totalKeywords as number) || 0), 0
        )
        const totalIndexed = allDocs.reduce(
          (sum, p) => sum + ((p.totalIndexed as number) || 0), 0
        )

        setStats({
          totalProjects: parents.length,
          totalKeywords,
          totalIndexed,
          activeProjects: activeParents,
        })

        // Fetch running indexing jobs
        const runningJobs = await safeList(db, COLLECTIONS.INDEXING_JOBS, [
          Query.equal('status', 'running'),
          Query.limit(100),
        ])

        // Group running jobs by parent project
        const groupMap = new Map<string, IndexingGroup>()

        for (const job of runningJobs.documents) {
          const proj = allDocs.find((p) => p.$id === job.projectId)
          if (!proj) continue

          const parentId = (proj.parentProjectId as string) || proj.$id
          const parent = parents.find((p) => p.$id === parentId) || proj

          if (!groupMap.has(parentId)) {
            groupMap.set(parentId, {
              parentId,
              parentName: parent.name as string,
              domain: (parent.domain as string).replace(/\/$/, ''),
              regions: [],
              totalProcessed: 0,
              totalUrls: 0,
            })
          }

          const group = groupMap.get(parentId)!
          const processed = (job.successUrls as number) + (job.failedUrls as number)
          const total = job.totalUrls as number
          group.regions.push({
            id: proj.$id,
            name: proj.name as string,
            processed,
            total,
          })
          group.totalProcessed += processed
          group.totalUrls += total
        }

        setIndexingGroups(Array.from(groupMap.values()))
      } catch {
        setError('No se pudieron cargar las estadisticas.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasProjects = stats && stats.totalProjects > 0

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {hasProjects ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Proyectos"
              value={stats.totalProjects}
              icon={FolderKanban}
              description="Proyectos principales"
            />
            <StatCard
              title="Total Keywords"
              value={stats.totalKeywords.toLocaleString()}
              icon={Key}
              description="Keywords configuradas"
            />
            <StatCard
              title="Total Indexadas"
              value={stats.totalIndexed.toLocaleString()}
              icon={Globe}
              description="URLs indexadas exitosamente"
              valueColor="text-green-600"
            />
            <StatCard
              title="Proyectos Activos"
              value={stats.activeProjects}
              icon={Activity}
              description="En ejecucion actualmente"
            />
          </div>

          {/* Running indexing - grouped by parent */}
          {indexingGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Proyectos en indexacion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {indexingGroups.map((group) => {
                  const pct = group.totalUrls > 0 ? Math.round((group.totalProcessed / group.totalUrls) * 100) : 0
                  return (
                    <div key={group.parentId} className="space-y-2">
                      <div
                        className="flex items-center gap-4 cursor-pointer hover:bg-muted/30 rounded-lg p-2 -mx-2"
                        onClick={() => router.push(`/dashboard/projects/${group.parentId}?tab=indexing`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{group.parentName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {group.domain}
                            {group.regions.length > 1 && (
                              <span className="ml-2">
                                <MapPin className="inline h-3 w-3 mr-0.5" />
                                {group.regions.length} regiones
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-32">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-medium w-10 text-right">{pct}%</span>
                          <Badge variant="outline" className="text-xs">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            En curso
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
