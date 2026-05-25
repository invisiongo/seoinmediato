import { ID, Query } from 'appwrite'
import { getDatabases } from '@/shared/lib/appwrite-client'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import type { LocationTemplate, LocationTemplateFormData } from '../types'

export async function listTemplates(): Promise<LocationTemplate[]> {
  const response = await getDatabases().listDocuments(
    DATABASE_ID,
    COLLECTIONS.LOCATION_TEMPLATES,
    [Query.orderDesc('createdAt'), Query.limit(100)]
  )
  return response.documents as unknown as LocationTemplate[]
}

export async function getTemplate(id: string): Promise<LocationTemplate> {
  const doc = await getDatabases().getDocument(
    DATABASE_ID,
    COLLECTIONS.LOCATION_TEMPLATES,
    id
  )
  return doc as unknown as LocationTemplate
}

export async function createTemplate(
  data: LocationTemplateFormData,
  userId: string
): Promise<LocationTemplate> {
  const doc = await getDatabases().createDocument(
    DATABASE_ID,
    COLLECTIONS.LOCATION_TEMPLATES,
    ID.unique(),
    {
      ...data,
      createdAt: new Date().toISOString(),
      userId,
    }
  )
  return doc as unknown as LocationTemplate
}

export async function updateTemplate(
  id: string,
  data: LocationTemplateFormData
): Promise<LocationTemplate> {
  const doc = await getDatabases().updateDocument(
    DATABASE_ID,
    COLLECTIONS.LOCATION_TEMPLATES,
    id,
    data
  )
  return doc as unknown as LocationTemplate
}

export async function deleteTemplate(id: string): Promise<void> {
  await getDatabases().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.LOCATION_TEMPLATES,
    id
  )
}
