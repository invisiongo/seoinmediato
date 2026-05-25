import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.CRON_SECRET || ''

interface AttrSpec {
  key: string
  type: 'string' | 'integer'
  size?: number
  required?: boolean
}

const SMTP_ATTRIBUTES: AttrSpec[] = [
  { key: 'smtpHost', type: 'string', size: 255 },
  { key: 'smtpPort', type: 'integer' },
  { key: 'smtpUser', type: 'string', size: 255 },
  { key: 'smtpPass', type: 'string', size: 500 },
  { key: 'smtpFrom', type: 'string', size: 255 },
  { key: 'contactToEmail', type: 'string', size: 255 },
]

async function ensureAttribute(spec: AttrSpec): Promise<{ key: string; created: boolean; note?: string }> {
  try {
    if (spec.type === 'string') {
      await serverDatabases.createStringAttribute(
        DATABASE_ID,
        COLLECTIONS.PROJECT_LANDING,
        spec.key,
        spec.size || 255,
        false,
      )
    } else {
      await serverDatabases.createIntegerAttribute(
        DATABASE_ID,
        COLLECTIONS.PROJECT_LANDING,
        spec.key,
        false,
      )
    }
    return { key: spec.key, created: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/already exists/i.test(msg)) {
      return { key: spec.key, created: false, note: 'already exists' }
    }
    return { key: spec.key, created: false, note: msg }
  }
}

/**
 * Admin endpoint to:
 *   POST ?action=ensure-schema — add SMTP attributes to project_landing (idempotent)
 *   POST ?action=set&projectId=XXX  body={smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom?, contactToEmail}
 *
 * Requires ?secret=ADMIN_SECRET (falls back to CRON_SECRET).
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const action = request.nextUrl.searchParams.get('action') || ''

  if (action === 'ensure-schema') {
    const results = []
    for (const spec of SMTP_ATTRIBUTES) {
      results.push(await ensureAttribute(spec))
    }
    return NextResponse.json({ ok: true, results })
  }

  if (action === 'set') {
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ ok: false, error: 'projectId required' }, { status: 400 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const smtpHost = typeof body.smtpHost === 'string' ? body.smtpHost : ''
    const smtpUser = typeof body.smtpUser === 'string' ? body.smtpUser : ''
    const smtpPass = typeof body.smtpPass === 'string' ? body.smtpPass : ''
    const smtpPort = typeof body.smtpPort === 'number' ? body.smtpPort : parseInt(String(body.smtpPort || '465'), 10)
    const smtpFrom = typeof body.smtpFrom === 'string' ? body.smtpFrom : ''
    const contactToEmail = typeof body.contactToEmail === 'string' ? body.contactToEmail : ''

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { ok: false, error: 'smtpHost, smtpUser, smtpPass required' },
        { status: 400 }
      )
    }

    const landingResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      [Query.equal('projectId', projectId), Query.limit(1)]
    )

    if (landingResult.documents.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'project_landing doc not found for projectId' },
        { status: 404 }
      )
    }

    const landingDoc = landingResult.documents[0]
    const updated = await serverDatabases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      landingDoc.$id,
      {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom: smtpFrom || smtpUser,
        contactToEmail: contactToEmail || smtpUser,
      }
    )

    return NextResponse.json({ ok: true, landingId: updated.$id })
  }

  if (action === 'test-send') {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const to = request.nextUrl.searchParams.get('to')
    if (!projectId || !to) {
      return NextResponse.json({ ok: false, error: 'projectId and to required' }, { status: 400 })
    }

    const landingResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      [Query.equal('projectId', projectId), Query.limit(1)]
    )
    if (landingResult.documents.length === 0) {
      return NextResponse.json({ ok: false, error: 'project_landing not found' }, { status: 404 })
    }
    const l = landingResult.documents[0] as Record<string, unknown>
    const smtpHost = l.smtpHost as string | undefined
    const smtpUser = l.smtpUser as string | undefined
    const smtpPass = l.smtpPass as string | undefined
    const smtpPort = l.smtpPort as number | string | undefined

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ ok: false, error: 'SMTP not configured for this project' }, { status: 400 })
    }

    const { sendMail } = await import('@/shared/lib/smtp')
    const result = await sendMail({
      to,
      subject: `[TEST] Prueba SMTP · ${new Date().toLocaleString('es-ES')}`,
      html: `<p>Este es un correo de prueba enviado desde el endpoint admin.</p>
             <p>Si lo recibes, el envío outbound de la config SMTP para este proyecto funciona correctamente.</p>
             <p>Host: ${smtpHost}:${smtpPort || 587}<br>User: ${smtpUser}<br>Destinatario: ${to}</p>`,
      config: {
        host: smtpHost,
        port: typeof smtpPort === 'number' ? smtpPort : parseInt(String(smtpPort || '587'), 10),
        user: smtpUser,
        pass: smtpPass,
        from: (l.smtpFrom as string | undefined) || smtpUser,
      },
    })

    return NextResponse.json(result)
  }

  return NextResponse.json(
    { ok: false, error: 'unknown action. Use ?action=ensure-schema | set | test-send' },
    { status: 400 }
  )
}
