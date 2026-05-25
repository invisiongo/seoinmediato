'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LocationTemplateList } from '@/features/locations/components/LocationTemplateList'
import { LocationTemplateForm } from '@/features/locations/components/LocationTemplateForm'
import * as locationService from '@/features/locations/services/locationService'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { LocationTemplate, LocationTemplateFormData } from '@/features/locations/types'

export default function LocationsPage() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<LocationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LocationTemplate | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadTemplates = async () => {
    try {
      const data = await locationService.listTemplates()
      setTemplates(data)
    } catch {
      toast.error('Error al cargar templates')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleCreate = async (data: LocationTemplateFormData) => {
    try {
      const userId = user?.$id ?? 'anonymous'
      await locationService.createTemplate(data, userId)
      toast.success('Template creado')
      setShowForm(false)
      loadTemplates()
    } catch {
      toast.error('Error al crear template')
    }
  }

  const handleUpdate = async (data: LocationTemplateFormData) => {
    if (!editing) return
    try {
      await locationService.updateTemplate(editing.$id, data)
      toast.success('Template actualizado')
      setEditing(null)
      loadTemplates()
    } catch {
      toast.error('Error al actualizar template')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await locationService.deleteTemplate(id)
      toast.success('Template eliminado')
      setConfirmDeleteId(null)
      loadTemplates()
    } catch {
      toast.error('Error al eliminar template')
    }
  }

  const handleDuplicate = async (template: LocationTemplate) => {
    try {
      const userId = user?.$id ?? 'anonymous'
      await locationService.createTemplate(
        {
          name: `${template.name} (copia)`,
          country: template.country,
          locations: template.locations,
        },
        userId,
      )
      toast.success('Template duplicado')
      loadTemplates()
    } catch {
      toast.error('Error al duplicar template')
    }
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Ubicaciones</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ubicaciones</h1>
        {!showForm && !editing && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo template
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <LocationTemplateForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <LocationTemplateForm
            template={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <LocationTemplateList
        templates={templates}
        onEdit={(t) => {
          setEditing(t)
          setShowForm(false)
        }}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        confirmDeleteId={confirmDeleteId}
        onRequestDelete={(id) => setConfirmDeleteId(id)}
        onCancelDelete={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
