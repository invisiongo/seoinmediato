'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Sidebar } from '@/features/dashboard/components/Sidebar'

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { checkAuth } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    checkAuth().finally(() => setReady(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-b-primary"
          role="status"
          aria-label="Cargando"
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        <div className="pt-14 lg:pt-0" />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
