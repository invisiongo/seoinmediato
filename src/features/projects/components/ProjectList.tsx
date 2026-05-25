'use client'

import Link from 'next/link'
import { FolderKanban, Pencil, Trash2, Globe, Key, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Project } from '../types'

interface Props {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  confirmDeleteId: string | null
  deletingId: string | null
  onRequestDelete: (id: string) => void
  onCancelDelete: () => void
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Activo', variant: 'default' },
  paused: { label: 'Pausado', variant: 'secondary' },
  completed: { label: 'Completado', variant: 'outline' },
}

export function ProjectList({ projects, onEdit, onDelete, confirmDeleteId, deletingId, onRequestDelete, onCancelDelete }: Props) {
  // Separate parent/standalone projects from regions
  const topLevel = projects.filter(p => !p.parentProjectId)
  const regionsByParent = new Map<string, Project[]>()

  for (const p of projects) {
    if (p.parentProjectId) {
      const existing = regionsByParent.get(p.parentProjectId) || []
      existing.push(p)
      regionsByParent.set(p.parentProjectId, existing)
    }
  }

  if (topLevel.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FolderKanban className="mb-4 h-14 w-14 text-muted-foreground" aria-hidden="true" />
          <h2 className="mb-2 text-lg font-semibold">No hay proyectos aun</h2>
          <p className="text-sm text-muted-foreground">
            Crea tu primer proyecto para comenzar a gestionar tus keywords e indexacion SEO.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {topLevel.map((project) => {
        const status = statusConfig[project.status] ?? statusConfig.active
        const regions = regionsByParent.get(project.$id) || []
        const isParent = regions.length > 0
        const totalKw = isParent
          ? regions.reduce((sum, r) => sum + r.totalKeywords, 0)
          : project.totalKeywords
        const totalIdx = isParent
          ? regions.reduce((sum, r) => sum + r.totalIndexed, 0)
          : project.totalIndexed

        return (
          <div key={project.$id}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/projects/${project.$id}`}
                    className="hover:underline"
                  >
                    <CardTitle className="text-base truncate">{project.name}</CardTitle>
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground truncate">{project.domain}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isParent && (
                    <Badge variant="outline">
                      <MapPin className="mr-1 h-3 w-3" />
                      {regions.length} regiones
                    </Badge>
                  )}
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {project.niche && (
                  <p className="mb-3 text-xs text-muted-foreground">Nicho: {project.niche}</p>
                )}
                <div className="mb-4 flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Key className="h-3 w-3" />
                    {totalKw.toLocaleString()} keywords
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {totalIdx.toLocaleString()} indexadas
                  </span>
                </div>
                {confirmDeleteId === project.$id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive font-medium">¿Eliminar?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === project.$id}
                      onClick={() => onDelete(project.$id)}
                    >
                      {deletingId === project.$id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Si, eliminar
                    </Button>
                    <Button size="sm" variant="outline" onClick={onCancelDelete}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/projects/${project.$id}`}>
                        Ver detalle
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEdit(project)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRequestDelete(project.$id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )
      })}
    </div>
  )
}
