/**
 * Migración: agrega atributos de foto (title, custom) y customHtml a project_landing
 * Ejecutar UNA sola vez: node scripts/migrate-photo-fields.js
 *
 * Requiere las variables de entorno del .env.local en el directorio raíz.
 */
require('dotenv').config({ path: '.env.local' })
const { Client, Databases } = require('node-appwrite')

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DB = 'seoinmediato'
const COLLECTION = 'project_landing'

async function main() {
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
  const db = new Databases(client)

  const stringAttrs = []

  // photo1..6 Title y Custom
  for (let n = 1; n <= 6; n++) {
    stringAttrs.push(`photo${n}Title`)
    stringAttrs.push(`photo${n}Custom`)
  }

  // customHtml (largo) y lovableUrl
  stringAttrs.push('lovableUrl')

  console.log('Creando atributos string cortos...')
  for (const attr of stringAttrs) {
    try {
      await db.createStringAttribute(DB, COLLECTION, attr, 500, false)
      console.log(`  ✓ ${attr}`)
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.log(`  ⚠ ${attr} ya existe, omitiendo`)
      } else {
        console.error(`  ✗ ${attr}: ${e.message}`)
      }
    }
  }

  // customHtml necesita size grande (100000 chars)
  console.log('Creando atributo customHtml (100k)...')
  try {
    await db.createStringAttribute(DB, COLLECTION, 'customHtml', 100000, false)
    console.log('  ✓ customHtml')
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log('  ⚠ customHtml ya existe, omitiendo')
    } else {
      console.error(`  ✗ customHtml: ${e.message}`)
    }
  }

  console.log('\nMigración completada.')
}

main().catch(console.error)
