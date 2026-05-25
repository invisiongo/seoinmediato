import { NextRequest, NextResponse } from 'next/server'
import { Permission, Query, Role } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.CRON_SECRET || ''

interface AttrSpec {
  key: string
  type: 'string' | 'integer' | 'boolean'
  size?: number
}

// Dedicated collection for bot config (separate from project_landing to avoid
// Appwrite per-collection size limits when storing large system prompts)
const BOT_ATTRIBUTES: AttrSpec[] = [
  { key: 'projectId', type: 'string', size: 64 },
  { key: 'botEnabled', type: 'boolean' },
  { key: 'botSystemPrompt', type: 'string', size: 65535 },
  { key: 'botModel', type: 'string', size: 100 },
  { key: 'botWelcomeMessage', type: 'string', size: 1000 },
  { key: 'botAccentColor', type: 'string', size: 16 },
  { key: 'botApiKey', type: 'string', size: 255 },
  { key: 'botSendSummary', type: 'boolean' },
  { key: 'botAssistantName', type: 'string', size: 100 },
]

async function ensureCollection(): Promise<{ created: boolean; note?: string }> {
  try {
    await serverDatabases.createCollection(
      DATABASE_ID,
      COLLECTIONS.PROJECT_BOT,
      'project_bot',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      false,
      true,
    )
    return { created: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/already exists/i.test(msg)) return { created: false, note: 'already exists' }
    return { created: false, note: msg }
  }
}

async function ensureAttribute(spec: AttrSpec): Promise<{ key: string; created: boolean; note?: string }> {
  try {
    if (spec.type === 'string') {
      await serverDatabases.createStringAttribute(
        DATABASE_ID,
        COLLECTIONS.PROJECT_BOT,
        spec.key,
        spec.size || 255,
        false,
      )
    } else if (spec.type === 'integer') {
      await serverDatabases.createIntegerAttribute(
        DATABASE_ID,
        COLLECTIONS.PROJECT_BOT,
        spec.key,
        false,
      )
    } else if (spec.type === 'boolean') {
      await serverDatabases.createBooleanAttribute(
        DATABASE_ID,
        COLLECTIONS.PROJECT_BOT,
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
 *   POST ?action=ensure-schema — create project_bot collection + add bot attributes (idempotent)
 *   POST ?action=set&projectId=XXX
 *     body = { botEnabled, botSystemPrompt, botModel, botWelcomeMessage,
 *              botAccentColor, botApiKey, botSendSummary, botAssistantName }
 *
 * Bot config lives in its OWN collection (project_bot), not project_landing,
 * because a 64KB system prompt blows project_landing's size budget.
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
    const collection = await ensureCollection()
    const results = []
    for (const spec of BOT_ATTRIBUTES) {
      results.push(await ensureAttribute(spec))
      await new Promise(r => setTimeout(r, 300))
    }
    return NextResponse.json({ ok: true, collection, attributes: results })
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

    const fields: Record<string, unknown> = { projectId }
    if (typeof body.botEnabled === 'boolean') fields.botEnabled = body.botEnabled
    if (typeof body.botSystemPrompt === 'string') fields.botSystemPrompt = body.botSystemPrompt
    if (typeof body.botModel === 'string') fields.botModel = body.botModel
    if (typeof body.botWelcomeMessage === 'string') fields.botWelcomeMessage = body.botWelcomeMessage
    if (typeof body.botAccentColor === 'string') fields.botAccentColor = body.botAccentColor
    if (typeof body.botApiKey === 'string') fields.botApiKey = body.botApiKey
    if (typeof body.botSendSummary === 'boolean') fields.botSendSummary = body.botSendSummary
    if (typeof body.botAssistantName === 'string') fields.botAssistantName = body.botAssistantName

    // Find existing bot doc for this project
    const existing = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_BOT,
      [Query.equal('projectId', projectId), Query.limit(1)]
    )

    let doc
    if (existing.documents.length > 0) {
      doc = await serverDatabases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_BOT,
        existing.documents[0].$id,
        fields,
      )
    } else {
      const { ID } = await import('node-appwrite')
      doc = await serverDatabases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_BOT,
        ID.unique(),
        fields,
      )
    }

    return NextResponse.json({ ok: true, botDocId: doc.$id })
  }

  return NextResponse.json(
    { ok: false, error: 'unknown action. Use ?action=ensure-schema or ?action=set&projectId=XXX' },
    { status: 400 }
  )
}
