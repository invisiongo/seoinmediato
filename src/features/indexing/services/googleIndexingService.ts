import { google } from 'googleapis'

interface IndexingResponse {
  success: boolean
  statusCode: number
  message: string
}

export async function getAuthClient(tokenJson: string) {
  const credentials = JSON.parse(tokenJson)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  })
  return auth
}

export async function submitUrlForIndexing(
  url: string,
  tokenJson: string
): Promise<IndexingResponse> {
  try {
    const auth = await getAuthClient(tokenJson)
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()

    const response = await fetch(
      'https://indexing.googleapis.com/v3/urlNotifications:publish',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify({
          url,
          type: 'URL_UPDATED',
        }),
      }
    )

    const body = await response.json()

    if (response.ok) {
      // Log the actual Google response for debugging
      const notifyTime = body?.urlNotificationMetadata?.latestUpdate?.notifyTime || 'no-time'
      console.log(`[Indexing] OK ${url} | notifyTime=${notifyTime}`)
      return {
        success: true,
        statusCode: response.status,
        message: `notifyTime=${notifyTime}`,
      }
    }

    return {
      success: false,
      statusCode: response.status,
      message: body.error?.message || `HTTP ${response.status}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      statusCode: 500,
      message,
    }
  }
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise((resolve) => setTimeout(resolve, ms))
}
