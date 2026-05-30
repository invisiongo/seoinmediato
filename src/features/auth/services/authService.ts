import { ID, AuthenticatorType, AuthenticationFactor } from 'appwrite'
import { getAccount } from '@/shared/lib/appwrite-client'
import type { AuthUser } from '../types'

export async function login(email: string, password: string): Promise<void> {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

  try {
    // Use Appwrite SDK directly — it handles cookieFallback/localStorage automatically
    await getAccount().createEmailPasswordSession(email, password)
  } catch (err: unknown) {
    const e = err as { type?: string; message?: string; code?: number }
    const error = new Error(e.message || 'Error al iniciar sesion') as Error & { type?: string; code?: number }
    error.type = e.type
    error.code = e.code
    throw error
  }

  // Set a simple cookie so Next.js middleware can detect the session
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
