import { NextRequest, NextResponse } from 'next/server'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  // Create session via Appwrite client endpoint (no API key — this is a client operation)
  const response = await fetch(`${ENDPOINT}/account/sessions/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status })
  }

  // Build response with Appwrite's session cookies forwarded
  const res = NextResponse.json(data, { status: 201 })

  // Forward Set-Cookie headers from Appwrite so browser stores session
  const cookies = response.headers.getSetCookie()
  for (const cookie of cookies) {
    res.headers.append('Set-Cookie', cookie)
  }

  return res
}
