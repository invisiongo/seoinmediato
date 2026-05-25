'use client'

import { useState } from 'react'
import { Check, Circle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Project } from '../types'
import { projectNameToSlug, getPublicBase } from '@/shared/lib/seo-urls'

interface WizardStep {
  number: number
  title: string
  completed: boolean
  manual?: boolean
  instructions?: string
}

interface ProjectWizardProps {
  project: Project
  hasArticle: boolean
  hasTokens: boolean
  hasIndexingJob: boolean
  onMarkCompleted: (step: number) => void
}

export function ProjectWizard({
  project,
  hasArticle,
  hasTokens,
  hasIndexingJob,
  onMarkCompleted,
}: ProjectWizardProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  const wizardState: Record<string, boolean> = (() => {
    try {
      return JSON.parse(project.wizardState || '{}')
    } catch {
      return {}
    }
  })()

  const steps: WizardStep[] = [
    {
      number: 1,
      title: 'Datos del negocio',
      completed: !!(project.businessName && project.niche),
    },
    {
      number: 2,
      title: 'Generar contenido SEO',
      completed: hasArticle,
    },
    {
      number: 3,
      title: 'Importar keywords',
      completed: project.totalKeywords > 0,
    },
    {
      number: 4,
      title: 'Crear token en Google Cloud',
      completed: hasTokens,
      manual: true,
      instructions: `1. Ve a console.cloud.google.com
2. Crea un nuevo proyecto (ej: InvisionMX)
3. En el buscador, busca "Web Search Indexing API" y activala
4. Ve a "IAM y administracion" → "Cuentas de servicio"
5. Crea una nueva cuenta de servicio
6. Copia el email generado (algo como nombre@proyecto.iam.gserviceaccount.com)
7. Haz clic en la cuenta → "Claves" → "Agregar clave" → "JSON" → Descargar
8. Regresa aqui y pega el contenido del archivo JSON descargado en el Paso 5`,
    },
    {
      number: 5,
      title: 'Pegar token en SEOImediato',
      completed: hasTokens,
    },
    {
      number: 6,
      title: 'Verificar en Google Search Console',
      completed: !!wizardState['step6'],
      manual: true,
      instructions: `1. Ve a search.google.com/search-console
2. Agrega la propiedad: ${project.domain}
3. Verifica mediante DNS (agrega el registro TXT en Cloudflare)
4. Una vez verificado, ve a "Configuracion" → "Usuarios y permisos"
5. Agrega el email de la cuenta de servicio (del Paso 4) como PROPIETARIO
6. Regresa aqui y marca este paso como completado`,
    },
    {
      number: 7,
      title: 'Enviar Sitemap',
      completed: !!wizardState['step7'],
      manual: true,
      instructions: `1. En Google Search Console, ve a "Sitemaps"
2. Agrega: ${getPublicBase(project)}/sitemap-${projectNameToSlug(project.name)}.xml
3. Google comenzara a procesar las URLs
4. Regresa aqui y marca este paso como completado`,
    },
    {
      number: 8,
      title: 'Iniciar indexacion',
      completed: hasIndexingJob,
    },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const currentStep = steps.find(s => !s.completed)?.number ?? steps.length
  const progress = Math.round((completedCount / steps.length) * 100)

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        {/* Progress bar (always visible) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Wizard: {completedCount}/{steps.length} pasos
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                {progress}%
              </Badge>
              {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </button>

        {/* Steps (collapsible) */}
        {!isCollapsed && <div className="space-y-1 mt-4">
          {steps.map((step) => {
            const isCurrent = step.number === currentStep && !step.completed
            const isExpanded = expandedStep === step.number

            return (
              <div key={step.number}>
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    isCurrent
                      ? 'bg-primary/10 text-primary font-medium'
                      : step.completed
                      ? 'text-muted-foreground'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  {/* Step indicator */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.completed
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.completed ? <Check className="h-3.5 w-3.5" /> : step.number}
                  </div>

                  <span className="flex-1">{step.title}</span>

                  {step.completed && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                      Completado
                    </Badge>
                  )}

                  {(step.instructions || step.manual) && (
                    isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {/* Expanded instructions */}
                {isExpanded && step.instructions && (
                  <div className="ml-12 mt-2 mb-3 p-3 bg-muted/50 rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
                      {step.instructions}
                    </pre>
                    {step.manual && !step.completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={(e) => {
                          e.stopPropagation()
                          onMarkCompleted(step.number)
                        }}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Marcar como completado
                      </Button>
                    )}
                    {step.number === 4 && (
                      <Button size="sm" variant="link" className="mt-3 ml-2" asChild>
                        <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Abrir Google Cloud Console
                        </a>
                      </Button>
                    )}
                    {step.number === 6 && (
                      <Button size="sm" variant="link" className="mt-3 ml-2" asChild>
                        <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Abrir Search Console
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>}
      </CardContent>
    </Card>
  )
}
