import { Client, Databases, ID, Query } from 'node-appwrite'
import { readFileSync } from 'fs'
import { join } from 'path'

const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i)] = t.slice(i + 1)
}

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY)

const db = new Databases(client)

async function main() {
  const projects = await db.listDocuments('seoinmediato', 'projects', [Query.limit(1)])
  const project = projects.documents[0]
  if (!project) {
    console.log('No projects found')
    return
  }
  console.log('Project:', project.name, project.$id)

  const testKws = [
    { keyword: 'Comprar cafeteria barata en Calderon', slug: 'comprar-cafeteria-barata-en-calderon' },
    { keyword: 'Precios de restaurante economico en Quito', slug: 'precios-de-restaurante-economico-en-quito' },
    { keyword: 'Servicio de panaderia a domicilio en Tumbaco', slug: 'servicio-de-panaderia-a-domicilio-en-tumbaco' },
  ]

  for (const kw of testKws) {
    await db.createDocument('seoinmediato', 'keywords', ID.unique(), {
      projectId: project.$id,
      keyword: kw.keyword,
      slug: kw.slug,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    console.log('Created:', kw.slug)
  }

  await db.updateDocument('seoinmediato', 'projects', project.$id, {
    totalKeywords: 3,
    updatedAt: new Date().toISOString(),
  })
  console.log('Done!')
}

main()
