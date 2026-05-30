import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, ID, Query } from 'node-appwrite'
import { generateLandingContent } from '@/features/projects/services/aiContentService'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!
const API_KEY = process.env.APPWRITE_API_KEY!
const DB = 'seoinmediato'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {

  const { projectId } = await params

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY)
  const db = new Databases(client)

  // Get project data
  const project = await db.getDocument(DB, 'projects', projectId)

  // Check if landing already exists — preserve manual fields on regeneration
  const existing = await db.listDocuments(DB, 'project_landing', [
    Query.equal('projectId', projectId),
    Query.limit(1),
  ])
  const prev = existing.documents.length > 0 ? existing.documents[0] : null

  // Generate content with AI
  // - differentiators: stored in project_landing (set during onboarding in ProjectForm)
  // - contentTone: stored in project_landing (set during onboarding)
  // - businessDescription: always regenerated fresh by IA (do not pass old one to avoid stale loops)
  const content = await generateLandingContent({
    businessName: (project.businessName as string) || (project.name as string),
    niche: (project.niche as string) || '',
    phone: (project.businessPhone as string) || '',
    email: (project.businessEmail as string) || '',
    location: '',
    businessDescription: '',
    differentiators: (prev?.differentiators as string) || '',
    contentTone: (prev?.contentTone as string) || 'profesional',
  })

  const landingData: Record<string, string> = {
    projectId,
    businessDescription: content.businessDescription,
    services: JSON.stringify(content.services),
    testimonials: JSON.stringify(content.testimonials),
    stats: JSON.stringify(content.stats),
    socialProofMessages: JSON.stringify(content.socialProofMessages),
    ctaWhatsappText: (prev?.ctaWhatsappText as string) || 'WhatsApp ahora',
    ctaCallText: (prev?.ctaCallText as string) || 'Llamar ahora',
    colorScheme: (prev?.colorScheme as string) || 'dark',
    logoUrl: (prev?.logoUrl as string) || '',
    backgroundImageUrl: (prev?.backgroundImageUrl as string) || '',
    createdAt: new Date().toISOString(),
  }

  let doc
  if (prev) {
    // Update existing — preserve manual fields not in landingData
    doc = await db.updateDocument(DB, 'project_landing', prev.$id, landingData)
  } else {
    // Create new
    doc = await db.createDocument(DB, 'project_landing', ID.unique(), landingData)
  }

  return NextResponse.json(doc, { status: 200 })
}
