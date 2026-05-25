import { NextRequest, NextResponse } from 'next/server'
import { deleteToken, toggleToken } from '@/features/indexing/services/tokenService'

interface RouteParams {
  params: Promise<{ projectId: string; tokenId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { tokenId } = await params

  try {
    await deleteToken(tokenId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete token error:', error)
    return NextResponse.json({ error: 'Error al eliminar token' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { tokenId } = await params

  try {
    const { isActive } = await request.json()
    await toggleToken(tokenId, isActive)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Toggle token error:', error)
    return NextResponse.json({ error: 'Error al actualizar token' }, { status: 500 })
  }
}
