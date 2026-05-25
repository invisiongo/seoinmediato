import { Client, Databases, Query } from 'node-appwrite'
import { readFileSync } from 'fs'
import { join } from 'path'

// Parse .env.local manually
const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
}

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY)

const db = new Databases(client)
const DATABASE_ID = 'seoinmediato'

async function main() {
  // Find the project by name
  const projects = await db.listDocuments(DATABASE_ID, 'projects', [Query.limit(100)])

  console.log('Projects found:')
  for (const p of projects.documents) {
    console.log(`  - ${p.name} (${p.$id}) — ${p.totalKeywords} keywords`)
  }

  // Find "Invision México" or similar
  const target = projects.documents.find(
    (p) => (p.name as string).toLowerCase().includes('invision') ||
           (p.name as string).toLowerCase().includes('méxico') ||
           (p.name as string).toLowerCase().includes('mexico')
  )

  if (!target) {
    console.log('\nNo project matching "Invision México" found.')
    console.log('Pass a project ID as argument: npx tsx src/scripts/cleanup-keywords.ts <projectId>')

    // Check if projectId passed as argument
    const argId = process.argv[2]
    if (argId) {
      await deleteKeywordsForProject(argId)
    }
    return
  }

  console.log(`\nTarget project: ${target.name} (${target.$id})`)
  await deleteKeywordsForProject(target.$id)
}

async function deleteKeywordsForProject(projectId: string) {
  let deleted = 0
  let hasMore = true

  while (hasMore) {
    const response = await db.listDocuments(DATABASE_ID, 'keywords', [
      Query.equal('projectId', projectId),
      Query.limit(100),
    ])

    if (response.documents.length === 0) {
      hasMore = false
      break
    }

    const promises = response.documents.map((doc) =>
      db.deleteDocument(DATABASE_ID, 'keywords', doc.$id).catch((e: Error) => {
        console.error(`  Failed to delete ${doc.$id}: ${e.message}`)
      })
    )
    await Promise.all(promises)
    deleted += response.documents.length
    console.log(`  Deleted ${deleted} keywords so far...`)
  }

  console.log(`\nTotal deleted: ${deleted} keywords`)

  // Reset project keyword count
  await db.updateDocument(DATABASE_ID, 'projects', projectId, {
    totalKeywords: 0,
    totalIndexed: 0,
  })
  console.log('Project keyword count reset to 0')
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
