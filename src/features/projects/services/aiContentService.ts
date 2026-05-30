const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!

interface LandingInput {
  businessName: string
  niche: string
  phone: string
  email: string
  location?: string
  businessDescription?: string
  differentiators?: string
  contentTone?: string
}

interface LandingContent {
  businessDescription: string
  services: Array<{ name: string; description: string }>
  testimonials: Array<{ name: string; text: string; rating: number; role: string }>
  stats: Array<{ value: string; label: string }>
  socialProofMessages: string[]
}

const TONE_MAP: Record<string, string> = {
  profesional: 'profesional y confiable',
  cercano: 'cercano, amigable y accesible',
  premium: 'exclusivo, premium y aspiracional',
  urgente: 'directo, urgente y orientado a accion',
  tecnico: 'tecnico, especializado y con autoridad',
}

const SYSTEM_PROMPT = `Eres un experto en neuromarketing, copywriting de conversión y diseño de landing pages de alto impacto. Tu especialidad es crear contenido que activa los 6 disparadores psicológicos de Cialdini: reciprocidad, escasez, autoridad, consistencia, prueba social y simpatía.

Tu tarea: generar contenido para una landing page de venta directa con foco 100% en conversión.

PRINCIPIOS NEUROMARKETING que debes aplicar:
- Usar lenguaje orientado a BENEFICIOS (no características)
- Crear urgencia real sin sonar falso
- Generar prueba social específica y creíble
- Hablar directamente al dolor del cliente
- Usar números concretos (no "muchos años", sino "14 años")
- CTAs que eliminan el riesgo percibido

FORMATO DE SALIDA (JSON estricto, sin markdown):
{
  "businessDescription": "2-3 párrafos persuasivos sobre el negocio. Primer párrafo: conectar con el dolor/necesidad del cliente. Segundo: propuesta de valor única. Tercero: garantía o prueba de resultados.",
  "services": [
    { "name": "Nombre del servicio (corto, orientado a beneficio)", "description": "1-2 oraciones explicando QUÉ GANA el cliente con este servicio, no qué hace la empresa. Máximo 100 caracteres." }
  ],
  "testimonials": [
    { "name": "Nombre Apellido", "text": "Testimonio específico con resultado concreto: números, tiempo, antes/después. Mínimo 80 palabras. Debe sonar humano y real, no corporativo.", "rating": 5, "role": "Cargo o descripción del cliente" }
  ],
  "stats": [
    { "value": "Número o símbolo impactante (ej: 847, 14+, 98%, $2M+)", "label": "Qué representa ese número en 3-5 palabras" }
  ],
  "socialProofMessages": ["Mensaje de prueba social tipo notificación emergente. Ej: 'Carlos de Quito acaba de solicitar una consulta', 'María reservó su cita hace 3 minutos'"]
}

REGLAS:
- services: 5-8 servicios con nombre Y descripción de beneficio
- testimonials: exactamente 4, con nombres latinoamericanos reales, resultados concretos del nicho
- stats: exactamente 4 estadísticas impactantes y creíbles para el nicho
- socialProofMessages: 10 mensajes variados, con nombres y ciudades del país indicado
- Todo el contenido debe ser 100% relevante al nicho específico
- NUNCA mencionar tecnología, software o desarrollo si el nicho no es tech
- Responde SOLO el JSON, sin texto adicional`

export async function generateLandingContent(input: LandingInput): Promise<LandingContent> {
  const toneInstruction = input.contentTone
    ? `\nTono de comunicación: ${TONE_MAP[input.contentTone] || input.contentTone}.`
    : '\nTono de comunicación: profesional y confiable.'
  const descContext = input.businessDescription
    ? `\nDescripción del negocio: ${input.businessDescription}`
    : ''
  const diffContext = input.differentiators
    ? `\nDiferenciadores clave del negocio: ${input.differentiators}`
    : ''
  const locationCtx = input.location ? `\nUbicación/País: ${input.location}` : ''

  const userPrompt = `Genera el contenido de landing page para:
- Negocio: ${input.businessName}
- Nicho/Industria: ${input.niche}${locationCtx}
- Teléfono: ${input.phone || 'no disponible'}
- Email: ${input.email || 'no disponible'}${descContext}${diffContext}${toneInstruction}

Recuerda: todo el contenido debe ser 100% específico para este nicho. Los testimonios deben mencionar resultados concretos relacionados con "${input.niche}".`

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
      temperature: 0.8,
      max_tokens: 3000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''

  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned) as LandingContent
  return parsed
}
