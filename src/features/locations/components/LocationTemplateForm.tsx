'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LocationTemplate, LocationTemplateFormData } from '../types'

interface Props {
  template?: LocationTemplate | null
  onSubmit: (data: LocationTemplateFormData) => Promise<void>
  onCancel: () => void
}

export function LocationTemplateForm({ template, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(template?.name ?? '')
  const [country, setCountry] = useState(template?.country ?? '')
  const [locations, setLocations] = useState(template?.locations ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const locationCount = locations
    .split('\n')
    .filter((l) => l.trim()).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({ name, country, locations })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template ? 'Editar template' : 'Nuevo template de ubicaciones'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del template</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Quito Norte - Sectores"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pais</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ej: Ecuador"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="locations">Ubicaciones (una por linea)</Label>
              <span className="text-xs text-muted-foreground">
                {locationCount} ubicaciones
              </span>
            </div>
            <Textarea
              id="locations"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              placeholder="Ej: Quito&#10;Guayaquil&#10;Cuenca&#10;Ambato"
              rows={10}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : template ? 'Actualizar' : 'Crear template'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
