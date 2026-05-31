import { ID, Query } from 'appwrite'
import { getDatabases } from '@/shared/lib/appwrite-client'
import { DATABASE_ID, COLLECTIONS } from '@/shared/lib/constants'
import type { Project, ProjectFormData } from '../types'

export async function listProjects(): Promise<Project[]> {
  const response = await getDatabases().listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    [Query.orderDesc('createdAt'), Query.limit(100)]
  )
  return response.documents as unknown as Project[]
}

export async function getProject(id: string): Promise<Project> {
  const doc = await getDatabases().getDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    id
  )
  return doc as unknown as Project
}

export async function createProject(
  data: ProjectFormData,
  userId: string
): Promise<Project> {
  const now = new Date().toISOString()

  // Separate landing fields from project fields
  const { logoUrl, differentiators, contentTone, facebookUrl, instagramUrl, googleMapsUrl, ...projectData } = data

  const doc = await getDatabases().createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    ID.unique(),
    {
      ...projectData,
      status: 'active',
      totalKeywords: 0,
      totalIndexed: 0,
      createdAt: now,
      updatedAt: now,
      userId,
    }
  )

  // Create project_landing with onboarding data
  const landingData: Record<string, string> = { projectId: doc.$id }
  if (logoUrl) landingData.logoUrl = logoUrl
  if (differentiators) landingData.differentiators = differentiators
  if (contentTone) landingData.contentTone = contentTone
  if (facebookUrl) landingData.facebookUrl = facebookUrl
  if (instagramUrl) landingData.instagramUrl = instagramUrl
  if (googleMapsUrl) landingData.googleMapsUrl = googleMapsUrl

  try {
    await getDatabases().createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_LANDING,
      ID.unique(),
      landingData
    )
  } catch (err) {
    console.error('Failed to create project_landing:', err)
  }

  return doc as unknown as Project
}

export async function updateProject(
  id: string,
  data: Partial<ProjectFormData & { googleTokenJson: string }>
): Promise<Project> {
  // Only send fields that exist in the projects collection — landing fields go to project_landing
  const { logoUrl, differentiators, contentTone, facebookUrl, instagramUrl, googleMapsUrl, ...projectFields } = data
  void logoUrl; void differentiators; void contentTone; void facebookUrl; void instagramUrl; void googleMapsUrl
  const doc = await getDatabases().updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    id,
    {
      ...projectFields,
      updatedAt: new Date().toISOString(),
    }
  )
  return doc as unknown as Project
}

export async function deleteProject(id: string): Promise<void> {
  await getDatabases().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    id
  )
}

export async function updateProjectKeywordCount(
  id: string,
  totalKeywords: number
): Promise<void> {
  await getDatabases().updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    id,
    { totalKeywords, updatedAt: new Date().toISOString() }
  )
}

/**
 * List regions (child projects) for a parent project.
 */
export async function listRegions(parentProjectId: string): Promise<Project[]> {
  const response = await getDatabases().listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    [Query.equal('parentProjectId', parentProjectId), Query.orderDesc('createdAt'), Query.limit(50)]
  )
  return response.documents as unknown as Project[]
}

/**
 * Create a region under a parent project.
 * Inherits domain, business info, seoMode, seoPathPrefix from parent.
 */
export async function createRegion(
  parentProject: Project,
  regionName: string,
  userId: string
): Promise<Project> {
  const now = new Date().toISOString()
  const doc = await getDatabases().createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    ID.unique(),
    {
      name: regionName,
      domain: parentProject.domain,
      status: 'active',
      businessName: parentProject.businessName || '',
      businessPhone: parentProject.businessPhone || '',
      businessEmail: parentProject.businessEmail || '',
      niche: parentProject.niche || '',
      seoMode: parentProject.seoMode || 'full_site',
      seoPathPrefix: parentProject.seoPathPrefix || '',
      redirectUrl: parentProject.redirectUrl || '',
      indexingRate: parentProject.indexingRate || 200,
      parentProjectId: parentProject.$id,
      totalKeywords: 0,
      totalIndexed: 0,
      createdAt: now,
      updatedAt: now,
      userId,
    }
  )
  return doc as unknown as Project
}
