import { extractLocation } from '@/features/sites/templates/seo-content'

export type IndexingOrder = 'sequential' | 'random' | 'by_location' | 'by_priority'

/**
 * Reorder keywords based on the selected indexing strategy.
 */
export function reorderKeywords(
  keywords: Array<{ slug: string; keyword: string }>,
  order: IndexingOrder
): Array<{ slug: string; keyword: string }> {
  switch (order) {
    case 'random':
      return shuffleArray([...keywords])

    case 'by_location':
      return orderByLocationRotation(keywords)

    case 'by_priority':
      return orderByPriority(keywords)

    case 'sequential':
    default:
      return keywords
  }
}

/**
 * Fisher-Yates shuffle.
 */
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Group by location, then round-robin pick one from each location.
 * This ensures Google sees geographic variety from day one.
 */
function orderByLocationRotation(
  keywords: Array<{ slug: string; keyword: string }>
): Array<{ slug: string; keyword: string }> {
  const groups = new Map<string, Array<{ slug: string; keyword: string }>>()

  for (const kw of keywords) {
    const loc = extractLocation(kw.keyword) || '__no_location__'
    if (!groups.has(loc)) groups.set(loc, [])
    groups.get(loc)!.push(kw)
  }

  const result: Array<{ slug: string; keyword: string }> = []
  const locationKeys = Array.from(groups.keys())
  let remaining = true

  while (remaining) {
    remaining = false
    for (const loc of locationKeys) {
      const group = groups.get(loc)!
      if (group.length > 0) {
        result.push(group.shift()!)
        remaining = true
      }
    }
  }

  return result
}

/**
 * Shorter/more generic keywords first, then longer/more specific ones.
 * Rationale: generic keywords have higher search volume.
 */
function orderByPriority(
  keywords: Array<{ slug: string; keyword: string }>
): Array<{ slug: string; keyword: string }> {
  return [...keywords].sort((a, b) => a.keyword.length - b.keyword.length)
}
