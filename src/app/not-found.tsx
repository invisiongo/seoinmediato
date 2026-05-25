import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <p className="mt-4 text-xl font-semibold text-foreground">
          Pagina no encontrada
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  )
}
