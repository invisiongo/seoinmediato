# BUSINESS_LOGIC.md - SEOImediato

> Generado por SaaS Factory | Fecha: 2026-03-08

## 1. Problema de Negocio
**Dolor:** El posicionamiento SEO local requiere un proceso manual extremadamente fragmentado: WordPress + Plesk + 6 plugins + scripts PHP + Google Cloud Console. Crear landing pages con keywords long tail y gestionarlas es lento y propenso a errores.
**Costo actual:** Horas de trabajo manual por cada sitio SEO. Imposibilidad de escalar a cientos/miles de landing pages por proyecto. Dependencia de infraestructura PHP legacy.

## 2. Solucion
**Propuesta de valor:** Una plataforma SaaS que automatiza el posicionamiento SEO local mediante generacion masiva de landing pages con keywords long tail e indexacion directa via Google Indexing API.

**Flujo principal (Happy Path):**
1. Usuario crea un proyecto (dominio, nicho, datos del cliente)
2. Configura el motor de keywords (servicios, modificadores, ubicaciones)
3. El sistema genera todas las combinaciones de keywords long tail
4. Las keywords se publican como landing pages con rutas dinamicas
5. El motor de indexacion envia las URLs a Google via Indexing API
6. Dashboard muestra progreso de indexacion en tiempo real

## 3. Usuario Objetivo
**Rol:** Equipo interno de IA Invision (SEO specialists, developers)
**Contexto:** Gestionan multiples sitios SEO para clientes locales (cafeterias, inmobiliarias, servicios profesionales)

## 4. Arquitectura de Datos
**Input:**
- Datos del proyecto/cliente (nombre, dominio, nicho, contacto)
- Configuracion de keywords (servicios, modificadores, ubicaciones)
- Token JSON de Google Cloud para Indexing API
- Templates de ubicaciones reutilizables

**Output:**
- Landing pages SEO generadas dinamicamente
- Reportes de indexacion (URLs procesadas, exitos, fallos)
- Dashboard con metricas de rendimiento

**Storage (Appwrite collections):**
- `projects`: Proyectos/clientes con configuracion SEO
- `keywords`: Keywords long tail generadas con estado de indexacion
- `keyword_configs`: Configuracion del generador de keywords
- `indexing_jobs`: Jobs de indexacion con progreso
- `location_templates`: Templates reutilizables de ubicaciones

## 5. KPI de Exito
**Metrica principal:** Generar e indexar 1000+ landing pages SEO por proyecto sin intervencion manual, reduciendo el proceso de dias a minutos.

## 6. Especificacion Tecnica

### Features a Implementar (Feature-First)
```
src/features/
├── auth/           # Autenticacion Email/Password + 2FA TOTP (Appwrite)
├── projects/       # Gestion de proyectos/clientes
├── keywords/       # Motor generador de keywords long tail
├── sites/          # Motor de sitios SEO (rutas dinamicas)
├── indexing/       # Motor de indexacion Google API
└── locations/      # Base de datos de ubicaciones jerarquica
```

### Stack Confirmado
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui
- **Backend:** Appwrite (Auth + Database + Storage) en db.invisiongo.com
- **Validacion:** Zod
- **State:** Zustand
- **Deploy:** Dokploy en Hetzner (Docker standalone)
- **Repo:** github.com/invisiongo/seoinmediato

### Proximos Pasos
1. [x] Setup proyecto base (Next.js 16, deps, Dockerfile)
2. [x] Configurar Appwrite (clients, setup script)
3. [x] Implementar Auth con 2FA TOTP
4. [x] Dashboard base con sidebar y navegacion
5. [ ] Feature: Gestion de proyectos (CRUD)
6. [ ] Feature: Motor de keywords (generador combinatorio)
7. [ ] Feature: Templates de ubicaciones
8. [ ] Feature: Motor de sitios SEO (rutas dinamicas)
9. [ ] Feature: Motor de indexacion Google API
10. [ ] Testing E2E
11. [ ] Deploy Dokploy
