'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '../hooks/useAuth'

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'El codigo debe tener exactamente 6 digitos')
    .regex(/^\d+$/, 'El codigo solo puede contener numeros'),
})

interface Props {
  challengeId: string
  onSuccess: () => void
}

export function TwoFactorVerify({ challengeId, onSuccess }: Props) {
  const { confirmMfaLogin, isLoading } = useAuth()
  const { toast } = useToast()
  const [otp, setOtp] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)

    const parsed = otpSchema.safeParse({ otp })
    if (!parsed.success) {
      setFieldError(parsed.error.errors[0].message)
      return
    }

    try {
      await confirmMfaLogin(otp)
      toast({
        title: 'Verificacion exitosa',
        description: 'Has iniciado sesion correctamente.',
      })
      onSuccess()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Codigo incorrecto. Intentalo de nuevo.'
      toast({
        title: 'Error de verificacion',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Suppress unused warning — challengeId is used by confirmMfaLogin via the store
  void challengeId

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp">Codigo de autenticacion</Label>
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '')
            setOtp(value)
            setFieldError(null)
          }}
          className="text-center tracking-widest text-lg"
          autoComplete="one-time-code"
          autoFocus
        />
        {fieldError && (
          <p className="text-sm text-destructive">{fieldError}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
        {isLoading ? 'Verificando...' : 'Verificar'}
      </Button>
    </form>
  )
}
