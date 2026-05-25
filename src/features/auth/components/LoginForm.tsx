'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { TwoFactorVerify } from './TwoFactorVerify'

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electronico valido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
})

type FieldErrors = Partial<Record<'email' | 'password', string>>

export function LoginForm() {
  const router = useRouter()
  const { login, isLoading, needsMfa, mfaChallengeId } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors
        errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    try {
      await login({ email, password })
      if (!needsMfa) {
        router.push('/dashboard')
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Credenciales incorrectas. Intentalo de nuevo.'
      toast.error(message)
    }
  }

  const handleMfaSuccess = () => {
    router.push('/dashboard')
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Iniciar sesion</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>

      <CardContent>
        {needsMfa && mfaChallengeId ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tu cuenta tiene autenticacion de dos factores habilitada. Ingresa el codigo de tu aplicacion de autenticacion.
            </p>
            <TwoFactorVerify
              challengeId={mfaChallengeId}
              onSuccess={handleMfaSuccess}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }}
                autoComplete="email"
                autoFocus
              />
              {fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                autoComplete="current-password"
              />
              {fieldErrors.password && (
                <p className="text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </Button>

          </form>
        )}
      </CardContent>
    </Card>
  )
}
