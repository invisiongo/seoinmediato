export interface Project {
  $id: string
  name: string
  domain: string
  status: string
  businessName?: string
  businessPhone?: string
  businessEmail?: string
  niche?: string
  googleTokenJson?: string
  redirectUrl?: string
  seoMode?: string
  seoPathPrefix?: string
  wizardState?: string
  totalKeywords: number
  totalIndexed: number
  indexingRate: number
  indexingOrder?: string
  parentProjectId?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface ProjectFormData {
  name: string
  domain: string
  businessName: string
  businessPhone: string
  businessEmail: string
  niche: string
  seoMode: string
  seoPathPrefix: string
  redirectUrl: string
  indexingRate: number
  // Landing/onboarding fields (stored in project_landing, not projects)
  logoUrl?: string
  differentiators?: string
  contentTone?: string
  facebookUrl?: string
  instagramUrl?: string
  googleMapsUrl?: string
}
