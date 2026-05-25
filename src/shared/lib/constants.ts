export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!
export const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!

export const DATABASE_ID = 'seoinmediato'

export const COLLECTIONS = {
  PROJECTS: 'projects',
  KEYWORDS: 'keywords',
  KEYWORD_CONFIGS: 'keyword_configs',
  INDEXING_JOBS: 'indexing_jobs',
  LOCATION_TEMPLATES: 'location_templates',
  PROJECT_LANDING: 'project_landing',
  KEYWORD_BLOCKS: 'keyword_blocks',
  GOOGLE_TOKENS: 'google_tokens',
  PROJECT_BOT: 'project_bot',
} as const
