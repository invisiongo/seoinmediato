import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { findProjectsByDomain } from '@/features/sites/services/projectLookup'
import { sendMail, SmtpConfig } from '@/shared/lib/smtp'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface TenantConfig {
  bot: { systemPrompt: string; model: string; apiKey: string; sendSummary: boolean; assistantName: string }
  smtp: SmtpConfig | null
  contactToEmail: string | null
}

async function resolveTenantConfig(host: string): Promise<TenantConfig | null> {
  const projects = await findProjectsByDomain(host)
  if (projects.length === 0) return null

  const parent = projects.find(p => !p.parentProjectId) || projects[0]

  // Bot config lives in its own collection
  const botResult = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECT_BOT,
    [Query.equal('projectId', parent.$id as string), Query.limit(1)]
  )
  if (botResult.documents.length === 0) return null
  const bot = botResult.documents[0] as Record<string, unknown>

  const systemPrompt = bot.botSystemPrompt as string | undefined
  const apiKey = bot.botApiKey as string | undefined
  if (!systemPrompt || !apiKey) return null

  // SMTP config stays on project_landing
  const landingResult = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECT_LANDING,
    [Query.equal('projectId', parent.$id as string), Query.limit(1)]
  )
  const landing = landingResult.documents.length > 0
    ? landingResult.documents[0] as Record<string, unknown>
    : {} as Record<string, unknown>

  const smtpHost = landing.smtpHost as string | undefined
  const smtpUser = landing.smtpUser as string | undefined
  const smtpPass = landing.smtpPass as string | undefined
  const smtpPort = landing.smtpPort as number | string | undefined

  const smtp: SmtpConfig | null = smtpHost && smtpUser && smtpPass
    ? {
        host: smtpHost,
        port: typeof smtpPort === 'number' ? smtpPort : parseInt(String(smtpPort || '587'), 10),
        user: smtpUser,
        pass: smtpPass,
        from: (landing.smtpFrom as string | undefined) || smtpUser,
      }
    : null

  return {
    bot: {
      systemPrompt,
      model: (bot.botModel as string | undefined) || 'anthropic/claude-haiku-4.5',
      apiKey,
      sendSummary: bot.botSendSummary !== false,
      assistantName: (bot.botAssistantName as string | undefined) || 'Asistente',
    },
    smtp,
    contactToEmail: (landing.contactToEmail as string | undefined) || smtpUser || null,
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface LeadSummary {
  name: string
  company: string
  email: string
  phone: string
  location: string
  service: string
  timeline: string
  budget: string
  notes: string
  interestLevel: 'Alto' | 'Medio' | 'Bajo'
}

async function generateSummary(
  messages: ChatMessage[],
  apiKey: string,
  model: string
): Promise<LeadSummary | null> {
  const conversation = messages
    .map(m => `${m.role === 'user' ? 'CLIENTE' : 'BOT'}: ${m.content}`)
    .join('\n\n')

  const systemPrompt = `Eres un asistente que extrae información estructurada de una conversación entre un cliente y un bot de cualificación de leads.
Lee la conversación y devuelve SOLO un JSON válido con esta estructura exacta (sin markdown, sin texto adicional):
{
  "name": "nombre completo del cliente o '' si no se mencionó",
  "company": "empresa del cliente o ''",
  "email": "email del cliente o ''",
  "phone": "teléfono o ''",
  "location": "ciudad/provincia/país o ''",
  "service": "servicio o proyecto en que está interesado o ''",
  "timeline": "fecha aproximada del proyecto o ''",
  "budget": "presupuesto si lo mencionó espontáneamente o ''",
  "notes": "resumen breve (2-3 frases) de lo que pidió el cliente",
  "interestLevel": "Alto" | "Medio" | "Bajo"
}
Criterio interestLevel:
- Alto: preguntó por Sistema PAC, dio todos sus datos, pide llamada
- Medio: interesado pero aún explorando, datos incompletos
- Bajo: solo información general o no dejó datos de contacto`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: conversation },
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) return null
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content || ''
    const parsed = JSON.parse(content)
    return {
      name: String(parsed.name || ''),
      company: String(parsed.company || ''),
      email: String(parsed.email || ''),
      phone: String(parsed.phone || ''),
      location: String(parsed.location || ''),
      service: String(parsed.service || ''),
      timeline: String(parsed.timeline || ''),
      budget: String(parsed.budget || ''),
      notes: String(parsed.notes || ''),
      interestLevel: parsed.interestLevel === 'Alto' || parsed.interestLevel === 'Medio' || parsed.interestLevel === 'Bajo'
        ? parsed.interestLevel
        : 'Bajo',
    }
  } catch (err) {
    console.error('Summary generation error:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { messages?: ChatMessage[]; host?: string }
    const inputHost = body.host || request.headers.get('x-forwarded-host') || request.headers.get('origin') || request.headers.get('referer') || ''
    const host = inputHost.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
    const messages = Array.isArray(body.messages) ? body.messages : []

    if (!host || messages.length < 3) {
      return NextResponse.json({ ok: false, error: 'host and messages (min 3) required' }, { status: 400 })
    }

    const cfg = await resolveTenantConfig(host)
    if (!cfg || !cfg.bot.sendSummary) {
      return NextResponse.json({ ok: false, error: 'Summary disabled for this tenant' }, { status: 503 })
    }
    if (!cfg.smtp || !cfg.contactToEmail) {
      return NextResponse.json({ ok: false, error: 'SMTP not configured for this tenant' }, { status: 503 })
    }

    const summary = await generateSummary(messages, cfg.bot.apiKey, cfg.bot.model)
    if (!summary) {
      return NextResponse.json({ ok: false, error: 'Could not generate summary' }, { status: 500 })
    }

    // Skip sending if there's no meaningful lead info
    const hasContact = summary.email || summary.phone || summary.name || summary.company
    if (!hasContact) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no contact info' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const subject = `🔔 Nuevo lead desde el bot — ${summary.name || 'Sin nombre'}${summary.company ? ` · ${summary.company}` : ''} · ${today}`

    const conversationHtml = messages
      .map(m => `<p style="margin:6px 0;padding:8px 12px;border-radius:8px;background:${m.role === 'user' ? '#e9f1ff' : '#f5f5f7'};font-size:13px"><strong style="color:${m.role === 'user' ? '#007bff' : '#666'}">${m.role === 'user' ? 'Cliente' : 'Bot'}:</strong> ${escapeHtml(m.content)}</p>`)
      .join('')

    const interestColor = summary.interestLevel === 'Alto' ? '#00d27a' : summary.interestLevel === 'Medio' ? '#f59e0b' : '#94a3b8'

    const html = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:680px;margin:0 auto;padding:20px">
  <div style="background:#0a0a0f;color:#fff;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;color:#4da3ff">🔔 Nuevo lead desde el bot</h2>
    <p style="margin:8px 0 0;font-size:13px;color:#c9d6e8">${escapeHtml(host)} · ${new Date().toLocaleString('es-ES')}</p>
  </div>
  <div style="background:#f7f9fc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e1e5eb;border-top:none">
    <div style="display:inline-block;background:${interestColor};color:#fff;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:700;margin-bottom:16px">Interés ${summary.interestLevel}</div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:140px"><strong>Nombre:</strong></td><td style="padding:6px 0">${escapeHtml(summary.name || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666"><strong>Empresa:</strong></td><td style="padding:6px 0">${escapeHtml(summary.company || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666"><strong>Email:</strong></td><td style="padding:6px 0">${summary.email ? `<a href="mailto:${escapeHtml(summary.email)}" style="color:#007bff">${escapeHtml(summary.email)}</a>` : '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#666"><strong>Teléfono:</strong></td><td style="padding:6px 0">${summary.phone ? `<a href="tel:${escapeHtml(summary.phone)}" style="color:#007bff">${escapeHtml(summary.phone)}</a>` : '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#666"><strong>Localización:</strong></td><td style="padding:6px 0">${escapeHtml(summary.location || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666"><strong>Servicio:</strong></td><td style="padding:6px 0">${escapeHtml(summary.service || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666"><strong>Fecha proyecto:</strong></td><td style="padding:6px 0">${escapeHtml(summary.timeline || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666"><strong>Presupuesto:</strong></td><td style="padding:6px 0">${escapeHtml(summary.budget || '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666;vertical-align:top"><strong>Notas:</strong></td><td style="padding:6px 0">${escapeHtml(summary.notes || '—')}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e1e5eb;margin:20px 0">
    <h3 style="margin:0 0 12px;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:1px">Conversación completa</h3>
    <div style="max-height:500px;overflow:auto">${conversationHtml}</div>
  </div>
</body></html>`

    // 1) Email to the team
    const teamResult = await sendMail({
      to: cfg.contactToEmail,
      subject,
      html,
      replyTo: summary.email || undefined,
      config: cfg.smtp,
    })

    if (!teamResult.ok) {
      console.error('Bot summary team email error:', teamResult.error)
      return NextResponse.json({ ok: false, error: 'Error enviando resumen al equipo' }, { status: 500 })
    }

    // 2) Confirmation to the client (only if we captured their email)
    let clientMessageId: string | undefined = undefined
    if (summary.email && summary.name) {
      const clientSubject = `Hemos recibido tu consulta · ${cfg.bot.assistantName}`
      const clientHtml = `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0a0a0f;color:#fff;padding:24px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;color:#4da3ff">Gracias por habernos contactado</h2>
  </div>
  <div style="background:#f7f9fc;padding:28px 24px;border-radius:0 0 8px 8px;border:1px solid #e1e5eb;border-top:none">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hola <strong>${escapeHtml(summary.name.split(' ')[0])}</strong>,</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hemos recibido tu consulta a través del asistente virtual. <strong>En breve, alguien del equipo te contactará</strong> con los detalles de lo que comentaste en el chat.</p>
    ${summary.notes ? `<div style="background:#fff;border:1px solid #e1e5eb;border-radius:8px;padding:14px;margin:16px 0">
      <p style="margin:0 0 6px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;font-weight:700">Lo que nos comentaste</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#333">${escapeHtml(summary.notes)}</p>
    </div>` : ''}
    <p style="margin:16px 0 0;font-size:14px;color:#666;line-height:1.6">Si en cualquier momento necesitas contactarnos directamente, escríbenos a <a href="mailto:${escapeHtml(cfg.contactToEmail)}" style="color:#007bff">${escapeHtml(cfg.contactToEmail)}</a>.</p>
    <p style="margin:20px 0 0;font-size:13px;color:#999">Un saludo,<br>Equipo ${escapeHtml(host)}</p>
  </div>
</body></html>`

      const clientResult = await sendMail({
        to: summary.email,
        subject: clientSubject,
        html: clientHtml,
        replyTo: cfg.contactToEmail,
        config: cfg.smtp,
      })

      if (clientResult.ok) {
        clientMessageId = clientResult.messageId
      } else {
        console.error('Bot summary client confirmation error:', clientResult.error)
      }
    }

    return NextResponse.json({
      ok: true,
      summary,
      teamMessageId: teamResult.messageId,
      clientMessageId,
    })
  } catch (error) {
    console.error('Bot summary error:', error)
    return NextResponse.json({ ok: false, error: 'Error procesando el resumen' }, { status: 500 })
  }
}
