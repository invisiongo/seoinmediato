'use client'

import { KeywordGenerator } from '@/features/keywords/components/KeywordGenerator'

export default function KeywordsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Generador de Keywords</h1>
      <KeywordGenerator />
    </div>
  )
}
