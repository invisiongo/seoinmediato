# GUÍA COMPLETA — SEOInmediato
## Cómo posicionar un negocio desde cero hasta indexado en Google

---

## ANTES DE EMPEZAR — Lo que necesitas tener listo

- Dominio del cliente (ej: `tunegocio.com` o un subdominio `seo.tunegocio.com`)
- Acceso al panel DNS del dominio (Cloudflare, GoDaddy, Namecheap, etc.)
- Acceso a Dokploy en `server2.invisiongo.com`
- Una cuenta de Google para Google Cloud Console y Google Search Console
- La IP del servidor: la encuentras en Dokploy → General del proyecto

---

## PASO 1 — Configurar el dominio (DNS + Dokploy)

### En Cloudflare (o donde esté el DNS del dominio)

1. Entra al panel DNS de tu registrador
2. Crea un registro nuevo:
   - **Tipo:** `A`
   - **Nombre:** el subdominio que usarás (ej: `seo` si quieres `seo.tunegocio.com`), o `@` si es el dominio raíz
   - **Valor:** la IP del servidor de Dokploy
   - **TTL:** Auto
   - En Cloudflare, **desactiva el proxy naranja** (clic en la nube hasta que quede gris) — esto es obligatorio; si lo dejas activo, Cloudflare intercepta el tráfico y el certificado SSL del servidor deja de funcionar
3. Guarda el registro

> El DNS puede tardar entre 5 minutos y 48 horas en propagarse según el registrador. Lo normal es menos de 30 minutos.

> Si usas subdominio: `seo.tunegocio.com` → registro A → IP del servidor
> Si usas dominio completo: `tunegocio.com` → registro A → IP del servidor

### En Dokploy

1. Ve a `server2.invisiongo.com` → proyecto SEOInmediato → **Domains**
2. Clic en **Add Domain**
3. Escribe el dominio: `seo.tunegocio.com`
4. Puerto: `3000`
5. Guarda y da clic en **Deploy** para que Traefik reconozca el dominio nuevo

> **El certificado HTTPS (SSL) se genera automáticamente.** No necesitas comprar nada ni configurar nada extra. Dokploy lo gestiona solo vía Let's Encrypt en cuanto el DNS está apuntando al servidor.

---

## PASO 2 — Entrar al dashboard

- **URL:** `https://app.seoinmediato.com`
- Email y contraseña: los que te entregó tu proveedor

---

## PASO 3 — Crear el proyecto

Ve a **Proyectos** → botón **Nuevo proyecto**

Llena todos los campos:

| Campo | Qué poner | Por qué importa |
|---|---|---|
| **Nombre del proyecto** | Nombre descriptivo (ej: "Clínica Dental Quito") | Se usa internamente y en el sitemap |
| **Dominio** | URL completa con https:// (ej: `https://seo.tunegocio.com`) | Es donde van a vivir todas las páginas SEO |
| **Nombre del negocio** | Nombre comercial del cliente | Aparece en la landing y artículos |
| **Teléfono** | Con código de país (ej: `+593 99 123 4567`) | Se usa en el botón de WhatsApp de la landing |
| **Email** | Email de contacto del negocio | Aparece en el footer y schema SEO |
| **Nicho** | Rubro del negocio (ej: `Odontología`, `Restaurante`, `Abogados`) | La IA genera TODO el contenido basándose en esto |
| **Modo SEO** | `Subdominio + Redirect` si ya tiene web, `Sitio completo` si es su único sitio | Determina cómo funcionan las URLs |
| **URL de redirección** | Su sitio web principal (ej: `https://www.tunegocio.com`) | El botón "Ver nuestros servicios" en la landing lleva aquí |
| **Diferenciadores** | Lo que hace único al negocio (ej: `equipo certificado, pago en cuotas, garantía escrita`) | La IA los usa para personalizar el contenido |
| **Tono** | `Profesional`, `Cercano`, `Premium`, `Urgente` o `Técnico` | Define cómo suena todo el texto generado |

Clic en **Crear proyecto**.

### El wizard — tu guía de progreso

Una vez creado el proyecto, al entrar verás un panel llamado **Asistente de configuración** con 8 pasos. Cada paso se marca automáticamente en verde cuando está completo. Es tu referencia principal para saber qué falta y en qué orden hacerlo. Si un paso sigue en rojo, algo de esa sección no está terminado.

---

## PASO 4 — Generar las keywords

Ve al menú **Keywords** → selecciona tu proyecto en el desplegable de arriba.

### Pestaña Servicios / Productos
Escribe cada servicio en una línea separada. Sin comas. Ejemplo:
```
Limpieza dental
Blanqueamiento
Ortodoncia
Implantes dentales
```

