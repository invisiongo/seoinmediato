import { ID, Query } from 'node-appwrite'
import { serverDatabases } from '@/shared/lib/appwrite-server'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'

export interface GoogleToken {
  $id: string
  projectId: string
  tokenName: string
  tokenJson: string
  serviceAccountEmail: string
  dailyQuota: number
  urlsSentToday: number
  lastResetDate: string
  isActive: boolean
  pausedUntil: string
  createdAt: string
}

/**
 * List all tokens for a project (direct lookup, no parent resolution).
 */
export async function listTokens(projectId: string): Promise<GoogleToken[]> {
  const response = await serverDatabases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.GOOGLE_TOKENS,
    [Query.equal('projectId', projectId), Query.limit(50)]
  )
  return response.documents as unknown as GoogleToken[]
}

/**
 * Resolve the effective projectId for token lookups.
 * If the project has a parentProjectId, tokens live on the parent.
 */
export async function resolveTokenProjectId(projectId: string): Promise<string> {
  try {
    const project = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId)
    const parentId = project.parentProjectId as string
    if (parentId) return parentId
  } catch {
    // Project not found or no parent — use original
  }
  return projectId
}

/**
 * List tokens for a project, resolving parent if this is a region.
 */
export async function listTokensResolved(projectId: string): Promise<GoogleToken[]> {
  const effectiveId = await resolveTokenProjectId(projectId)
  return listTokens(effectiveId)
}

/**
 * Add a new token. Extracts the service account email from the JSON.
 */
export async function addToken(
  projectId: string,
  tokenName: string,
  tokenJson: string
): Promise<GoogleToken> {
  let serviceAccountEmail = ''
  try {
    const parsed = JSON.parse(tokenJson)
    serviceAccountEmail = parsed.client_email || ''
  } catch {
    throw new Error('Token JSON invalido')
  }

  const doc = await serverDatabases.createDocument(
    DATABASE_ID,
    COLLECTIONS.GOOGLE_TOKENS,
    ID.unique(),
    {
      projectId,
      tokenName,
      tokenJson,
      serviceAccountEmail,
      dailyQuota: 200,
      urlsSentToday: 0,
      lastResetDate: todayStr(),
      isActive: true,
      pausedUntil: '',
      createdAt: new Date().toISOString(),
    }
  )
  return doc as unknown as GoogleToken
}

/**
 * Delete a token.
 */
export async function deleteToken(tokenId: string): Promise<void> {
  await serverDatabases.deleteDocument(DATABASE_ID, COLLECTIONS.GOOGLE_TOKENS, tokenId)
}

/**
 * Toggle active state of a token.
 */
export async function toggleToken(tokenId: string, isActive: boolean): Promise<void> {
  await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.GOOGLE_TOKENS, tokenId, { isActive })
}

const TOKEN_PAUSE_MS = 60 * 60 * 1000 // 1 hour pause on 429

/**
 * Pause a token temporarily after receiving a 429 rate limit.
 * Persisted in DB so it survives server restarts.
 */
export async function pauseToken(tokenId: string): Promise<void> {
  const pausedUntil = new Date(Date.now() + TOKEN_PAUSE_MS).toISOString()
  await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.GOOGLE_TOKENS, tokenId, { pausedUntil })
}

/**
 * Check if a token is currently paused (reads from DB field).
 */
function isTokenPaused(token: GoogleToken): boolean {
  if (!token.pausedUntil) return false
  return new Date(token.pausedUntil).getTime() > Date.now()
}

/**
 * Get the best available token for indexing (least used today, not paused).
 * Resolves parent tokens automatically for region projects.
 * No hard quota cutoff — Google's 429 is the real brake.
 * Resets counters if date has changed.
 */
export async function getBestToken(projectId: string): Promise<{ tokenId: string; tokenJson: string } | null> {
  const tokens = await listTokensResolved(projectId)
  const today = todayStr()
  let bestToken: GoogleToken | null = null
  let bestSent = Infinity

  for (const token of tokens) {
    if (!token.isActive) continue
    if (isTokenPaused(token)) continue

    // Reset daily counter if date changed
    if (token.lastResetDate !== today) {
      await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.GOOGLE_TOKENS, token.$id, {
        urlsSentToday: 0,
        lastResetDate: today,
        pausedUntil: '', // Clear any expired pause on new day
      })
      token.urlsSentToday = 0
      token.lastResetDate = today
    }

    // Pick token with least usage (no hard cap — let Google 429 be the brake)
    if (token.urlsSentToday < bestSent) {
      bestSent = token.urlsSentToday
      bestToken = token
    }
  }

  if (!bestToken) return null
  return { tokenId: bestToken.$id, tokenJson: bestToken.tokenJson }
}

/**
 * Increment the sent counter for a token after successfully indexing a URL.
 */
export async function incrementTokenUsage(tokenId: string): Promise<void> {
  const doc = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.GOOGLE_TOKENS, tokenId)
  await serverDatabases.updateDocument(DATABASE_ID, COLLECTIONS.GOOGLE_TOKENS, tokenId, {
    urlsSentToday: ((doc.urlsSentToday as number) || 0) + 1,
  })
}

/**
 * Get total daily quota across all active tokens for a project (resolves parent).
 */
export async function getTotalQuota(projectId: string): Promise<{ totalQuota: number; usedToday: number; activeTokens: number }> {
  const tokens = await listTokensResolved(projectId)
  const today = todayStr()
  let totalQuota = 0
  let usedToday = 0
  let activeTokens = 0

  for (const token of tokens) {
    if (!token.isActive) continue
    activeTokens++
    totalQuota += token.dailyQuota
    usedToday += token.lastResetDate === today ? token.urlsSentToday : 0
  }

  return { totalQuota, usedToday, activeTokens }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}
