'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Loader2, Activity } from 'lucide-react'
import Link from 'next/link'
import { Query } from 'appwrite'
import { getDatabases } from '@/shared/lib/appwrite-client'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProjectIndexingRow {
  id: string
  name: string
  domain: string
  totalKeywords: number
  indexed: number
  pending: number
  failed: number
  status: 'completed' | 'running' | 'stopped' | 'pending' | 'no_job'
  lastRun: string | null
}

export default function IndexingPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ProjectIndexingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const db = getDatabases()
        const projects = await db.listDocuments(DATABASE_ID, COLLECTIONS.PROJECTS, [
          Query.limit(100),
        ])

        const results: ProjectIndexingRow[] = []

        for (const p of projects.documents) {
          const projectId = p.$id
          const totalKw = (p.totalKeywords as number) || 0
          const indexed = (p.totalIndexed as number) || 0

          // Get latest indexing job for status and failed count
          const jobs = await db.listDocuments(DATABASE_ID, COLLECTIONS.INDEXING_JOBS, [
            Query.equal('projectId', projectId),
            Query.orderDesc('$createdAt'),
            Query.limit(1),
          ])

          const job = jobs.documents[0]
          const jobStatus = job
            ? (job.status as string) as ProjectIndexingRow['status']
            : 'no_job'
          const failed = job ? (job.failedUrls as number) || 0 : 0

          results.push({
            id: projectId,
            name: p.name as string,
            domain: (p.domain as string).replace(/\/$/, ''),
            totalKeywords: totalKw,
            indexed,
            pending: Math.max(0, totalKw - indexed - failed),
            failed,
            status: jobStatus,
            lastRun: job?.startedAt as string | null,
          })
        }

        setRows(results)
      } catch (err) {
        console.error('Failed to load indexing data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    completed: { label: 'Completado', variant: 'default' },
    running: { label: 'En progreso', variant: 'outline' },
    stopped: { label: 'Detenido', variant: 'secondary' },
    pending: { label: 'Pendiente', variant: 'secondary' },
    no_job: { label: 'Sin iniciar', variant: 'secondary' },
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Indexacion</h1>
          <Link
            href="/dashboard/indexing/status"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Activity className="h-4 w-4" />
            Estado en tiempo real
          </Link>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indexacion</h1>
        <Link
          href="/dashboard/indexing/status"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Activity className="h-4 w-4" />
          Estado en tiempo real
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay proyectos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Proyectos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{rows.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">URLs Indexadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {rows.reduce((s, r) => s + r.indexed, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">URLs Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {rows.reduce((s, r) => s + r.pending, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">En Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {rows.filter((r) => r.status === 'running').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Projects table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Proyecto</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dominio</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Indexadas</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Pendientes</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Fallidas</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ultimo envio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const cfg = statusConfig[row.status] || statusConfig.no_job
                      return (
                        <tr
                          key={row.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => router.push(`/dashboard/projects/${row.id}?tab=indexing`)}
                        >
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{row.domain}</td>
                          <td className="px-4 py-3 text-center">{row.totalKeywords.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-green-600 font-medium">
                            {row.indexed.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">{row.pending.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            {row.failed > 0 ? (
                              <span className="text-red-500 font-medium">{row.failed.toLocaleString()}</span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={cfg.variant} className="text-xs">
                              {row.status === 'running' && (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              )}
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {row.lastRun ? new Date(row.lastRun).toLocaleString() : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
