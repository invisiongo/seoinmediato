# Changelog - SEOImediato

## v0.13.0 - Performance: Non-blocking Cold Start (2026-03-09)

### Cache Rewrite
- Rewrite completo del sistema de cache para SEO pages
- Parallel block fetching: fetch block IDs (lightweight via `Query.select(['$id'])`) + individual blocks via `Promise.all` en batches de 5
- Non-blocking cold start: `parallelSlugSearch()` busca slug sin esperar cache completo
- Deduplicacion de builds concurrentes: multiples requests durante cold start comparten misma Promise (`buildingPromises` Map)
- Warm-up de cache cuando Googlebot hit sitemap (`warmUpSlugCache()`)
- Timing logs para monitoring de cold start (`[SlugCache]` prefix)

### Archivos Modificados
- `src/features/keywords/services/keywordBlockService.ts` - Nuevas funciones: `getBlockIds`, `fetchBlock`, `buildSlugMap`, `getSlugMap`, `parallelSlugSearch`, `warmUpSlugCache`
- `src/app/[...slug]/route.ts` - Integra `warmUpSlugCache` en sitemap handler

---

## v0.12.0 - Performance: In-Memory HashMap Cache (2026-03-09)

### In-Memory Cache System
- Cache de keywords con `Map<slug, KeywordEntry>` + TTL 5 min
- Cache de proyectos por dominio en `projectLookup.ts` con TTL 5 min
- `findKeywordBySlugCached()` para O(1) lookup (vs sequential block scanning)
- `invalidateSlugCache()` llamada en POST/DELETE de keywords

### Archivos Modificados
- `src/features/keywords/services/keywordBlockService.ts` - Slug cache con HashMap
- `src/features/sites/services/projectLookup.ts` - Project cache por dominio
- `src/app/[...slug]/route.ts` - Usa `findKeywordBySlugCached`
- `src/app/api/keywords/route.ts` - Llama `invalidateSlugCache` en mutaciones

---

## v0.11.1 - SEO Prompt Enhancement (2026-03-09)

### Mejoras al Prompt SEO
- Instrucciones adicionales al prompt: minimo 1200 palabras, 200 por seccion
- Nueva seccion de diferenciadores competitivos: "Por que elegir {businessName} para {keyword} en {ubicacion}"
- `max_tokens` confirmado en 4000

### Archivos Modificados
- `src/features/projects/services/seoArticleService.ts`

---

## v0.11.0 - Phase 8: Mejoras Criticas (2026-03-09)

### SEO Article Generation
- Generacion de articulos SEO de 1200+ palabras con OpenRouter (gpt-4o-mini)
- Template con placeholders: `{keyword}`, `{ubicacion}`, `{businessName}`, `{niche}`, `{phone}`
- Renderizado dinamico por keyword en paginas SEO
- Archivos: `src/features/projects/services/seoArticleService.ts`, `src/app/api/projects/[projectId]/generate-article/route.ts`, `src/app/api/projects/[projectId]/article/route.ts`

### Project Wizard (8 pasos)
- Wizard de progreso visual con 8 pasos para configurar un proyecto completo
- Pasos: datos de negocio, contenido SEO, keywords, crear token Google, pegar token, verificar Search Console, enviar sitemap, iniciar indexacion
- Pasos 6/7 son manuales con instrucciones y boton "Marcar completado"
- Estado persistido en campo `wizardState` (JSON) del proyecto
- Archivo: `src/features/projects/components/ProjectWizard.tsx`

### Multi-Token Google Cloud
- Soporte para multiples service accounts por proyecto
- CRUD completo: agregar, eliminar, activar/desactivar tokens
- Rotacion automatica: selecciona el token con mas cuota diaria restante
- Reset automatico de contadores diarios
- Compatibilidad backwards con campo legacy `googleTokenJson`
- Archivos: `src/features/indexing/services/tokenService.ts`, `src/app/api/projects/[projectId]/tokens/route.ts`, `src/app/api/projects/[projectId]/tokens/[tokenId]/route.ts`

### Smart Indexing Order
- 4 estrategias de orden: sequential, random (Fisher-Yates), by_location (round-robin geografico), by_priority (keywords cortas primero)
- Selector de orden en UI del dashboard
- Archivo: `src/features/indexing/services/indexingOrderService.ts`

### Real Indexation Verification
- Verificacion real de indexacion via Google `site:` queries
- Muestreo aleatorio de hasta 20 URLs indexadas
- Reporta porcentaje real vs esperado
- Archivo: `src/app/api/indexing/verify/[projectId]/route.ts`

### Fixes
- robots.txt: eliminado `Disallow: /wp-admin/` innecesario
- Eliminado endpoint `/api/debug` de produccion
- Migracion de `seoArticleTemplate` de coleccion `projects` a `project_landing` (por limite de atributos en Appwrite)

### Database Changes (Appwrite)
- Nueva coleccion: `google_tokens` (9 atributos + indice)
- Nuevo atributo: `projects.wizardState` (string)
- Nuevo atributo: `project_landing.seoArticleTemplate` (string, 50000 chars)
- Removido: `projects.seoArticleTemplate` (migrado a project_landing)

---

## v0.10.0 - Domain-Based SEO Routing Fix

### Breaking Change: Middleware -> Catch-All Route Handlers
- Abandonado middleware para routing de dominios externos (no funciona en Next.js 16 standalone)
- Implementado catch-all route handler `src/app/[...slug]/route.ts` que lee Host header
- Host-aware: `robots.txt/route.ts`, `sitemap.xml/route.ts`
- Utilidades compartidas en `src/features/sites/services/projectLookup.ts`

---
