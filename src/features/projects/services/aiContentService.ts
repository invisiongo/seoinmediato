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
  services: string[]
  testimonials: Array<{ name: string; text: string; location: string }>
  stats: { yearsExperience: number; satisfactionPercent: number; clientsServed: number }
  socialProofMessages: string[]
}

const TONE_MAP: Record<string, string> = {
  profesional: 'profesional y confiable',
  cercano: 'cercano, amigable y accesible',
  premium: 'exclusivo, premium y aspiracional',
  urgente: 'directo, urgente y orientado a accion',
  tecnico: 'tecnico, especializado y con autoridad',
}

const SYSTEM_PROMPT = `Eres un experto en neuromarketing y SEO. Tu tarea es generar contenido para una landing page de venta directa. El contenido debe ser persuasivo, enfocado en conversión, sin relleno. Genera en formato JSON con estos campos: businessDescription (2-3 párrafos describiendo el negocio de forma persuasiva), services (array de 5-8 servicios/beneficios cortos), testimonials (array de 3 testimoniales ficticios con nombre, texto y ubicación), stats (objeto con yearsExperience, satisfactionPercent, clientsServed), socialProofMessages (array de 8-10 mensajes tipo 'María acaba de solicitar información', 'Carlos reservó una cita', etc. variados y relevantes al nicho). Responde SOLO el JSON, sin markdown ni explicaciones.`

export async function generateLandingContent(input: LandingInput): Promise<LandingContent> {
  const toneInstruction = input.contentTone ? `\nTono: ${TONE_MAP[input.contentTone] || input.contentTone}.` : ''
  const descContext = input.businessDescription ? `\nDescripcion del negocio: ${input.businessDescription}` : ''
  const diffContext = input.differentiators ? `\nDiferenciadores clave: ${input.differentiators}` : ''

  const userPrompt = `Genera el contenido para: ${input.businessName}, nicho: ${input.niche}, ubicación: ${input.location || 'México'}, teléfono: ${input.phone}${descContext}${diffContext}${toneInstruction}`

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
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''

  // Clean markdown code blocks if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  const parsed = JSON.parse(cleaned) as LandingContent
  return parsed
}