### Pestaña Ubicaciones
Escribe cada ciudad o zona en una línea separada. Ejemplo:
```
Quito
Guayaquil
Cuenca
Ambato
```
También puedes cargar desde un archivo TXT o CSV con el botón **Importar archivo**.

### Pestañas Modificadores ANTES y DESPUÉS
Vienen preseleccionados los más comunes. Activa/desactiva según el negocio. Puedes agregar modificadores personalizados al final de la lista.

### Límite de keywords (opcional)
Si no quieres generar miles de combinaciones, pon un número en el campo **Límite de keywords** (ej: `5000`). Si lo dejas vacío, genera todas las combinaciones posibles.

### Generar y guardar
1. Clic en **Generar keywords** — aparece una vista previa con todas las combinaciones
2. Revisa que se vean bien
3. Clic en **Guardar en proyecto** — este segundo botón es el que realmente guarda

> El número de keywords = servicios × modificadores × ubicaciones. Con 5 servicios, 18 modificadores y 4 ubicaciones puedes llegar a miles de combinaciones.

---

## PASO 5 — Generar el artículo SEO base

Entra al proyecto (menú **Proyectos** → clic en el nombre del proyecto).

Ve a la pestaña **Keywords** → sección **Artículo SEO (1,200+ palabras)**.

Clic en **Generar con IA**.

La IA crea un artículo base de más de 1,200 palabras que se usa como plantilla para cada página de keyword individual.

**Qué es una "página de keyword individual":** Por cada keyword guardada (ej: "limpieza dental Quito") se crea automáticamente una página pública en el dominio del cliente (ej: `https://seo.tunegocio.com/limpieza-dental-quito`). Esa página tiene el diseño de la landing pero con el contenido del artículo adaptado a esa keyword específica. Si tienes 5,000 keywords, tienes 5,000 páginas. Sin el artículo base, esas páginas tienen diseño pero sin texto SEO.

Cuando termina aparece el contador de palabras en verde. Clic en **Guardar artículo**.

---

## PASO 6 — Generar y configurar la landing

Ve a la pestaña **Landing** del proyecto.

### Generar contenido con IA
Clic en **Regenerar con IA** — la IA genera automáticamente:
- Descripción del negocio (basada en el nicho y diferenciadores)
- 5-8 servicios con descripciones orientadas a beneficios
- 4 testimonios con resultados concretos
- 4 estadísticas impactantes
- 10 mensajes de prueba social (notificaciones emergentes)

### Configurar apariencia
En la sección **Apariencia** elige el tema visual:

**Claros (profesionales):**
- `Blanco limpio (azul)` — salud, legal, finanzas
- `Gris minimal (negro)` — el más minimalista
- `Crema/Beige (terracota)` — restaurantes, spas, boutiques
- `Verde fresco` — salud, nutrición, bienestar
- `Azul corporativo` — B2B, empresas

**Oscuros (impactantes):**
- `Dark Pro`, `Dark Navy`, `Midnight Gold`, `Crimson`, `Sunset Orange`, `Royal Purple`

### Agregar logo (opcional)
En **Favicon / Logo**, pega la URL de la imagen del logo del cliente (debe ser pública, formato PNG, mínimo 48x48px).

### Agregar video (opcional)
En **Video de YouTube**, pega la URL del video del negocio (`youtube.com/watch?v=...`) o el código iframe completo que te da YouTube. Aparece en la landing justo debajo del texto de presentación.

### Agregar redes sociales (opcional)
En **Redes sociales y mapa**, pega las URLs de Facebook, Instagram y Google Maps del negocio.

### Guardar cambios
Clic en **Guardar cambios** después de cualquier modificación en esta pestaña.

### Ver la landing
Clic en **Vista previa** — se abre la landing en una pestaña nueva.

> La landing se sirve desde el dominio del cliente (ej: `https://seo.tunegocio.com/`). Necesitas que el DNS esté propagado (Paso 1) para verla correctamente.

**La diferencia entre la landing y las páginas de keywords:**
- **Landing** (`https://seo.tunegocio.com/`) — es la página de inicio del subdominio SEO. Presenta el negocio, tiene el video, los servicios, testimonios y el botón de WhatsApp. Se genera con IA desde esta pestaña.
- **Páginas de keywords** (`https://seo.tunegocio.com/limpieza-dental-quito`) — son las miles de páginas individuales, una por cada keyword. Estas se generan automáticamente usando el artículo base del Paso 5. No necesitas hacer nada para crearlas — existen desde el momento en que guardas las keywords.

