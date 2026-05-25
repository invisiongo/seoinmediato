import { cookies } from 'next/headers'

/**
 * Verify that the request comes from an authenticated user.
 * Checks for Appwrite session cookie (set by middleware).
 * Returns true if authenticated, false otherwise.
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  return allCookies.some((c) => c.name.startsWith('a_session_'))
}
