import { NextRequest, NextResponse } from 'next/server'
import { listTokens, listTokensResolved, addToken, getTotalQuota } from '@/features/indexing/services/tokenService'

interface RouteParams {
  params: Promise<{ projectId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const tokens = await listTokensResolved(projectId)
    const quota = await getTotalQuota(projectId)

    // Strip tokenJson from response for security (only show metadata)
    const safe = tokens.map(t => ({
      $id: t.$id,
      tokenName: t.tokenName,
      serviceAccountEmail: t.serviceAccountEmail,
      dailyQuota: t.dailyQuota,
      urlsSentToday: t.urlsSentToday,
      lastResetDate: t.lastResetDate,
      isActive: t.isActive,
      createdAt: t.createdAt,
    }))

    return NextResponse.json({ tokens: safe, ...quota })
  } catch (error) {
    console.error('List tokens error:', error)
    return NextResponse.json({ error: 'Error al listar tokens' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params

  try {
    const { tokenName, tokenJson } = await request.json()

    if (!tokenName || !tokenJson) {
      return NextResponse.json({ error: 'tokenName y tokenJson son requeridos' }, { status: 400 })
    }

    const token = await addToken(projectId, tokenName, tokenJson)

    return NextResponse.json({
      $id: token.$id,
      tokenName: token.tokenName,
      serviceAccountEmail: token.serviceAccountEmail,
      dailyQuota: token.dailyQuota,
      isActive: token.isActive,
    })
  } catch (error) {
    console.error('Add token error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al agregar token' },
      { status: 500 }
    )
  }
}
