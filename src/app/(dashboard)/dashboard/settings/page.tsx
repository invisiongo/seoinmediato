'use client'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { TwoFactorSetup } from '@/features/auth/components/TwoFactorSetup'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, ShieldOff, User } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configuracion</h1>

      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Informacion de cuenta</CardTitle>
          </div>
          <CardDescription>Datos de tu cuenta en SEOImediato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nombre</span>
            <span className="text-sm font-medium">{user?.name ?? '—'}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Correo electronico</span>
            <span className="text-sm font-medium">{user?.email ?? '—'}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado 2FA</span>
            {user?.mfa ? (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Activo
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <ShieldOff className="h-3 w-3" aria-hidden="true" />
                Inactivo
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Autenticacion de dos factores</CardTitle>
          </div>
          <CardDescription>
            Protege tu cuenta con una capa adicional de seguridad mediante una aplicacion autenticadora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.mfa ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold">Autenticacion de dos factores activada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tu cuenta esta protegida. Se te pedira un codigo cada vez que inicies sesion.
              </p>
            </div>
          ) : (
            <TwoFactorSetup />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
