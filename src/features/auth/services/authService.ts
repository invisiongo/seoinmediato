import { ID, AuthenticatorType, AuthenticationFactor } from 'appwrite'
import { getAccount } from '@/shared/lib/appwrite-client'
import type { AuthUser } from '../types'

export async function login(email: string, password: string): Promise<void> {
  // Use server proxy to avoid Appwrite client-side rate limits
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const session = await res.json()
  if (!res.ok) {
    const error = new Error(session.message || 'Error al iniciar sesion') as Error & { type?: string; code?: number }
    error.type = session.type
    error.code = res.status
    throw error
  }

  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

  // Store session in localStorage so the Appwrite SDK picks it up
  // via the X-Fallback-Cookies mechanism (see SDK source prepareRequest)
  const fallback = JSON.parse(window.localStorage.getItem('cookieFallback') || '{}')
  fallback[`a_session_${projectId}`] = session.secret
  window.localStorage.setItem('cookieFallback', JSON.stringify(fallback))

  // Also set a simple cookie so Next.js middleware can detect the session
  document.cookie = `a_session_${projectId}=true; path=/; max-age=31536000; SameSite=Lax`
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  await getAccount().create(ID.unique(), email, password, name)
  await getAccount().createEmailPasswordSession(email, password)
}

export async function logout(): Promise<void> {
  try {
    await getAccount().deleteSession('current')
  } catch {
    // Session may already be expired
  }
  // Clear localStorage fallback
  window.localStorage.removeItem('cookieFallback')
  // Clear middleware cookie
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  document.cookie = `a_session_${projectId}=; path=/; max-age=0`
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await getAccount().get()
    return {
      $id: user.$id,
      name: user.name,
      email: user.email,
      mfa: user.mfa,
    }
  } catch {
    return null
  }
}

export async function setupMfa(): Promise<{ secret: string; uri: string }> {
  const authenticator = await getAccount().createMfaAuthenticator(AuthenticatorType.Totp)
  return {
    secret: authenticator.secret,
    uri: authenticator.uri,
  }
}

export async function verifyMfa(otp: string): Promise<void> {
  const challenge = await getAccount().createMfaChallenge(AuthenticationFactor.Totp)
  await getAccount().updateMfaChallenge(challenge.$id, otp)
}

export async function confirmMfaLogin(
  challengeId: string,
  otp: string,
): Promise<void> {
  await getAccount().updateMfaChallenge(challengeId, otp)
}

export async function createMfaChallenge(): Promise<{ $id: string }> {
  const challenge = await getAccount().createMfaChallenge(AuthenticationFactor.Totp)
  return { $id: challenge.$id }
}

export async function disableMfa(): Promise<void> {
  await getAccount().deleteMfaAuthenticator(AuthenticatorType.Totp)
}
