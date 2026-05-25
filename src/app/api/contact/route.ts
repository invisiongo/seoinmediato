import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { findProjectsByDomain } from '@/features/sites/services/projectLookup'
import { sendMail, SmtpConfig } from '@/shared/lib/smtp'

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Contact form handler.
 *
 * Multi-tenant: resolves SMTP config + destination email per domain.
 * Priority order:
 *   1. project_landing fields (smtpHost, smtpPort, smtpUser, smtpPass, contactToEmail)
 *   2. Env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO_EMAIL)
 *
 * Per-domain config in Appwrite takes priority so adding a new client doesn't
 * require a redeploy — just fill the fields on project_landing.
 */
async function resolveConfigForDomain(host: string): Promise<{ config: SmtpConfig | null; to: string | null }> {
  try {
    const projects = await findProjectsByDomain(host)
    if (projects.length === 0) return { config: null, to: null }

    const parent = projects.find(p => !p.parentProjectId) || projects[0]
    const landingResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      [Query.equal('projectId', parent.$id as string), Query.limit(1)]
    )

    if (landingResult.documents.length === 0) return { config: null, to: null }
    const landing = landingResult.documents[0] as Record<string, unknown>

    const smtpHost = landing.smtpHost as string | undefined
    const smtpUser = landing.smtpUser as string | undefined
    const smtpPass = landing.smtpPass as string | undefined
    const smtpPort = landing.smtpPort as number | string | undefined
    const contactToEmail = landing.contactToEmail as string | undefined

    if (smtpHost && smtpUser && smtpPass) {
      return {
        config: {
          host: smtpHost,
          port: typeof smtpPort === 'number' ? smtpPort : parseInt(String(smtpPort || '465'), 10),
          user: smtpUser,
          pass: smtpPass,
          from: (landing.smtpFrom as string | undefined) || smtpUser,
        },
        to: contactToEmail || smtpUser,
      }
    }

    return { config: null, to: contactToEmail || null }
  } catch {
    return { config: null, to: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const payload = {
      timestamp: new Date().toISOString(),
      host: request.headers.get('x-forwarded-host') || request.headers.get('host') || '',
      keyword: String(formData.get('keyword') || ''),
      location: String(formData.get('location') || ''),
      name: String(formData.get('name') || '').trim(),
      company: String(formData.get('company') || '').trim(),
      website: String(formData.get('website') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      terms: formData.get('terms') === 'on' || formData.get('terms') === 'true',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      userAgent: request.headers.get('user-agent') || '',
    }

    if (!payload.name || !payload.email || !payload.phone || !payload.company) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    if (!payload.terms) {
      return NextResponse.json(
        { ok: false, error: 'Debes aceptar la política de privacidad' },
        { status: 400 }
      )
    }

    const resolved = await resolveConfigForDomain(payload.host)
    if (!resolved.config || !resolved.to) {
      console.error('Contact form: no SMTP config in project_landing for', payload.host)
      return NextResponse.json(
        { ok: false, error: 'Configuración de correo no encontrada para este dominio' },
        { status: 500 }
      )
    }
    const toEmail = resolved.to

    const subject = `Nuevo lead${payload.location ? ` · ${payload.location}` : ''}${payload.keyword ? ` · ${payload.keyword}` : ''}`

    const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0a0a0f;color:#fff;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;color:#4da3ff">📩 Nuevo Lead · ${escapeHtml(payload.host)}</h2>
    <p style="margin:8px 0 0;font-size:13px;color:#c9d6e8">Llegó desde el formulario de la página web</p>
  </div>
  <div style="background:#f7f9fc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e1e5eb;border-top:none">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#666;width:120px"><strong>Nombre:</strong></td><td style="padding:8px 0">${escapeHtml(payload.name)}</td></tr>
      <tr><td style="padding:8px 0;color:#666"><strong>Empresa:</strong></td><td style="padding:8px 0">${escapeHtml(payload.company)}</td></tr>
      ${payload.website ? `<tr><td style="padding:8px 0;color:#666"><strong>Web/Redes:</strong></td><td style="padding:8px 0">${escapeHtml(payload.website)}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#666"><strong>Teléfono:</strong></td><td style="padding:8px 0"><a href="tel:${escapeHtml(payload.phone)}" style="color:#007bff">${escapeHtml(payload.phone)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#666"><strong>Email:</strong></td><td style="padding:8px 0"><a href="mailto:${escapeHtml(payload.email)}" style="color:#007bff">${escapeHtml(payload.email)}</a></td></tr>
      ${payload.message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top"><strong>Mensaje:</strong></td><td style="padding:8px 0;white-space:pre-wrap">${escapeHtml(payload.message)}</td></tr>` : ''}
    </table>
    <hr style="border:none;border-top:1px solid #e1e5eb;margin:20px 0">
    <h3 style="margin:0 0 12px;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:1px">Contexto SEO</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:#666">
      ${payload.keyword ? `<tr><td style="padding:4px 0;width:120px"><strong>Keyword:</strong></td><td style="padding:4px 0">${escapeHtml(payload.keyword)}</td></tr>` : ''}
      ${payload.location ? `<tr><td style="padding:4px 0"><strong>Ubicación:</strong></td><td style="padding:4px 0">${escapeHtml(payload.location)}</td></tr>` : ''}
      <tr><td style="padding:4px 0"><strong>Página:</strong></td><td style="padding:4px 0">${escapeHtml(payload.host)}</td></tr>
      <tr><td style="padding:4px 0"><strong>Fecha:</strong></td><td style="padding:4px 0">${escapeHtml(payload.timestamp)}</td></tr>
      <tr><td style="padding:4px 0"><strong>IP:</strong></td><td style="padding:4px 0">${escapeHtml(payload.ip)}</td></tr>
    </table>
  </div>
</body></html>`

    const result = await sendMail({
      to: toEmail,
      subject,
      html,
      replyTo: payload.email,
      config: resolved.config,
    })

    if (!result.ok) {
      console.error('Contact form SMTP error:', result.error, 'host:', payload.host)
      const debug = request.nextUrl.searchParams.get('debug') === '1'
      return NextResponse.json(
        {
          ok: false,
          error: 'Error enviando el mensaje. Inténtalo de nuevo.',
          ...(debug ? { smtpError: result.error } : {}),
        },
        { status: 500 }
      )
    }

    console.log('[CONTACT FORM] sent', { host: payload.host, to: toEmail, messageId: result.messageId, email: payload.email })
    return NextResponse.json({ ok: true, message: 'Formulario recibido' })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { ok: false, error: 'Error procesando el formulario' },
      { status: 500 }
    )
  }
}
