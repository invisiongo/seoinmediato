# Playbook SEO Multi-Dominio — SEOImediato + Sitios Originales

> Este documento es el manual operativo para integrar SEO masivo en sitios originales de Invision (SAN, Jorca, futuros).
> Está escrito desde lo aprendido el 2026-05-04 con SAN y Jorca. Cada sección incluye el "qué hacer", "qué verificar", y "qué hacer si falla".

---

## Modelo arquitectónico (verdad única)

Hay **3 patrones reales** para servir páginas SEO masivas con SEOImediato. No mezclar. Decidir cuál antes de tocar nada.

### Patrón A — Subdominio dedicado a SEOImediato
- **Cuándo:** Cliente sin sitio web propio, o quiere SEO en subdominio (`mx.cliente.com`).
- **Quién renderiza:** SEOImediato sirve la página, lee keywords desde su Appwrite.
- **Plantilla:** `neuro-landing` o variante custom dentro de SEOImediato.
- **Pros:** sin tocar repo del cliente. Cero cambios de código en sitio principal.
- **Contras:** SEO no se acumula en dominio raíz; estilos limitados al template de SEOImediato.
- **Caso real:** tu-dominio.com/servicios/{slug} (vía Cloudflare Worker proxy).

### Patrón B — Dominio satélite (cliente con sitio externo)
- **Cuándo:** Cliente tiene sitio en hosting que no controlamos (Wix, IONOS, etc.).
- **Quién renderiza:** Repo Next.js NUEVO (satélite) en nuestro Dokploy, con keywords baked en `src/data/seo/`.
- **DNS:** dominio satélite (ej: `tu-dominio.com`) → IP Dokploy.
- **Pros:** sin tocar el sitio del cliente. Estilos nativos de Next.js. Funciona perfecto.
- **Contras:** dominio nuevo (~$15/año). SEO no acumula en marca principal.
- **Caso real:** tu-dominio.com (satélite de tu-sitio-principal.com).

### Patrón C — Rutas SEO dentro del repo del cliente
- **Cuándo:** Cliente tiene sitio en NUESTRO Dokploy (Next.js), queremos consolidar autoridad SEO en su dominio principal.
- **Quién renderiza:** Su propio Next.js, con rutas `/{prefijo}/[slug]` que reusan la home con hero overrideable.
- **Keywords:** baked como TypeScript estático en `src/data/keywords/` (NO leer Appwrite cross-project).
- **SEOImediato:** SOLO empuja URLs a Indexing API; no renderiza.
- **Pros:** SEO consolidado en marca real. Estilos 100% nativos.
- **Contras:** modificas (mínimamente) el repo del cliente. Repo más grande (~6MB extra de keywords baked).
- **Caso real:** tu-dominio.com, tu-dominio.com (esto que armamos hoy).

**Decisión:** una vez elegido el patrón, NO cambiar a medio camino. Cambiar arquitectura cuesta días. Si dudas, elige B (satélite) — es el menos invasivo y más rápido de armar.

---

## Patrón C — Pasos en orden (probado con SAN/Jorca)

Este es el patrón más complejo. Lo documento paso por paso porque es donde más errores cometí hoy.

### Pre-requisitos

1. Repo del cliente es Next.js (App Router).
2. Cliente tiene su propio servicio en Dokploy con dominio `cliente.com` Path `/`.
3. Keywords listas en CSV con columnas: `keyword,estado,pais,idioma,prioridad,intencion`.
4. Service accounts de Google Cloud creados (5 por dominio idealmente).
5. Acceso a Cloudflare del dominio.
6. Acceso a Google Search Console (cliente con dominio verificado como Domain Property).

### Paso 1 — SEOImediato: setup proyectos + tokens

Script base: `scripts/setup-{cliente}.py` (modelo: `setup-san-jorca.py`).

Crea en Appwrite SEOImediato:
- 1 proyecto padre (domain = cliente.com, seoPathPrefix = "")
- N regiones hijas con `parentProjectId`, `seoPathPrefix` distinto por idioma
- 5 google_tokens por dominio (todos `isActive: false` al inicio)
- project_landing diferenciado

**VERIFICAR:** todos los proyectos creados en Appwrite, `totalKeywords` correcto en regiones, parent en 0.

### Paso 2 — SEOImediato: bake keywords como datos estáticos

Script: `scripts/bake-keywords.py` adaptado al cliente.

Genera en el repo del cliente:
- `src/data/keywords/{region-id}.ts` — uno por región, exporta `keywords` array
- `src/data/keywords/index.ts` — re-exporta `regions`, `findKeyword`, `findRegionBySitemapSlug`, `regionNameToSlug`

**VERIFICAR:** archivos generados con tamaño esperado (~150 bytes × keywords).

### Paso 3 — Cliente repo: rutas SEO

Crear en el repo del cliente:

