/**
 * Dynamic service content based on keyword category.
 * Detects the service type from the keyword and returns relevant content.
 * 40 service types mapped to specific descriptions, benefits, and use cases.
 */

interface ServiceContent {
  heroSubtitle: string
  description: string
  benefits: Array<{ title: string; desc: string }>
}

interface ServiceCategory {
  patterns: string[]
  content: ServiceContent
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    patterns: ['crm para empresas', 'software crm'],
    content: {
      heroSubtitle: 'Gestión de clientes que impulsa tus ventas',
      description: 'Un CRM bien implementado centraliza toda la información de tus clientes, automatiza el seguimiento de ventas y te da visibilidad completa de tu pipeline comercial. Deja de perder oportunidades por falta de seguimiento.',
      benefits: [
        { title: 'Pipeline de ventas visual', desc: 'Visualiza cada oportunidad comercial y su estado en tiempo real.' },
        { title: 'Seguimiento automatizado', desc: 'Recordatorios, emails y tareas automáticas para nunca perder un cliente.' },
        { title: 'Reportes de rendimiento', desc: 'Métricas claras de conversión, ticket promedio y ciclo de venta.' },
        { title: 'Integración WhatsApp', desc: 'Conecta tu CRM con WhatsApp para atender clientes desde una sola plataforma.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de crm'],
    content: {
      heroSubtitle: 'CRM personalizado para tu operación comercial',
      description: 'Desarrollamos CRMs a la medida de tu proceso de ventas. No te adaptas a un software genérico — el software se adapta a cómo vendes tú. Desde prospección hasta postventa, todo en un solo lugar.',
      benefits: [
        { title: 'Diseñado para tu proceso', desc: 'Flujos de venta que reflejan exactamente cómo opera tu equipo comercial.' },
        { title: 'Escalable', desc: 'Crece contigo: desde 5 vendedores hasta equipos de 500+.' },
        { title: 'Datos que importan', desc: 'Dashboards con las métricas que realmente mueven tu negocio.' },
        { title: 'Sin licencias mensuales', desc: 'Tu CRM, tu propiedad. Sin pagos recurrentes a terceros.' },
      ],
    },
  },
  {
    patterns: ['erp para empresas', 'software erp'],
    content: {
      heroSubtitle: 'Control total de tu operación empresarial',
      description: 'Un ERP integra finanzas, inventario, compras, producción y recursos humanos en un solo sistema. Elimina hojas de cálculo dispersas y toma decisiones con datos reales en tiempo real.',
      benefits: [
        { title: 'Todo conectado', desc: 'Finanzas, inventario, compras y RRHH en una sola plataforma.' },
        { title: 'Elimina duplicidad', desc: 'Un dato se captura una vez y fluye a todos los departamentos.' },
        { title: 'Control financiero', desc: 'Cuentas por cobrar, por pagar, flujo de caja y estados financieros al instante.' },
        { title: 'Decisiones informadas', desc: 'Reportes ejecutivos con datos actualizados, no del mes pasado.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de erp'],
    content: {
      heroSubtitle: 'ERP hecho a la medida de tu empresa',
      description: 'Desarrollamos sistemas ERP que se ajustan a tu operación, no al revés. Cada módulo refleja tus procesos reales: desde la cotización hasta la entrega, pasando por producción e inventario.',
      benefits: [
        { title: 'Módulos que necesitas', desc: 'Solo pagas por lo que usas. Sin funcionalidades infladas que nadie toca.' },
        { title: 'Tu flujo, tus reglas', desc: 'Aprobaciones, alertas y automatizaciones según tu operación real.' },
        { title: 'Migración segura', desc: 'Trasladamos tus datos actuales sin perder un solo registro.' },
        { title: 'Capacitación incluida', desc: 'Tu equipo aprende a usarlo desde el día uno.' },
      ],
    },
  },
  {
    patterns: ['software a medida', 'desarrollo de software a medida'],
    content: {
      heroSubtitle: 'Software diseñado exactamente para tu negocio',
      description: 'Cuando ningún software genérico resuelve tu problema, lo construimos desde cero. Plataformas, sistemas internos, portales de clientes — lo que tu operación necesite, hecho a tu medida.',
      benefits: [
        { title: 'Hecho para ti', desc: 'Cada pantalla, cada flujo, cada reporte diseñado para tu operación.' },
        { title: 'Ventaja competitiva', desc: 'Tu competencia usa software genérico. Tú tienes uno que nadie más tiene.' },
        { title: 'Propiedad total', desc: 'El código es tuyo. Sin dependencia de terceros ni licencias eternas.' },
        { title: 'Evoluciona contigo', desc: 'Agregamos funcionalidades cuando tu negocio crece.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de software para empresas', 'empresa de desarrollo de software'],
    content: {
      heroSubtitle: 'Tu socio tecnológico de confianza',
      description: 'Somos una agencia de desarrollo de software con 14+ años de experiencia creando soluciones empresariales. Desde sistemas internos hasta plataformas públicas, transformamos ideas en software que funciona.',
      benefits: [
        { title: 'Equipo senior', desc: 'Desarrolladores con experiencia real en proyectos empresariales complejos.' },
        { title: 'Metodología probada', desc: 'Entregas incrementales para que veas resultados desde la primera semana.' },
        { title: 'Stack moderno', desc: 'Tecnologías actuales que garantizan rendimiento y escalabilidad.' },
        { title: 'Soporte post-entrega', desc: 'No desaparecemos después de entregar. Estamos contigo a largo plazo.' },
      ],
    },
  },
  {
    patterns: ['software'],
    content: {
      heroSubtitle: 'Soluciones de software para empresas que quieren crecer',
      description: 'Desarrollamos software empresarial que resuelve problemas reales. Desde automatización de procesos hasta plataformas completas de gestión, convertimos tu operación manual en digital.',
      benefits: [
        { title: 'Digitaliza tu operación', desc: 'Transforma procesos manuales en flujos digitales eficientes.' },
        { title: 'Reduce errores', desc: 'Automatiza tareas repetitivas y elimina el error humano.' },
        { title: 'Acceso desde cualquier lugar', desc: 'Sistemas web y móviles para trabajar donde estés.' },
        { title: 'Soporte continuo', desc: 'Mantenimiento, actualizaciones y mejoras cuando las necesites.' },
      ],
    },
  },
  {
    patterns: ['software empresarial', 'software de gestión empresarial', 'sistema de gestión empresarial', 'software administrativo'],
    content: {
      heroSubtitle: 'Gestión empresarial inteligente en un solo sistema',
      description: 'Software que centraliza la administración de tu empresa: finanzas, clientes, inventario, reportes y más. Deja de brincar entre 10 herramientas y ten todo en un solo lugar.',
      benefits: [
        { title: 'Todo centralizado', desc: 'Una sola plataforma para administrar toda tu empresa.' },
        { title: 'Reportes al instante', desc: 'Dashboards con métricas clave actualizadas en tiempo real.' },
        { title: 'Control de acceso', desc: 'Cada empleado ve solo lo que necesita. Permisos por rol.' },
        { title: 'Escalable', desc: 'Funciona igual de bien con 5 usuarios que con 500.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de sistemas'],
    content: {
      heroSubtitle: 'Sistemas robustos para operaciones exigentes',
      description: 'Desarrollamos sistemas empresariales que soportan operaciones complejas: multi-sucursal, multi-moneda, alta concurrencia. Arquitectura sólida pensada para crecer contigo.',
      benefits: [
        { title: 'Arquitectura sólida', desc: 'Sistemas diseñados para manejar volúmenes reales de datos y usuarios.' },
        { title: 'Integraciones nativas', desc: 'Conectamos tu sistema con ERPs, CRMs, bancos y APIs externas.' },
        { title: 'Seguridad empresarial', desc: 'Encriptación, auditoría y respaldos automáticos.' },
        { title: 'Documentación completa', desc: 'Manuales técnicos y de usuario para tu equipo.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de aplicaciones web'],
    content: {
      heroSubtitle: 'Aplicaciones web rápidas, modernas y escalables',
      description: 'Construimos aplicaciones web con las tecnologías más actuales. Portales de clientes, dashboards administrativos, marketplaces — con rendimiento y experiencia de usuario excepcionales.',
      benefits: [
        { title: 'Carga ultra rápida', desc: 'Optimizadas para velocidad. Tu equipo y clientes no esperan.' },
        { title: 'Responsive', desc: 'Funcionan perfecto en computadora, tablet y celular.' },
        { title: 'PWA compatible', desc: 'Se instalan como app nativa sin pasar por App Store.' },
        { title: 'SEO friendly', desc: 'Estructura que Google entiende y posiciona.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de aplicaciones móviles'],
    content: {
      heroSubtitle: 'Apps móviles que tus usuarios amarán usar',
      description: 'Desarrollamos aplicaciones móviles nativas y multiplataforma para iOS y Android. Desde apps internas de tu empresa hasta productos para miles de usuarios.',
      benefits: [
        { title: 'iOS y Android', desc: 'Una inversión, dos plataformas. Llegamos a todos tus usuarios.' },
        { title: 'Notificaciones push', desc: 'Mantén a tus usuarios informados y comprometidos.' },
        { title: 'Modo offline', desc: 'Funciona incluso sin conexión a internet.' },
        { title: 'Publicación en stores', desc: 'Nos encargamos del proceso completo en App Store y Google Play.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de aplicaciones empresariales'],
    content: {
      heroSubtitle: 'Aplicaciones que resuelven problemas reales de tu empresa',
      description: 'Aplicaciones empresariales diseñadas para digitalizar procesos críticos: gestión de órdenes, logística, control de calidad, recursos humanos. Tu operación, en una app.',
      benefits: [
        { title: 'Procesos digitalizados', desc: 'De papel y Excel a una aplicación profesional.' },
        { title: 'Acceso por rol', desc: 'Cada departamento ve su información. Control total.' },
        { title: 'Datos en tiempo real', desc: 'Decisiones basadas en lo que pasa ahora, no en reportes de ayer.' },
        { title: 'Integraciones', desc: 'Conecta con tu ERP, CRM, contabilidad y más.' },
      ],
    },
  },
  {
    patterns: ['desarrollo de plataformas digitales'],
    content: {
      heroSubtitle: 'Plataformas digitales que escalan tu negocio',
      description: 'Construimos plataformas completas: marketplaces, portales de servicios, sistemas SaaS, plataformas de aprendizaje. Desde la idea hasta la operación con miles de usuarios.',
      benefits: [
        { title: 'Multi-tenant', desc: 'Una plataforma, múltiples clientes. Cada uno con su espacio.' },
        { title: 'Pagos integrados', desc: 'Cobros, suscripciones y facturación automática.' },
        { title: 'Panel administrativo', desc: 'Gestiona usuarios, contenido y métricas desde un dashboard.' },
        { title: 'Escalabilidad', desc: 'Arquitectura cloud que crece con tu demanda.' },
      ],
    },
  },
  {
    patterns: ['automatización de procesos'],
    content: {
      heroSubtitle: 'Automatiza lo repetitivo, enfócate en lo importante',
      description: 'Identificamos los procesos manuales que te roban tiempo y los automatizamos. Desde flujos de aprobación hasta generación de reportes — tu equipo deja de hacer trabajo mecánico.',
      benefits: [
        { title: 'Ahorro de tiempo', desc: 'Tareas que tomaban horas ahora se ejecutan en segundos.' },
        { title: 'Cero errores humanos', desc: 'Los procesos automatizados no se equivocan ni se olvidan.' },
        { title: 'Escalable', desc: 'Procesa 10 o 10,000 operaciones con el mismo esfuerzo.' },
        { title: 'ROI medible', desc: 'Sabrás exactamente cuántas horas y dinero ahorraste.' },
      ],
    },
  },
  {
    patterns: ['automatización de ventas'],
    content: {
      heroSubtitle: 'Vende más sin aumentar tu equipo comercial',
      description: 'Automatiza el ciclo completo de ventas: desde la captación del lead hasta el cierre. Seguimiento automático, scoring de prospectos y nurturing que convierte sin intervención manual.',
      benefits: [
        { title: 'Lead scoring automático', desc: 'Identifica qué prospectos están listos para comprar.' },
        { title: 'Seguimiento sin olvidos', desc: 'Secuencias de emails y mensajes que se disparan solas.' },
        { title: 'Pipeline limpio', desc: 'Cada oportunidad avanza automáticamente por tu embudo.' },
        { title: 'Más cierres, menos esfuerzo', desc: 'Tu equipo se enfoca en cerrar, no en perseguir.' },
      ],
    },
  },
  {
    patterns: ['automatización empresarial', 'automatización de negocios'],
    content: {
      heroSubtitle: 'Tu empresa operando en automático',
      description: 'Automatizamos los procesos core de tu negocio: facturación, inventario, cobranza, reportes, onboarding de clientes. Menos trabajo manual, más crecimiento.',
      benefits: [
        { title: 'Operación 24/7', desc: 'Tus procesos corren aunque tu equipo no esté.' },
        { title: 'Integración total', desc: 'Conectamos todas tus herramientas en un flujo unificado.' },
        { title: 'Alertas inteligentes', desc: 'Notificaciones cuando algo necesita atención humana.' },
        { title: 'Reducción de costos', desc: 'Menos personal operativo, misma o mayor producción.' },
      ],
    },
  },
  {
    patterns: ['automatización de operaciones'],
    content: {
      heroSubtitle: 'Operaciones eficientes sin cuellos de botella',
      description: 'Automatizamos la operación diaria de tu empresa: logística, producción, control de calidad, gestión de órdenes. Flujos que antes dependían de una persona ahora corren solos.',
      benefits: [
        { title: 'Flujos sin fricción', desc: 'De la orden del cliente a la entrega, todo automatizado.' },
        { title: 'Trazabilidad completa', desc: 'Sabes dónde está cada orden, pedido o producto en todo momento.' },
        { title: 'Menos dependencia', desc: 'Tu operación no se detiene porque alguien faltó o se fue.' },
        { title: 'KPIs operativos', desc: 'Mide eficiencia, tiempos y costos con datos reales.' },
      ],
    },
  },
  {
    patterns: ['automatización de flujos de trabajo'],
    content: {
      heroSubtitle: 'Flujos de trabajo que se ejecutan solos',
      description: 'Diseñamos e implementamos workflows automatizados para tu empresa. Aprobaciones, asignaciones, notificaciones, escalamientos — todo con reglas claras que tu equipo solo supervisa.',
      benefits: [
        { title: 'Reglas de negocio', desc: 'Si pasa X, entonces Y. Tu lógica de negocio automatizada.' },
        { title: 'Aprobaciones rápidas', desc: 'Flujos de aprobación que no se estancan en la bandeja de nadie.' },
        { title: 'Notificaciones oportunas', desc: 'Cada persona recibe lo que necesita en el momento correcto.' },
        { title: 'Auditoría completa', desc: 'Registro de quién hizo qué, cuándo y por qué.' },
      ],
    },
  },
  {
    patterns: ['bot de whatsapp', 'chatbot whatsapp'],
    content: {
      heroSubtitle: 'Atiende clientes por WhatsApp las 24 horas',
      description: 'Un bot de WhatsApp que responde preguntas, agenda citas, toma pedidos y califica prospectos — mientras tú duermes. Tu negocio nunca cierra.',
      benefits: [
        { title: 'Atención 24/7', desc: 'Tus clientes reciben respuesta inmediata a cualquier hora.' },
        { title: 'Califica prospectos', desc: 'El bot filtra y solo te pasa leads que valen la pena.' },
        { title: 'Toma pedidos', desc: 'Catálogo, carrito y confirmación directamente en WhatsApp.' },
        { title: 'Escalamiento humano', desc: 'Cuando el bot no puede resolver, te transfiere la conversación.' },
      ],
    },
  },
  {
    patterns: ['whatsapp business api'],
    content: {
      heroSubtitle: 'WhatsApp Business API para operaciones serias',
      description: 'Integración profesional de WhatsApp Business API: mensajes masivos, plantillas aprobadas, múltiples agentes, CRM conectado. Para empresas que necesitan más que un teléfono con WhatsApp.',
      benefits: [
        { title: 'Múltiples agentes', desc: 'Todo tu equipo atendiendo desde un solo número de WhatsApp.' },
        { title: 'Mensajes masivos', desc: 'Campañas, recordatorios y notificaciones a toda tu base.' },
        { title: 'CRM integrado', desc: 'Cada conversación vinculada al cliente en tu sistema.' },
        { title: 'Métricas', desc: 'Tiempos de respuesta, satisfacción y conversión medidos.' },
      ],
    },
  },
  {
    patterns: ['chatbot para ventas'],
    content: {
      heroSubtitle: 'Un vendedor que nunca descansa',
      description: 'Chatbots diseñados para vender: califican al prospecto, presentan productos, resuelven objeciones y cierran la venta o agendan la cita. Tu fuerza de ventas digital.',
      benefits: [
        { title: 'Vende mientras duermes', desc: 'Conversiones a las 3am sin que nadie de tu equipo esté activo.' },
        { title: 'Personalizado', desc: 'Respuestas basadas en lo que el cliente busca, no respuestas genéricas.' },
        { title: 'Multi-canal', desc: 'WhatsApp, web, Facebook Messenger — un solo bot, todos los canales.' },
        { title: 'Aprende y mejora', desc: 'Con IA, el bot se vuelve más efectivo con cada conversación.' },
      ],
    },
  },
  {
    patterns: ['chatbot para atención al cliente'],
    content: {
      heroSubtitle: 'Soporte al cliente instantáneo y sin esperas',
      description: 'Chatbots que resuelven el 80% de las consultas sin intervención humana. Preguntas frecuentes, estado de pedidos, devoluciones, soporte técnico básico — todo automatizado.',
      benefits: [
        { title: 'Resolución inmediata', desc: 'Tus clientes no esperan. Respuesta en segundos.' },
        { title: 'Reduce carga al equipo', desc: 'Tu equipo de soporte solo atiende lo complejo.' },
        { title: 'Disponible siempre', desc: 'Noches, fines de semana, días festivos. Sin excepción.' },
        { title: 'Satisfacción medible', desc: 'Encuestas automáticas post-atención.' },
      ],
    },
  },
  {
    patterns: ['chatbot para empresas'],
    content: {
      heroSubtitle: 'Chatbots empresariales que generan resultados',
      description: 'Implementamos chatbots para empresas que necesitan escalar su atención sin escalar sus costos. Ventas, soporte, RRHH interno, mesa de ayuda — automatizados con inteligencia.',
      benefits: [
        { title: 'Múltiples casos de uso', desc: 'Ventas, soporte, RRHH, IT — un chatbot para cada necesidad.' },
        { title: 'Integración empresarial', desc: 'Conectado a tu CRM, ERP, base de conocimiento y más.' },
        { title: 'Marca personalizada', desc: 'El bot habla como tu empresa, con tu tono y personalidad.' },
        { title: 'Análisis de conversaciones', desc: 'Insights sobre qué preguntan tus clientes y qué necesitan.' },
      ],
    },
  },
  {
    patterns: ['ia para negocios', 'inteligencia artificial para empresas'],
    content: {
      heroSubtitle: 'Inteligencia artificial aplicada a tu negocio real',
      description: 'No es IA de moda — es IA que resuelve. Automatización inteligente, análisis predictivo, procesamiento de documentos, asistentes que entienden tu negocio. Resultados tangibles desde el primer mes.',
      benefits: [
        { title: 'Automatización inteligente', desc: 'La IA toma decisiones simples por ti, tú decides lo estratégico.' },
        { title: 'Análisis predictivo', desc: 'Anticipa demanda, detecta riesgos y encuentra oportunidades.' },
        { title: 'Procesamiento de documentos', desc: 'Facturas, contratos, emails — procesados y clasificados por IA.' },
        { title: 'ROI comprobable', desc: 'Medimos el impacto real en tu operación y tus finanzas.' },
      ],
    },
  },
  {
    patterns: ['implementación de inteligencia artificial'],
    content: {
      heroSubtitle: 'Implementamos IA donde realmente impacta',
      description: 'Evaluamos tu operación, identificamos dónde la IA genera valor real y la implementamos. Sin buzzwords, sin proyectos infinitos — resultados concretos en semanas.',
      benefits: [
        { title: 'Diagnóstico primero', desc: 'No vendemos IA por vender. Primero entendemos si la necesitas.' },
        { title: 'Implementación rápida', desc: 'Primeros resultados en 2-4 semanas, no en 6 meses.' },
        { title: 'Equipo capacitado', desc: 'Tu equipo aprende a trabajar con la IA, no depende de nosotros.' },
        { title: 'Escalamiento gradual', desc: 'Empezamos pequeño, escalamos donde funciona.' },
      ],
    },
  },
  {
    patterns: ['asistentes virtuales con ia'],
    content: {
      heroSubtitle: 'Asistentes virtuales que entienden y resuelven',
      description: 'Asistentes con inteligencia artificial que entienden lenguaje natural, acceden a tus datos y resuelven consultas complejas. No son chatbots con respuestas predefinidas — piensan.',
      benefits: [
        { title: 'Lenguaje natural', desc: 'Tus clientes hablan normal, el asistente entiende.' },
        { title: 'Acceso a tus datos', desc: 'Consulta inventario, estado de pedidos, historial — en tiempo real.' },
        { title: 'Aprende de tu negocio', desc: 'Entrenado con tu información, tus productos, tus procesos.' },
        { title: 'Multi-idioma', desc: 'Atiende en español, inglés y más sin configuración extra.' },
      ],
    },
  },
  {
    patterns: ['soluciones de inteligencia artificial'],
    content: {
      heroSubtitle: 'Soluciones de IA que transforman tu operación',
      description: 'Desde sistemas RAG empresariales hasta agentes autónomos que ejecutan tareas. Soluciones de IA que se integran a tu infraestructura existente y generan valor desde el día uno.',
      benefits: [
        { title: 'Sistemas RAG', desc: 'IA que busca en tus documentos y responde con precisión.' },
        { title: 'Agentes autónomos', desc: 'Programas que ejecutan tareas completas sin supervisión.' },
        { title: 'Visión por computadora', desc: 'Análisis de imágenes para control de calidad, seguridad y más.' },
        { title: 'IA generativa', desc: 'Generación de contenido, reportes y análisis automáticos.' },
      ],
    },
  },
  {
    patterns: ['integración de apis'],
    content: {
      heroSubtitle: 'Conecta todos tus sistemas en uno solo',
      description: 'Integramos tus herramientas y plataformas mediante APIs. Tu CRM habla con tu ERP, tu tienda online actualiza tu inventario, tu contabilidad se sincroniza automáticamente.',
      benefits: [
        { title: 'Datos sincronizados', desc: 'La información fluye entre sistemas sin intervención manual.' },
        { title: 'Elimina doble captura', desc: 'Un dato se ingresa una vez y se replica donde se necesite.' },
        { title: 'APIs propias', desc: 'Creamos APIs para que terceros se conecten a tu sistema.' },
        { title: 'Monitoreo 24/7', desc: 'Alertas si alguna integración falla o se desincroniza.' },
      ],
    },
  },
  {
    patterns: ['integración de sistemas'],
    content: {
      heroSubtitle: 'Tus sistemas trabajando juntos, no en silos',
      description: 'Conectamos sistemas que hoy están aislados. ERP con CRM, tienda online con inventario, contabilidad con facturación. Una operación unificada donde todo fluye automáticamente.',
      benefits: [
        { title: 'Operación unificada', desc: 'Todos tus departamentos ven la misma información.' },
        { title: 'Menos errores', desc: 'Sin copiar datos de un sistema a otro manualmente.' },
        { title: 'Tiempo real', desc: 'Cambios en un sistema se reflejan inmediatamente en los demás.' },
        { title: 'Cualquier sistema', desc: 'SAP, Salesforce, Shopify, QuickBooks — los conectamos todos.' },
      ],
    },
  },
  {
    patterns: ['consultoría tecnológica'],
    content: {
      heroSubtitle: 'Estrategia tecnológica para decisiones inteligentes',
      description: 'No sabes qué tecnología necesitas y no quieres equivocarte. Te ayudamos a evaluar opciones, diseñar la arquitectura correcta y trazar la ruta de implementación. Decisiones informadas, no improvisadas.',
      benefits: [
        { title: 'Diagnóstico experto', desc: 'Evaluamos tu stack actual y detectamos oportunidades de mejora.' },
        { title: 'Roadmap tecnológico', desc: 'Plan a 6-12 meses con prioridades claras y presupuesto.' },
        { title: 'Vendor selection', desc: 'Te ayudamos a elegir proveedores y herramientas sin conflicto de interés.' },
        { title: 'Acompañamiento', desc: 'No solo planeamos — supervisamos la ejecución.' },
      ],
    },
  },
]

// ─── AUDIOVISUAL CATEGORIES (AV Digital Profesional) ──────────────────

const AV_CATEGORIES: ServiceCategory[] = [
  {
    patterns: ['spot publicitario', 'video publicitario', 'anuncio publicitario'],
    content: {
      heroSubtitle: 'Spots que venden, no solo entretienen',
      description: 'Creamos spots publicitarios con calidad cinematográfica que impactan a tu audiencia desde el primer segundo. Guión estratégico, producción premium y mensajes que convierten.',
      benefits: [
        { title: 'Guión estratégico', desc: 'Cada segundo está pensado para generar impacto y recordación.' },
        { title: 'Producción cinematográfica', desc: 'Calidad de cine con equipos 4K, iluminación profesional y dirección creativa.' },
        { title: 'Adaptado a cada canal', desc: 'Versiones para TV, redes sociales, YouTube y plataformas digitales.' },
        { title: 'Medimos el ROI', desc: 'Análisis de desempeño para optimizar tus campañas en tiempo real.' },
      ],
    },
  },
  {
    patterns: ['video corporativo', 'video empresarial', 'video empresa', 'video profesional'],
    content: {
      heroSubtitle: 'Tu empresa contada como merece',
      description: 'Producimos videos corporativos que proyectan la autoridad y profesionalismo de tu empresa. Desde presentaciones institucionales hasta historias de marca que inspiran confianza.',
      benefits: [
        { title: 'Posiciona tu marca', desc: 'Convierte tu presencia digital en un diferenciador competitivo real.' },
        { title: 'Equipo +60 años de experiencia', desc: 'Profesionales audiovisuales con trayectoria en grandes producciones.' },
        { title: 'Producción integral', desc: 'Desde el guión hasta la postproducción, todo bajo un único equipo.' },
        { title: 'Resultados tangibles', desc: 'Videos que generan leads, cierran ventas y elevan tu marca.' },
      ],
    },
  },
  {
    patterns: ['video institucional'],
    content: {
      heroSubtitle: 'La historia de tu empresa en un solo video',
      description: 'Videos institucionales que transmiten la misión, visión y valores de tu empresa con la fuerza y calidad que merecen. Cuenta quién eres y por qué importas.',
      benefits: [
        { title: 'Narrativa poderosa', desc: 'Estructura dramatúrgica que conecta emocionalmente con tu audiencia.' },
        { title: 'Entrevistas con directivos', desc: 'Capturamos la voz real de tu equipo con dirección profesional.' },
        { title: 'Imagen corporativa cuidada', desc: 'Cada plano refleja los valores y estándares de tu organización.' },
        { title: 'Versátil y reutilizable', desc: 'Úsalo en tu web, presentaciones comerciales, eventos y RRHH.' },
      ],
    },
  },
  {
    patterns: ['video explicativo', 'video explicativo empresa'],
    content: {
      heroSubtitle: 'Explica lo complejo en 90 segundos',
      description: 'Videos explicativos que simplifican productos, servicios o procesos complejos. Combinamos animación, motion graphics y narrativa para que tus clientes entiendan al instante.',
      benefits: [
        { title: 'Guión claro y directo', desc: 'Transformamos conceptos técnicos en mensajes entendibles y memorables.' },
        { title: 'Animación de alto impacto', desc: 'Motion graphics y 2D/3D que captan la atención sin distraer del mensaje.' },
        { title: 'Aumenta conversión', desc: 'Las landings con video explicativo convierten hasta 80% más.' },
        { title: 'Acorta el ciclo de venta', desc: 'Tu prospecto entiende la propuesta en minutos, no en reuniones.' },
      ],
    },
  },
  {
    patterns: ['productora audiovisual', 'produccion audiovisual', 'empresa audiovisual'],
    content: {
      heroSubtitle: 'Tu productora audiovisual integral',
      description: 'Productora audiovisual corporativa con +60 años de experiencia combinada. Del concepto al estreno, nos encargamos de cada detalle para entregarte producciones que elevan tu marca.',
      benefits: [
        { title: 'Servicio llave en mano', desc: 'Guión, producción, grabación, edición y distribución — todo en un solo equipo.' },
        { title: 'Equipos profesionales', desc: 'Cámaras 4K/6K, iluminación cinematográfica, drones y audio de estudio.' },
        { title: 'Postproducción de alto nivel', desc: 'Edición, color grading, motion graphics y sonido profesional.' },
        { title: 'Disponibilidad total', desc: 'Tiempos de entrega express sin sacrificar calidad.' },
      ],
    },
  },
  {
    patterns: ['grabacion video empresa', 'grabacion video corporativo', 'grabacion audiovisual'],
    content: {
      heroSubtitle: 'Grabación profesional donde lo necesites',
      description: 'Grabaciones audiovisuales con equipos de última generación y dirección profesional. Llevamos estudio móvil a tus instalaciones o grabamos en nuestros sets equipados.',
      benefits: [
        { title: 'Equipos de cine', desc: 'Cámaras 4K/6K, objetivos cinematográficos, gimbals y drones.' },
        { title: 'Iluminación profesional', desc: 'Kits de iluminación LED y HMI para resultados impecables.' },
        { title: 'Audio broadcast', desc: 'Micrófonos de corbata, cañón y grabación multipista limpia.' },
        { title: 'Locaciones flexibles', desc: 'Grabamos en oficinas, fábricas, exteriores o en nuestros estudios.' },
      ],
    },
  },
  {
    patterns: ['motion graphics', 'animacion corporativa', 'animacion 2d', 'animacion 3d'],
    content: {
      heroSubtitle: 'Gráficos animados que cuentan tu historia',
      description: 'Motion graphics y animación corporativa que transforman datos, procesos e ideas en experiencias visuales memorables. Perfectos para explicar, formar o impactar.',
      benefits: [
        { title: 'Identidad visual propia', desc: 'Adaptado 100% a tu manual de marca: colores, tipografías y estilo.' },
        { title: 'Estilos versátiles', desc: 'Desde flat design corporativo hasta animación 3D fotorrealista.' },
        { title: 'Cuenta historias complejas', desc: 'Ideal para infografías animadas, datos financieros o procesos técnicos.' },
        { title: 'Alta retención', desc: 'El motion graphics aumenta hasta 95% la retención del mensaje.' },
      ],
    },
  },
  {
    patterns: ['video producto', 'video de producto', 'video catalogo'],
    content: {
      heroSubtitle: 'Tu producto vendiendo 24/7',
      description: 'Videos de producto que convierten. Mostramos cada detalle, beneficio y caso de uso con calidad cinematográfica. Ideal para ecommerce, ferias y campañas digitales.',
      benefits: [
        { title: 'Producción detallada', desc: 'Macro shots, rotaciones, exploded views y demos en uso real.' },
        { title: 'Enfoque en beneficios', desc: 'No solo mostramos el producto — comunicamos por qué comprarlo.' },
        { title: 'Listo para ecommerce', desc: 'Formatos optimizados para Amazon, Shopify, web y redes sociales.' },
        { title: 'Aumenta conversión', desc: 'Las fichas de producto con video convierten hasta 3x más.' },
      ],
    },
  },
  {
    patterns: ['video marketing', 'video promocional', 'video digital marketing'],
    content: {
      heroSubtitle: 'Contenido audiovisual que mueve tu marketing',
      description: 'Videos diseñados para campañas de marketing digital: ads, contenido orgánico para redes, video email marketing. Producción que se traduce en leads y ventas.',
      benefits: [
        { title: 'Formatos para cada plataforma', desc: 'Stories, reels, YouTube ads, LinkedIn — todo optimizado por canal.' },
        { title: 'CTAs integrados', desc: 'Cada video tiene un llamado a la acción claro y medible.' },
        { title: 'Serie escalable', desc: 'Diseñamos piezas en serie para campañas sostenidas en el tiempo.' },
        { title: 'Análisis de desempeño', desc: 'Medimos CTR, retención y conversiones para optimizar continuamente.' },
      ],
    },
  },
  {
    patterns: ['video formacion', 'video capacitacion', 'video onboarding', 'video elearning', 'video training'],
    content: {
      heroSubtitle: 'Capacita a tu equipo con videos profesionales',
      description: 'Videos de formación corporativa y onboarding que reducen el tiempo de capacitación y mejoran la retención. Contenido estructurado, profesional y escalable.',
      benefits: [
        { title: 'Estructura pedagógica', desc: 'Guiones diseñados con metodologías de aprendizaje efectivas.' },
        { title: 'Escalable para tu equipo', desc: 'Una inversión sirve para capacitar a cientos o miles de empleados.' },
        { title: 'Integración LMS', desc: 'Compatible con Moodle, TalentLMS, Docebo y plataformas corporativas.' },
        { title: 'Reduce costos de formación', desc: 'Menos horas de instructor, más consistencia en el mensaje.' },
      ],
    },
  },
  {
    patterns: ['streaming corporativo', 'streaming empresa', 'directo corporativo', 'transmision en vivo'],
    content: {
      heroSubtitle: 'Transmisiones profesionales en directo',
      description: 'Streaming corporativo multicámara con calidad broadcast. Ideal para juntas de accionistas, lanzamientos, eventos híbridos y webinars de alto nivel.',
      benefits: [
        { title: 'Producción multicámara', desc: 'Cambios de plano en vivo, gráficos superpuestos y calidad TV.' },
        { title: 'Estabilidad garantizada', desc: 'Encoders profesionales, redundancia de señal y streaming ininterrumpido.' },
        { title: 'Multi-plataforma', desc: 'Simultáneo en YouTube, LinkedIn, Zoom, Teams o plataformas privadas.' },
        { title: 'Grabación para reutilizar', desc: 'Editamos el directo para generar clips y contenido on-demand.' },
      ],
    },
  },
  {
    patterns: ['video evento', 'cobertura evento', 'video congreso', 'video convencion'],
    content: {
      heroSubtitle: 'Tu evento corporativo, inmortalizado',
      description: 'Cobertura audiovisual de eventos corporativos, convenciones, ferias y lanzamientos. Capturamos la esencia, los mejores momentos y la esencia de tu marca.',
      benefits: [
        { title: 'Cobertura integral', desc: 'Multicámara, entrevistas, highlights y video resumen del evento.' },
        { title: 'Entrega express', desc: 'Video resumen publicable el mismo día del evento.' },
        { title: 'Contenido reutilizable', desc: 'Generamos piezas para redes, informes, web y futuros eventos.' },
        { title: 'Streaming opcional', desc: 'Transmitimos en vivo a audiencia remota si lo necesitas.' },
      ],
    },
  },
  {
    patterns: ['video 4k', 'video alta resolucion', 'video calidad cine'],
    content: {
      heroSubtitle: 'Calidad 4K cinematográfica para tu marca',
      description: 'Videos en resolución 4K con el mismo estándar técnico del cine profesional. Ideal para marcas que buscan transmitir excelencia y modernidad en cada pieza.',
      benefits: [
        { title: 'Cámaras de cine', desc: 'Grabamos en 4K/6K con sensores S35 y objetivos cinematográficos.' },
        { title: 'Color grading profesional', desc: 'Postproducción de color al nivel de largometrajes y series premium.' },
        { title: 'Compatibilidad total', desc: 'Masters en 4K + versiones optimizadas para web y redes.' },
        { title: 'Futuro a prueba', desc: 'Tu contenido se verá perfecto aunque cambien los estándares en 5 años.' },
      ],
    },
  },
  {
    patterns: ['fotografia corporativa', 'fotografia empresa', 'foto profesional empresa'],
    content: {
      heroSubtitle: 'Fotografía que eleva tu imagen de marca',
      description: 'Fotografía corporativa profesional: equipos directivos, instalaciones, producto y ambiente laboral. Imágenes que transmiten profesionalismo, confianza y modernidad.',
      benefits: [
        { title: 'Dirección de arte', desc: 'Cada sesión tiene un concepto visual alineado con tu marca.' },
        { title: 'Iluminación de estudio', desc: 'Kits profesionales para resultados impecables en cualquier ubicación.' },
        { title: 'Retoque profesional', desc: 'Postproducción detallada que eleva cada imagen sin falsear.' },
        { title: 'Uso multicanal', desc: 'Imágenes listas para web, LinkedIn, memoria corporativa e impreso.' },
      ],
    },
  },
  {
    patterns: ['video responsabilidad social', 'video rse', 'video sostenibilidad', 'video esg'],
    content: {
      heroSubtitle: 'Comunica tu impacto social con fuerza',
      description: 'Videos sobre responsabilidad social empresarial, sostenibilidad y ESG. Cuenta el impacto real que genera tu empresa con narrativas honestas y visualmente potentes.',
      benefits: [
        { title: 'Storytelling humano', desc: 'Historias reales de beneficiarios, empleados y comunidades.' },
        { title: 'Respaldado con datos', desc: 'Integramos cifras, KPIs ambientales y métricas de impacto.' },
        { title: 'Transparencia visual', desc: 'Grabamos en campo real, sin maquillajes corporativos.' },
        { title: 'Refuerza reputación', desc: 'Mejora tu imagen ante inversores, clientes y talento.' },
      ],
    },
  },
  {
    patterns: ['video proceso fabricacion', 'video industrial', 'video fabrica', 'video produccion industrial'],
    content: {
      heroSubtitle: 'Tu proceso productivo como nunca se vio',
      description: 'Videos industriales y de procesos de fabricación con calidad cinematográfica. Demostramos tu capacidad productiva, tecnología y estándares de calidad.',
      benefits: [
        { title: 'Acceso a zonas restringidas', desc: 'Protocolos de seguridad, EPI y respeto total a tu operación.' },
        { title: 'Equipos especializados', desc: 'Cámaras compactas, drones interiores y técnicas para entornos industriales.' },
        { title: 'Narrativa técnica', desc: 'Explicamos procesos complejos de forma visual y entendible.' },
        { title: 'Enfoque en diferenciadores', desc: 'Destacamos tu tecnología, calidad y ventaja competitiva real.' },
      ],
    },
  },
  {
    patterns: ['video testimonial', 'video caso exito', 'video caso de exito'],
    content: {
      heroSubtitle: 'Que tus clientes hablen por ti',
      description: 'Videos testimoniales y casos de éxito que generan confianza real. Producimos con dirección profesional para que tus clientes transmitan autenticidad y resultado.',
      benefits: [
        { title: 'Dirección de entrevista', desc: 'Sacamos lo mejor de cada testimonio sin sonar forzado.' },
        { title: 'Estructura narrativa', desc: 'Problema → Solución → Resultado. Clara y potente.' },
        { title: 'B-roll de apoyo', desc: 'Grabamos imágenes complementarias que refuerzan el mensaje.' },
        { title: 'Social proof poderoso', desc: 'Aumenta tasa de conversión en landings y presentaciones.' },
      ],
    },
  },
]

// Add audiovisual categories to main list
SERVICE_CATEGORIES.push(...AV_CATEGORIES)

// Fallback for unmatched keywords
const DEFAULT_CONTENT: ServiceContent = {
  heroSubtitle: 'Tecnología que impulsa tu negocio',
  description: 'Desarrollamos soluciones tecnológicas que resuelven problemas reales de tu empresa. Software a medida, automatización con IA e integración de sistemas — todo diseñado para generar resultados medibles.',
  benefits: [
    { title: 'Soluciones a medida', desc: 'Cada proyecto es único. Diseñamos exactamente lo que necesitas.' },
    { title: 'Resultados medibles', desc: 'KPIs claros para que veas el impacto desde el primer mes.' },
    { title: 'Equipo senior', desc: '14+ años de experiencia en proyectos empresariales reales.' },
    { title: 'Soporte continuo', desc: 'Acompañamiento antes, durante y después de la entrega.' },
  ],
}

/**
 * Detect service category from keyword and return relevant content.
 */
export function getServiceContent(keyword: string): ServiceContent {
  const kwLower = keyword.toLowerCase()

  for (const category of SERVICE_CATEGORIES) {
    for (const pattern of category.patterns) {
      if (kwLower.includes(pattern)) {
        return category.content
      }
    }
  }

  return DEFAULT_CONTENT
}
