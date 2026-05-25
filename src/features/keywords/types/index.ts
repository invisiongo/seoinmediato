export interface KeywordEntry {
  keyword: string
  slug: string
  status: 'pending' | 'generated' | 'indexed' | 'failed' | 'deindexed'
  indexedAt?: string
}

export interface KeywordBlock {
  $id: string
  projectId: string
  blockIndex: number
  keywords: string  // JSON stringified KeywordEntry[]
  count: number
  createdAt: string
}

export interface Keyword {
  $id: string
  projectId: string
  keyword: string
  slug: string
  status: string
  indexedAt?: string
  createdAt: string
}

export interface KeywordConfig {
  $id: string
  projectId: string
  services: string
  prefixModifiers: string
  suffixModifiers: string
  locations: string
  totalCombinations: number
  createdAt: string
}

export const DEFAULT_PREFIX_MODIFIERS = [
  'Comprar',
  'Precios de',
  'Venta de',
  'Servicio de',
  'El mejor',
  'La mejor',
  'Adquirir',
  'Costos de',
  'Cuanto cuesta',
  'Donde venden',
  'Empresas de',
  'Fabricacion de',
  'Distribuidora de',
  'Importadora de',
  'Encontrar',
  'Donde encuentro',
  'Buscar',
  'Contratar',
]

export const DEFAULT_SUFFIX_MODIFIERS = [
  'barato',
  'barata',
  'economico',
  'economica',
  'garantizado',
  'garantizada',
  'a domicilio',
  'con entrega a domicilio',
  '24 horas',
  'a esta hora',
  'cerca de mi',
  'legalizado',
  'legalizada',
  'de calidad',
]