```
src/app/{prefijo-es}/[slug]/page.tsx   — ej: src/app/inmuebles/[slug]/page.tsx
src/app/{prefijo-en}/[slug]/page.tsx   — ej: src/app/real-estate/[slug]/page.tsx
src/app/sitemap.xml/route.ts           — índice maestro
src/app/sitemap/[name]/route.ts        — sitemap por región (urlset directo)
```

En `next.config.ts` agregar rewrite:
```ts
async rewrites() {
  return [
    { source: '/sitemap-:name.xml', destination: '/sitemap/:name' }
  ]
}
```

**EVITAR estos errores conocidos:**

- ❌ Folder `sitemap-[name].xml/` (Next.js 16 falla type check con folders mixto dinámico/estático).
  ✅ Usar `sitemap/[name]/` con rewrite.

- ❌ Sitemap regional como índice anidado con paginación de 1000 URLs.
  ✅ Sitemap regional = urlset DIRECTO con TODAS las URLs (límite Google: 50K, suficiente).

- ❌ `setRequestLocale` sin asegurar que `i18n.ts` lo respete.
  ✅ Modificar `i18n.ts` para que honre `requestLocale` antes de leer cookie.

- ❌ Modificar componente Hero/Banner del cliente borrando lo que tenía.
  ✅ Agregar props OPCIONALES `overrideTitle`/`overrideH1`. Default vacío = usa `t()` original.

### Paso 4 — Build local antes de pushear (NO SALTAR)

```bash
cd <repo-cliente>
npm run build    # NO solo typecheck — npm run build catch errores de Next.js
```

Si build pasa → push. Si no, fix antes de pushear.

**VERIFICAR:** build output lista las nuevas rutas (`/inmuebles/[slug]`, `/sitemap/[name]`, etc.).

### Paso 5 — Push y deploy en Dokploy

```bash
git add -A && git commit -m "feat: SEO routes" && git push
```

En Dokploy: si auto-deploy no está conectado, click **Deploy** manual.

**VERIFICAR:** deploy verde en Dokploy. Logs sin error.

### Paso 6 — Smoke test en producción

Probar:
1. Home `cliente.com/` → debe responder igual que antes (200, sin cambios visuales).
2. Una URL SEO real `cliente.com/inmuebles/{slug-real}` → 200, landing visualmente idéntica con keyword en H1.
3. `cliente.com/sitemap.xml` → debe ser un `<sitemapindex>` listando 5 regionales.
4. `cliente.com/sitemap-{region}.xml` → debe ser un `<urlset>` con todas las URLs (NO un nested index).

**Si algo falla, NO avanzar.** Diagnosticar primero.

### Paso 7 — Cloudflare: ajustar cache de sitemaps

Default: sitemap retorna `Cache-Control: s-maxage=86400` (24h). Cloudflare cachea esa duración.

**Opcional:** reducir a `s-maxage=300` (5 min) para que cambios futuros propaguen rápido.

**Cuando hagas un cambio en estructura de sitemaps:** Purge Everything en Cloudflare. Sin esto, Google sigue leyendo cache viejo.

### Paso 8 — Google Search Console: agregar service accounts

Para Indexing API funciona, los 5 service accounts deben ser **Verified Owners** de la Domain Property.

**Camino correcto:**
1. GSC → propiedad → Settings → Users and permissions → Add user → email del service account, permission = Owner.
2. **Si sale "correo no encontrado"**: NO es error real. Es delay de Google. **Espera 24h**, mañana al volver van a estar como Owner verificado. Comportamiento conocido (pasó con AV Digital y SAN/Jorca).

**Alternativa robusta:** TXT record en Cloudflare por cada service account vía "Ownership verification → Otra verificación → DNS". Funciona inmediato pero es tedioso (1 TXT por service account).

### Paso 9 — Subir sitemaps a GSC

En cada propiedad, en Sitemaps:
- `sitemap.xml` (índice)
- `sitemap-{cliente}-es-mexico.xml`
- `sitemap-{cliente}-es-usa.xml`
- `sitemap-{cliente}-en-mexico.xml`
- `sitemap-{cliente}-en-usa.xml`
- `sitemap-{cliente}-en-canada.xml` (si aplica)

**VERIFICAR (al día siguiente, no inmediato):**
- Estado: "Correcto"
- Páginas descubiertas: el número correcto (28K, 9K, 2K, etc.)
- Si muestra 0: probablemente cache de Cloudflare con versión vieja. Purge.

### Paso 10 — Activar tokens (SOLO después de Paso 8 confirmado)

```python
# Set isActive: true en los 10 google_tokens
```

**REGLA DE ORO:** NO activar tokens hasta que GSC confirme que los service accounts son Owners. Si no, cada push gasta cuota sin indexar.

**Tras activar:** monitorear `seoinmediato.com/dashboard/indexing` cada hora durante el primer día. Si ves 403s, los Owners no están bien. Pausar tokens y esperar.

---

## Checklist de verificación operativa

