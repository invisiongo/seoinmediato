'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProjectList } from '@/features/projects/components/ProjectList'
import { ProjectForm } from '@/features/projects/components/ProjectForm'
import * as projectService from '@/features/projects/services/projectService'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Project, ProjectFormData } from '@/features/projects/types'

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadProjects = async () => {
    try {
      const data = await projectService.listProjects()
      setProjects(data)
    } catch {
      toast.error('Error al cargar proyectos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleCreate = async (data: ProjectFormData) => {
    try {
      const userId = user?.$id ?? 'anonymous'
      await projectService.createProject(data, userId)
      toast.success('Proyecto creado')
      setShowForm(false)
      loadProjects()
    } catch {
      toast.error('Error al crear proyecto')
    }
  }

  const handleUpdate = async (data: ProjectFormData) => {
    if (!editing) return
    try {
      await projectService.updateProject(editing.$id, data)
      toast.success('Proyecto actualizado')
      setEditing(null)
      loadProjects()
    } catch {
      toast.error('Error al actualizar proyecto')
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/projects/${id}/keywords`, { method: 'DELETE' })
      await projectService.deleteProject(id)
      toast.success('Proyecto eliminado')
      setConfirmDeleteId(null)
      loadProjects()
    } catch {
      toast.error('Error al eliminar proyecto')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Proyectos</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proyectos</h1>
        {!showForm && !editing && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proyecto
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ProjectForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <ProjectForm
            project={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <ProjectList
        projects={projects.filter((p) => !p.parentProjectId)}
        onEdit={(p) => {
          setEditing(p)
          setShowForm(false)
        }}
        onDelete={handleDelete}
        confirmDeleteId={confirmDeleteId}
        deletingId={deletingId}
        onRequestDelete={(id) => setConfirmDeleteId(id)}
        onCancelDelete={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
