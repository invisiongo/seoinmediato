'use client'

import { MapPin, Pencil, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { LocationTemplate } from '../types'

interface Props {
  templates: LocationTemplate[]
  onEdit: (template: LocationTemplate) => void
  onDelete: (id: string) => void
  onDuplicate: (template: LocationTemplate) => void
  confirmDeleteId: string | null
  onRequestDelete: (id: string) => void
  onCancelDelete: () => void
}

export function LocationTemplateList({ templates, onEdit, onDelete, onDuplicate, confirmDeleteId, onRequestDelete, onCancelDelete }: Props) {
  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <MapPin className="mb-4 h-14 w-14 text-muted-foreground" aria-hidden="true" />
          <h2 className="mb-2 text-lg font-semibold">No hay templates de ubicaciones</h2>
          <p className="text-sm text-muted-foreground">
            Crea tu primer template para reutilizar ubicaciones en el generador de keywords.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const count = template.locations.split('\n').filter((l) => l.trim()).length
        return (
          <Card key={template.$id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{template.country}</p>
              </div>
              <Badge variant="secondary">{count} ubicaciones</Badge>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-muted-foreground line-clamp-3">
                {template.locations.split('\n').filter((l) => l.trim()).slice(0, 5).join(', ')}
                {count > 5 && '...'}
              </p>
              {confirmDeleteId === template.$id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive font-medium">¿Seguro?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(template.$id)}
                  >
                    Si, eliminar
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelDelete}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDuplicate(template)}>
                    <Copy className="mr-1 h-3 w-3" />
                    Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRequestDelete(template.$id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Eliminar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