Cada vez que un nuevo cliente entre al patrón C, este checklist debe completarse al 100% antes de declarar "indexación funcionando":

- [ ] Build local pasa (`npm run build`, no solo typecheck)
- [ ] Deploy en Dokploy completado sin error
- [ ] `cliente.com/` responde 200 con landing visualmente intacta
- [ ] `cliente.com/inmuebles/{slug-real}` responde 200 con landing visualmente igual + keyword en H1
- [ ] `cliente.com/sitemap.xml` es un `<sitemapindex>` (NO `<urlset>`)
- [ ] `cliente.com/sitemap-{region}.xml` es un `<urlset>` con N URLs (NO un nested index)
- [ ] curl directo verifica los 5 sitemaps regionales con sus conteos exactos
- [ ] Cloudflare Purge Everything ejecutado
- [ ] GSC: service accounts visibles como Owners (puede ser al día siguiente)
- [ ] GSC: 5 sitemaps regionales subidos
- [ ] GSC: estado "Correcto" en los 5
- [ ] GSC: páginas descubiertas = N por región (puede tardar 24-48h)
- [ ] Tokens activados solo después de confirmar todo arriba
- [ ] Dashboard indexación de SEOImediato muestra URLs sent/indexed > 0 sin errores 403
- [ ] Después de 1h: zero errores 403 en logs del cron

---

## Errores comunes y diagnóstico rápido

### Síntoma: URL SEO devuelve 404
- Curl los headers: `curl -sI URL`
- Si `X-Powered-By: Next.js` y `Cache-Control: private` → cae en el contenedor del cliente, no en SEOImediato.
- Verificar que la ruta existe en el repo del cliente y el deploy está al día.

### Síntoma: URL SEO devuelve 200 pero sin estilos (página "desnuda")
- Estás sirviendo HTML estático sin scripts de hidratación de Next.js.
- Solución: NO clonar HTML, usar el patrón C (rutas dentro del repo del cliente).

### Síntoma: GSC dice "Correcto" pero 0 páginas descubiertas
- Causa probable 1: Sitemap es nested index, no urlset directo. Curl el contenido y verifica.
- Causa probable 2: Cloudflare sirve cache vieja. Purge Everything.
- Causa probable 3: Google aún no ha releído (esperar 24h o "Volver a enviar").

### Síntoma: GSC "correo no encontrado" al agregar service account
- NO es un error real. Es delay de Google. Esperar 24h. Aparece como Owner al día siguiente.

### Síntoma: Cron empuja URLs pero indexed = 0 después de 24h
- Verificar headers de respuesta del Indexing API en logs.
- Si 403: service accounts no son Owners. Volver a Paso 8.
- Si 200: Google las recibió. La indexación efectiva tarda 7-30 días normalmente.

### Síntoma: Tokens consumen cuota sin indexar
- Pausar tokens inmediatamente.
- Diagnosticar antes de re-activar.

---

## Reglas que NUNCA debo romper

1. **NUNCA pushear sin `npm run build` local exitoso.** typecheck no es suficiente.
2. **NUNCA activar tokens antes de verificar Owners en GSC.**
3. **NUNCA cambiar arquitectura a medio camino.** Si patrón A no funciona, NO probar patrón B sin reset completo.
4. **NUNCA modificar componentes existentes destructivamente.** Solo agregar props opcionales.
5. **NUNCA prometer "es seguro" sin haber verificado los 5 criterios:**
   - Compila local
   - Deploy verde
   - Home intacta
   - URL SEO renderiza
   - Sitemap correcto
6. **NUNCA decirle al cliente que "ya funciona" sin abrir las URLs en el navegador yo mismo.**

---

## Aprendizajes específicos del 2026-05-04 (SAN + Jorca)

### Cloudflare cache de 24h congeló sitemaps viejos
- Después de fix, GSC seguía leyendo nested index.
- Mitigación: bajar `s-maxage` de sitemaps a 300 (5 min) en código futuro.

### Next.js 16 no soporta folders `prefix-[param].extension`
- `app/sitemap-[name].xml/route.ts` → typecheck falla.
- Workaround: rewrite `/sitemap-:name.xml → /sitemap/:name` y usar folder `sitemap/[name]/`.

### styled-jsx requiere los scripts de Next.js para aplicar
- Clonar HTML estático y strippear `<script>` deja la página sin estilos.
- Solución: NO clonar HTML, usar rutas en el repo nativo (patrón C).

### GSC delay con service accounts
- Comportamiento conocido del usuario (visto antes con AV Digital).
- "Correo no encontrado" hoy → mañana aparece como Owner verificado.
- NO es un error técnico nuestro.

### Sitemap regional debe ser urlset directo
- Daxi tiene 2 niveles: master index → urlset directo. Funciona inmediato en GSC.
- Mi 3-niveles (master → regional index → paged urlsets) → GSC reporta 0.
- Fix: regional sitemap = urlset directo con TODAS las URLs (límite Google 50K por sitemap).
