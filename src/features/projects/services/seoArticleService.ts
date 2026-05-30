const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!

interface ArticleInput {
  businessName: string
  niche: string
  phone: string
  email: string
}

const SYSTEM_PROMPT = `Eres un experto en SEO y copywriting. Escribes contenido optimizado para posicionamiento local que supera los 1,200 palabras.

IMPORTANTE: Retorna SOLO el HTML del body (sin <!DOCTYPE>, sin <html>, sin <head>). Solo el contenido desde el primer <h1> hasta el ultimo parrafo. Incluye estilos inline basicos para que se vea bien.`

export async function generateSeoArticle(input: ArticleInput): Promise<string> {
  const userPrompt = `Escribe un articulo SEO completo en espanol de minimo 1,200 palabras para el negocio llamado ${input.businessName} (nicho: ${input.niche || 'servicios profesionales'}) ubicado en {ubicacion}.

El articulo debe usar exactamente estos placeholders (no los reemplaces, dejalos tal cual):
- {keyword} → la palabra clave principal
- {ubicacion} → la ubicacion/alcaldia
- {businessName} → nombre del negocio
- {phone} → telefono de contacto

Estructura obligatoria:
<h1>{keyword}</h1>

Seccion 1 (200 palabras): Que es {keyword} y por que las empresas en {ubicacion} lo necesitan urgentemente
Seccion 2 (200 palabras): Beneficios concretos y medibles de implementar {keyword}
Seccion 3 (200 palabras): Como trabaja {businessName} para entregar {keyword} en {ubicacion}
Seccion 4 (150 palabras): Proceso de implementacion paso a paso
Seccion 5 (150 palabras): Casos de exito y resultados reales
Seccion 6 (150 palabras): Preguntas frecuentes (minimo 5 preguntas con respuestas detalladas)
Seccion 7 (150 palabras): CTA final con link a WhatsApp: https://wa.me/{phone}

Usa etiquetas HTML: h1, h2, h3, p, ul, li, section.
El tono es profesional pero cercano.
Menciona {ubicacion} al menos 8 veces naturalmente en el texto.
Menciona {keyword} al menos 10 veces naturalmente en el texto.
NO uses markdown, solo HTML.
El articulo debe tener MINIMO 1,200 palabras contadas.

IMPORTANTE: Este articulo DEBE tener minimo 1,200 palabras.
Cada seccion debe tener al menos 200 palabras.
Expande cada seccion con mas detalles, ejemplos especificos y contexto local de {ubicacion}.
Agrega una seccion extra de 200 palabras titulada:
"¿Por que elegir {businessName} para {keyword} en {ubicacion}?"
con diferenciadores competitivos, experiencia del equipo y garantias.
NO acortes ninguna seccion. Si una seccion tiene menos de 200 palabras, expandela.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''

  // Clean markdown code blocks if present
  const cleaned = text.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim()

  return cleaned
}

/**
 * Replace placeholders in the article template with actual values.
 */
export function renderArticle(
  template: string,
  keyword: string,
  location: string,
  businessName: string,
  niche: string,
  phone: string
): string {
  return template
    .replace(/\{keyword\}/g, keyword)
    .replace(/\{ubicacion\}/g, location || 'tu zona')
    .replace(/\{businessName\}/g, businessName)
    .replace(/\{niche\}/g, niche)
    .replace(/\{phone\}/g, phone.replace(/[^0-9]/g, ''))
}

/**
 * Count words in an HTML string (strip tags first).
 */
export function countWords(html: string): number {
  const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return textOnly.split(' ').filter(Boolean).length
}