---

## PASO 7 — Obtener el token de Google (Google Cloud Console)

Este token permite que la plataforma le diga a Google qué páginas indexar.

### 7.1 — Crear proyecto en Google Cloud

1. Ve a `console.cloud.google.com`
2. Arriba a la izquierda, clic en el selector de proyectos → **Nuevo proyecto**
3. Nombre: algo como `seo-tunegocio` → clic en **Crear**

### 7.2 — Habilitar las APIs necesarias

Con el proyecto seleccionado:

1. Menú izquierdo → **APIs y servicios** → **Biblioteca**
2. Busca `Indexing API` → selecciona **Web Search Indexing API** → clic en **Habilitar**
3. Vuelve a Biblioteca → busca `Search Console API` → clic en **Habilitar**

> Cada API se habilita por separado. Si no se habilitan, Google responde con error 403.

### 7.3 — Crear la cuenta de servicio

1. Menú izquierdo → **APIs y servicios** → **Credenciales**
2. Clic en **Crear credenciales** → **Cuenta de servicio**
3. Nombre: `indexing-seoinmediato`
4. Clic en **Crear y continuar** → saltar los pasos opcionales → **Listo**

### 7.4 — Descargar la clave JSON

1. En la lista de cuentas de servicio, clic en la que acabas de crear
2. Pestaña **Claves** → **Agregar clave** → **Crear clave nueva**
3. Formato: **JSON** → clic en **Crear**
4. Se descarga automáticamente un archivo `.json` — **no lo pierdas ni lo compartas**

El archivo se ve así:
```json
{
  "type": "service_account",
  "project_id": "seo-tunegocio",
  "private_key_id": "...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "client_email": "indexing-seoinmediato@seo-tunegocio.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## PASO 8 — Configurar Google Search Console

Google Search Console necesita conocer la cuenta de servicio antes de permitirle indexar.

### 8.1 — Agregar la propiedad

1. Ve a `search.google.com/search-console`
2. Clic en **Agregar propiedad**
3. Selecciona **Prefijo de URL** → escribe `https://seo.tunegocio.com` → continuar
4. Google te pide verificar que el dominio es tuyo. El método más fácil según donde tengas el dominio:

**Si usas Cloudflare:**
- Google te da un registro TXT (ej: `google-site-verification=XXXXXX`)
- Ve a Cloudflare → DNS → Agregar registro → Tipo: `TXT`, Nombre: `seo` (o `@`), Contenido: el código que te dio Google
- Vuelve a Search Console → clic en **Verificar**

**Si no usas Cloudflare:**
- Descarga el archivo HTML que te ofrece Google
- Súbelo a la raíz del dominio (si tienes acceso al hosting)
- Vuelve a Search Console → clic en **Verificar**

> Si el sitemap dice "No se puede recuperar" después de enviarlo, espera a que el DNS termine de propagar (puede tardar hasta 48 horas) y vuelve a intentarlo.

### 8.2 — Agregar la cuenta de servicio como Propietario

1. En Search Console → **Configuración** (rueda de ajustes) → **Usuarios y permisos**
2. Clic en **Agregar usuario**
3. **Email:** el valor de `client_email` del JSON descargado
   (ej: `indexing-seoinmediato@seo-tunegocio.iam.gserviceaccount.com`)
4. **Permiso:** `Propietario`
5. Clic en **Agregar**

> Sin este paso, Google rechaza todas las solicitudes de indexación.

---

## PASO 9 — Pegar el token en la plataforma

Regresa al proyecto en `app.seoinmediato.com` → pestaña **General** → sección **Tokens Google Indexing API**.

1. **Nombre del token:** un nombre para identificarlo (ej: `Token principal`)
2. **Contenido JSON:** pega todo el contenido del archivo `.json` descargado
3. Clic en **Agregar token**

El token aparece en la lista con el email de la cuenta de servicio. El estado debe mostrarse como activo.

---

## PASO 10 — Enviar el Sitemap a Google Search Console

1. En el proyecto → pestaña **General** → copia la URL del Sitemap que aparece ahí
   (ej: `https://seo.tunegocio.com/sitemap-clinica-dental-quito.xml`)
2. En Google Search Console → menú izquierdo → **Sitemaps**
3. Pega la URL del sitemap → clic en **Enviar**

Google confirma si es válido y muestra cuántas URLs descubrió.

> El sitemap solo tiene contenido si ya guardaste keywords en el Paso 4.

---

## PASO 11 — Configurar e iniciar la indexación

Ve al proyecto → pestaña **Indexación**.

### Configurar

