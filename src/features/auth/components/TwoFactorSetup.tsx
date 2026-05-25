'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
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

type SetupStep = 'idle' | 'qr' | 'verify' | 'success'

export function TwoFactorSetup() {
  const { setupMfa, verifyMfa, isLoading } = useAuth()
  const { toast } = useToast()

  const [step, setStep] = useState<SetupStep>('idle')
  const [secret, setSecret] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)

  const handleInitSetup = async () => {
    try {
      const { secret: mfaSecret, uri } = await setupMfa()
      setSecret(mfaSecret)

      const dataUrl = await QRCode.toDataURL(uri, {
        width: 200,
        margin: 2,
        color: { dark: '#ffffff', light: '#00000000' },
      })
      setQrDataUrl(dataUrl)
      setStep('qr')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar la configuracion.'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError(null)

    const parsed = otpSchema.safeParse({ otp })
    if (!parsed.success) {
      setOtpError(parsed.error.errors[0].message)
      return
    }

    try {
      await verifyMfa(otp)
      setStep('success')
      toast({
        title: 'Autenticacion de dos factores activada',
        description: 'Tu cuenta ahora esta protegida con 2FA.',
      })
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

  if (step === 'success') {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
        <p className="font-semibold text-sm">Autenticacion de dos factores activada</p>
        <p className="text-sm text-muted-foreground">
          Tu cuenta esta protegida con autenticacion de dos factores. Se te pedira un codigo cada vez que inicies sesion.
        </p>
      </div>
    )
  }

  if (step === 'idle') {
    return (
      <Button onClick={handleInitSetup} disabled={isLoading} variant="outline">
        {isLoading ? 'Configurando...' : 'Activar autenticacion de dos factores'}
      </Button>
    )
  }

  return (
    <div className="space-y-6">
      {step === 'qr' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">1. Escanea el codigo QR</p>
            <p className="text-sm text-muted-foreground">
              Abre tu aplicacion de autenticacion (Google Authenticator, Authy, etc.) y escanea el siguiente codigo.
            </p>
            {qrDataUrl && (
              <div className="flex justify-center rounded-lg border border-border bg-background p-4">
                <img
                  src={qrDataUrl}
                  alt="Codigo QR para autenticacion de dos factores"
                  width={200}
                  height={200}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              ¿No puedes escanear el QR? Ingresa este codigo manualmente:
            </p>
            <div className="rounded-md border border-border bg-muted px-3 py-2">
              <code className="break-all text-xs font-mono text-muted-foreground">
                {secret}
              </code>
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => setStep('verify')}
          >
            Continuar
          </Button>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">2. Verifica el codigo</p>
            <p className="text-sm text-muted-foreground">
              Ingresa el codigo de 6 digitos que muestra tu aplicacion de autenticacion.
            </p>
            <Label htmlFor="otp-setup">Codigo de verificacion</Label>
            <Input
              id="otp-setup"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setOtp(value)
                setOtpError(null)
              }}
              className="text-center tracking-widest text-lg"
              autoComplete="one-time-code"
              autoFocus
            />
            {otpError && (
              <p className="text-sm text-destructive">{otpError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep('qr')}
              disabled={isLoading}
            >
              Atras
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verificando...' : 'Activar 2FA'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
