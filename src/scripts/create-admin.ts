import { Client, Users, ID } from 'node-appwrite'
import * as fs from 'fs'
import * as path from 'path'

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}

  if (!fs.existsSync(envPath)) {
    console.warn(`[WARN] .env.local not found at ${envPath}`)
    return env
  }

  const content = fs.readFileSync(envPath, 'utf-8')

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = value
  }

  return env
}

const envVars = loadEnvLocal()

function getEnv(key: string): string {
  const value = envVars[key] ?? process.env[key]
  if (!value) throw new Error(`Missing env var: ${key}`)
  return value
}

async function main() {
  const client = new Client()
    .setEndpoint(getEnv('NEXT_PUBLIC_APPWRITE_ENDPOINT'))
    .setProject(getEnv('NEXT_PUBLIC_APPWRITE_PROJECT_ID'))
    .setKey(getEnv('APPWRITE_API_KEY'))

  const users = new Users(client)

  const email = envVars['ADMIN_EMAIL'] || process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = envVars['ADMIN_PASSWORD'] || process.env.ADMIN_PASSWORD
  const name = envVars['ADMIN_NAME'] || process.env.ADMIN_NAME || 'Admin'

  if (!password) {
    console.error('[ERROR] ADMIN_PASSWORD is required. Set it in .env.local or as env var.')
    process.exit(1)
  }

  try {
    const user = await users.create(ID.unique(), email, undefined, password, name)
    console.log(`[OK] Usuario admin creado: ${user.email} (${user.$id})`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('already exists')) {
      console.log(`[SKIP] El usuario ${email} ya existe`)
    } else {
      console.error(`[ERROR] ${message}`)
      process.exit(1)
    }
  }
}

main()
