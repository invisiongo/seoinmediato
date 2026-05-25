import { NextRequest, NextResponse } from 'next/server'
import { Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import { findProjectsByDomain } from '@/features/sites/services/projectLookup'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BotConfig {
  systemPrompt: string
  model: string
  apiKey: string
  assistantName: string
}

async function resolveBotConfig(host: string): Promise<BotConfig | null> {
  const projects = await findProjectsByDomain(host)
  if (projects.length === 0) return null

  const parent = projects.find(p => !p.parentProjectId) || projects[0]
  const botResult = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECT_BOT,
    [Query.equal('projectId', parent.$id as string), Query.limit(1)]
  )

  if (botResult.documents.length === 0) return null
  const bot = botResult.documents[0] as Record<string, unknown>

  const botEnabled = bot.botEnabled === true
  const systemPrompt = bot.botSystemPrompt as string | undefined
  const model = (bot.botModel as string | undefined) || 'anthropic/claude-haiku-4.5'
  const apiKey = bot.botApiKey as string | undefined
  const assistantName = (bot.botAssistantName as string | undefined) || 'Asistente'

  if (!botEnabled || !systemPrompt || !apiKey) return null

  return { systemPrompt, model, apiKey, assistantName }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { messages?: ChatMessage[]; host?: string }
    const inputHost = body.host || request.headers.get('x-forwarded-host') || request.headers.get('origin') || request.headers.get('referer') || ''
    const host = inputHost.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]

    if (!host) {
      return NextResponse.json({ ok: false, error: 'host required' }, { status: 400 })
    }

    const messages = Array.isArray(body.messages) ? body.messages : []
    if (messages.length === 0) {
      return NextResponse.json({ ok: false, error: 'messages required' }, { status: 400 })
    }

    const cleanedMessages: ChatMessage[] = messages
      .slice(-20)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length > 0)
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) }))

    if (cleanedMessages.length === 0) {
      return NextResponse.json({ ok: false, error: 'no valid messages' }, { status: 400 })
    }

    const cfg = await resolveBotConfig(host)
    if (!cfg) {
      return NextResponse.json(
        { ok: false, error: 'Bot no configurado para este dominio' },
        { status: 503 }
      )
    }

    const openrouterBody = {
      model: cfg.model,
      messages: [
        { role: 'system', content: cfg.systemPrompt },
        ...cleanedMessages,
      ],
      temperature: 0.7,
      max_tokens: 800,
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': `https://${host}`,
        'X-Title': `${cfg.assistantName} · ${host}`,
      },
      body: JSON.stringify(openrouterBody),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter error:', response.status, errText)
      return NextResponse.json(
        { ok: false, error: 'Error en el modelo de IA. Inténtalo de nuevo.' },
        { status: 500 }
      )
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const reply = data.choices?.[0]?.message?.content || ''
    if (!reply) {
      return NextResponse.json(
        { ok: false, error: 'Respuesta vacía del modelo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: reply, assistantName: cfg.assistantName })
  } catch (error) {
    console.error('Bot chat error:', error)
    return NextResponse.json(
      { ok: false, error: 'Error procesando el mensaje' },
      { status: 500 }
    )
  }
}