| Ajuste | Qué hace | Recomendación |
|---|---|---|
| **URLs por ciclo** | Máximo de URLs que se envían a Google por ejecución automática | Déjalo en `200` (es el límite diario de Google por token) |
| **Orden de envío** | En qué orden se procesan las keywords | **Por ubicación** para negocios locales — Google ve variedad geográfica desde el día 1 |

**Opciones de orden explicadas:**
- **Secuencial:** en el orden en que se generaron las keywords
- **Aleatorio:** orden mezclado, útil para evitar patrones
- **Por ubicación:** rota entre ciudades (una de Quito, una de Guayaquil, etc.) — recomendado para negocios locales
- **Por prioridad:** keywords más cortas primero (mayor volumen de búsqueda general)

### Iniciar
Clic en **Iniciar indexación**.

La plataforma envía URLs a Google una por una con 25-35 segundos de espera entre cada una. Cuando llega al límite diario del token se pausa automáticamente y retoma al día siguiente.

**No necesitas hacer nada más.** El sistema corre automáticamente cada 30 minutos. Si hay keywords pendientes y tokens activos, las procesa solo.

> **Importante — "indexado" en la plataforma no es lo mismo que aparecer en Google.** Cuando la plataforma marca una URL como "indexada" significa que le envió la solicitud a Google. Google luego decide cuándo visitar esa página y cuándo agregarla a sus resultados de búsqueda. Ese proceso adicional puede tardar entre 1 día y varias semanas según la autoridad del dominio y la velocidad de los crawlers de Google.

### Monitorear
En la pestaña **Indexación** del proyecto ves:
- Cantidad de URLs indexadas exitosamente
- URLs con error
- URLs pendientes
- Estado del token (activo o pausado por cuota)

En el menú principal **Indexación** ves todos los proyectos activos con su progreso.

---

## FLUJO COMPLETO DE UN VISTAZO

```
1. DNS: Crear registro A con la IP del servidor
2. Dokploy: Agregar el dominio del cliente → Deploy
3. Dashboard: Crear proyecto (llenar TODOS los campos)
4. Keywords: Servicios + Ubicaciones → Generar → Guardar en proyecto
5. Artículo SEO: Generar con IA → Guardar
6. Landing: Regenerar con IA → Elegir tema → Guardar cambios
7. Google Cloud: Nuevo proyecto → Habilitar APIs → Crear cuenta de servicio → Descargar JSON
8. Google Search Console: Agregar propiedad → Verificar → Agregar cuenta de servicio como Propietario
9. Plataforma: Pegar JSON del token → Agregar
10. Search Console: Enviar sitemap
11. Plataforma: Configurar orden → Iniciar indexación (automático de aquí en adelante)
```

---

## PREGUNTAS FRECUENTES

**¿Cuánto tarda en indexar todo?**
Con 200 URLs/día y 5,000 keywords: ~25 días. Con múltiples tokens el proceso es más rápido (3 tokens = 600 URLs/día).

**¿Puedo tener más de un token por proyecto?**
Sí. Cada token tiene su propia cuota de 200 URLs/día. Todos se usan en rotación automática.

**¿Qué pasa si el token da error 429?**
El sistema lo pausa 1 hora automáticamente y continúa con otros tokens disponibles. Al día siguiente se reactiva solo.

**¿Necesito generar el artículo antes que la landing?**
No son dependientes. Pero sí necesitas el artículo para que las páginas individuales de keywords tengan contenido SEO de texto.

**¿La landing se actualiza sola si cambio datos del proyecto?**
No. Si cambias teléfono, diferenciadores u otros datos, ve a Landing → **Regenerar con IA** → **Guardar cambios**.

**¿El sitemap se actualiza solo cuando agrego keywords nuevas?**
Sí. Se genera dinámicamente en cada visita, siempre refleja el estado actual de las keywords.

**¿Puedo pausar la indexación?**
Sí. En la pestaña Indexación hay un botón para pausar. También puedes pausar el proyecto completo desde la pestaña General.

**¿Perdí el archivo JSON del token, qué hago?**
Entra a Google Cloud Console → el proyecto → Credenciales → la cuenta de servicio → Claves → elimina la clave anterior → crea una nueva clave JSON. Descárgala y pégala en la plataforma como un token nuevo.

**¿"Indexado" significa que ya aparezco en Google?**
No. "Indexado" en la plataforma significa que se envió la solicitud a Google. Google decide cuándo visitar y agregar la página a sus resultados. Puede tardar días o semanas. Para verificarlo, busca en Google: `site:seo.tunegocio.com` — si aparecen resultados, Google ya las tiene.
