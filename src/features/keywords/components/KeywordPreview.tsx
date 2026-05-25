'use client'

import { useState } from 'react'
import { Download, Save, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GeneratedKeyword } from '../services/keywordService'
import { exportToTxt, exportToCsv } from '../services/keywordService'

interface Props {
  keywords: GeneratedKeyword[]
  domain: string
  isSaving: boolean
  saveProgress: { saved: number; total: number } | null
  onSave: () => void
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function KeywordPreview({ keywords, domain, isSaving, saveProgress, onSave }: Props) {
  const [showAll, setShowAll] = useState(false)

  const displayLimit = 500
  const previewText = showAll
    ? keywords.map((k) => k.keyword).join('\n')
    : keywords
        .slice(0, displayLimit)
        .map((k) => k.keyword)
        .join('\n')

  const handleExportTxt = () => {
    downloadFile(exportToTxt(keywords), 'keywords.txt', 'text/plain')
  }

  const handleExportCsv = () => {
    downloadFile(exportToCsv(keywords, domain), 'keywords.csv', 'text/csv')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          Vista previa ({keywords.length.toLocaleString()} keywords)
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportTxt}>
            <FileText className="mr-1 h-3 w-3" />
            TXT
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            <Download className="mr-1 h-3 w-3" />
            CSV
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-1 h-3 w-3" />
                Guardar en proyecto
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {saveProgress && (
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Guardando keywords...</span>
              <span>
                {saveProgress.saved.toLocaleString()} de {saveProgress.total.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(saveProgress.saved / saveProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <Textarea
          readOnly
          value={previewText}
          rows={20}
          className="font-mono text-xs"
        />

        {keywords.length > displayLimit && !showAll && (
          <Button
            variant="link"
            size="sm"
            className="mt-2"
            onClick={() => setShowAll(true)}
          >
            Mostrar todas ({keywords.length.toLocaleString()} keywords)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
