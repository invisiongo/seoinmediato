import { Client, Databases, ID, Query } from 'node-appwrite'
import { readFileSync } from 'fs'
import { join } from 'path'

const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i)] = t.slice(i + 1)
}

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY)

const db = new Databases(client)
const DB = 'seoinmediato'
const COL = 'location_templates'

interface Template {
  name: string
  country: string
  locations: string[]
}

const templates: Template[] = [
  // ========== MEXICO ==========
  {
    name: 'CDMX - Alcaldías y Colonias principales',
    country: 'México',
    locations: [
      'Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán', 'Cuajimalpa',
      'Cuauhtémoc', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa', 'Magdalena Contreras',
      'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac', 'Tlalpan', 'Venustiano Carranza',
      'Xochimilco', 'Polanco', 'Condesa', 'Roma Norte', 'Roma Sur', 'Santa Fe',
      'Del Valle', 'Narvarte', 'Nápoles', 'Centro Histórico', 'Zona Rosa', 'Reforma',
      'Chapultepec', 'Coyoacán Centro', 'San Ángel', 'Pedregal', 'Insurgentes',
      'Lindavista', 'Tepito', 'La Merced', 'Doctores', 'Tacuba', 'Tacubaya',
      'Mixcoac', 'Copilco', 'Ciudad Universitaria',
    ],
  },
  {
    name: 'Mérida - Comisarías y Zonas',
    country: 'México',
    locations: [
      'Mérida Centro', 'Mérida Norte', 'Mérida Sur', 'Mérida Oriente', 'Mérida Poniente',
      'Altabrisa', 'Montebello', 'Gran Santa Fe', 'Caucel', 'Cholul', 'Conkal',
      'Kanasín', 'Umán', 'Progreso', 'Tixkokob', 'Hunucmá', 'Motul', 'Izamal',
      'Valladolid', 'García Ginerés', 'Campestre', 'Francisco de Montejo',
      'Las Américas', 'Chuburná', 'Itzimná', 'Jardines de Mérida', 'Montes de Amé',
      'Gran San Pedro Cholul', 'Temozón Norte', 'Dzityá', 'Santa Gertrudis Copó',
    ],
  },
  {
    name: 'Guadalajara - Zona Metropolitana',
    country: 'México',
    locations: [
      'Guadalajara Centro', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Tlajomulco',
      'El Salto', 'Chapala', 'Providencia', 'Chapalita', 'Colonia Americana',
      'Ladrón de Guevara', 'Jardines del Bosque', 'Ciudad del Sol', 'Arcos Vallarta',
      'Zona Minerva', 'Plaza del Sol', 'Andares', 'Puerta de Hierro', 'Santa Tere',
      'Analco', 'Mezquitán', 'Oblatos', 'Huentitán', 'Lomas del Valle',
      'Valle Real', 'Bugambilias',
    ],
  },
  {
    name: 'Monterrey - Zona Metropolitana',
    country: 'México',
    locations: [
      'Monterrey Centro', 'San Pedro Garza García', 'San Nicolás de los Garza',
      'Guadalupe', 'Apodaca', 'Escobedo', 'Santa Catarina', 'Juárez', 'García',
      'Cumbres', 'Valle', 'Contry', 'Del Valle Monterrey', 'Centrito Valle',
      'Leones', 'Mitras', 'Obispado', 'Barrio Antiguo', 'Fundidora', 'San Jerónimo',
      'Huinalá', 'Linda Vista', 'Tecnológico', 'Colinas de San Jerónimo',
      'La Pastora', 'Chipinque',
    ],
  },
  {
    name: 'Cancún y Riviera Maya',
    country: 'México',
    locations: [
      'Cancún Centro', 'Zona Hotelera Cancún', 'Puerto Cancún', 'Alfredo V. Bonfil',
      'Playa del Carmen', 'Tulum', 'Puerto Morelos', 'Isla Mujeres', 'Cozumel',
      'Bacalar', 'Felipe Carrillo Puerto', 'Akumal', 'Puerto Aventuras', 'Playacar',
      'Región 500', 'Supermanzana', 'Cancún Norte', 'Cancún Sur',
    ],
  },
  {
    name: 'Puebla',
    country: 'México',
    locations: [
      'Puebla Centro', 'Cholula', 'San Andrés Cholula', 'Angelópolis',
      'Lomas de Angelópolis', 'Atlixco', 'San Pedro Cholula', 'Cuetzalan',
      'Tehuacán', 'Zona Esmeralda', 'La Paz', 'Zavaleta', 'Xilotzingo',
      'Bosques de Angelópolis', 'Sonata',
    ],
  },
  {
    name: 'Querétaro',
    country: 'México',
    locations: [
      'Querétaro Centro', 'Juriquilla', 'El Marqués', 'Corregidora',
      'San Juan del Río', 'Zibatá', 'Milenio', 'Centro Sur', 'Constituyentes',
      'Altozano', 'Real de Juriquilla', 'Lomas del Cimatario',
      'Pedregal de Schoenstatt', 'Jurica', 'Santa Fe Querétaro',
    ],
  },
  // ========== ESPAÑA ==========
  {
    name: 'Madrid - Distritos y Barrios',
    country: 'España',
    locations: [
      'Madrid Centro', 'Arganzuela', 'Retiro', 'Salamanca', 'Chamartín', 'Tetuán',
      'Chamberí', 'Fuencarral-El Pardo', 'Moncloa-Aravaca', 'Latina', 'Carabanchel',
      'Usera', 'Puente de Vallecas', 'Moratalaz', 'Ciudad Lineal', 'Hortaleza',
      'Villaverde', 'Villa de Vallecas', 'Vicálvaro', 'San Blas', 'Barajas',
      'Malasaña', 'Chueca', 'Lavapiés', 'La Latina', 'Sol', 'Gran Vía',
      'Barrio de las Letras', 'Ópera', 'Atocha', 'Pozuelo de Alarcón', 'Alcobendas',
      'Las Rozas', 'Majadahonda', 'Getafe', 'Leganés', 'Alcalá de Henares',
    ],
  },
  {
    name: 'Barcelona - Distritos y Barrios',
    country: 'España',
    locations: [
      'Barcelona Centro', 'Ciutat Vella', 'Eixample', 'Sants-Montjuïc', 'Les Corts',
      'Sarrià-Sant Gervasi', 'Gràcia', 'Horta-Guinardó', 'Nou Barris', 'Sant Andreu',
      'Sant Martí', 'El Born', 'Gótico', 'Raval', 'Barceloneta', 'Poblenou',
      'Diagonal Mar', 'Pedralbes', 'Tibidabo', 'Badalona', "L'Hospitalet",
      'Sant Cugat', 'Terrassa', 'Sabadell', 'Castelldefels', 'Sitges',
    ],
  },
  {
    name: 'Valencia - Distritos y Zonas',
    country: 'España',
    locations: [
      'Valencia Centro', 'Ciutat Vella', "L'Eixample", 'Extramurs', 'Campanar',
      'La Saïdia', 'El Pla del Real', "L'Olivereta", 'Patraix', 'Jesús',
      'Quatre Carreres', 'Poblats Marítims', 'Camins al Grau', 'Algirós',
      'Benimaclet', 'Rascanya', 'Benicalap', 'Pobles del Nord', 'Pobles del Oest',
      'Pobles del Sud', 'La Malvarrosa', 'El Cabanyal', 'Ruzafa', 'Torrent',
      'Gandía', 'Sagunto',
    ],
  },
  {
    name: 'Sevilla - Distritos y Barrios',
    country: 'España',
    locations: [
      'Sevilla Centro', 'Triana', 'Macarena', 'Nervión', 'Los Remedios', 'Santa Cruz',
      'San Bernardo', 'La Cartuja', 'Dos Hermanas', 'Alcalá de Guadaíra', 'Camas',
      'San Juan de Aznalfarache', 'Tomares', 'Mairena del Aljarafe', 'Bormujos',
      'Bellavista', 'Pino Montano', 'Cerro Amate',
    ],
  },
  {
    name: 'Málaga - Costa del Sol',
    country: 'España',
    locations: [
      'Málaga Centro', 'Marbella', 'Estepona', 'Fuengirola', 'Torremolinos',
      'Benalmádena', 'Mijas', 'Nerja', 'Rincón de la Victoria', 'Vélez-Málaga',
      'Antequera', 'Puerto Banús', 'San Pedro de Alcántara', 'Nueva Andalucía',
      'Teatinos', 'El Palo', 'Pedregalejo', 'Huelin',
    ],
  },
  // ========== ESTADOS UNIDOS ==========
  {
    name: 'Houston TX - Areas and Neighborhoods',
    country: 'Estados Unidos',
    locations: [
      'Downtown Houston', 'Midtown', 'Montrose', 'The Heights', 'River Oaks',
      'Galleria', 'Memorial', 'Katy', 'Sugar Land', 'The Woodlands', 'Pearland',
      'Spring', 'Cypress', 'Humble', 'Pasadena', 'League City', 'Clear Lake',
      'Energy Corridor', 'Medical Center', 'Upper Kirby', 'Rice Village', 'EaDo',
      'Third Ward', 'Bellaire', 'West University',
    ],
  },
  {
    name: 'Los Angeles CA - Areas and Neighborhoods',
    country: 'Estados Unidos',
    locations: [
      'Downtown LA', 'Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice',
      'Pasadena', 'Glendale', 'Burbank', 'Long Beach', 'Westwood', 'Brentwood',
      'Culver City', 'Inglewood', 'Koreatown', 'Silver Lake', 'Echo Park',
      'Los Feliz', 'West Hollywood', 'Manhattan Beach', 'Redondo Beach', 'Torrance',
      'Pomona', 'Anaheim', 'Irvine', 'Huntington Beach',
    ],
  },
  {
    name: 'Miami FL - Areas and Neighborhoods',
    country: 'Estados Unidos',
    locations: [
      'Downtown Miami', 'Miami Beach', 'South Beach', 'Brickell', 'Coral Gables',
      'Coconut Grove', 'Wynwood', 'Little Havana', 'Doral', 'Hialeah', 'Kendall',
      'Homestead', 'Key Biscayne', 'Aventura', 'Sunny Isles', 'North Miami',
      'Miami Lakes', 'Pinecrest', 'Palmetto Bay', 'Cutler Bay', 'Miami Springs',
      'Sweetwater', 'Westchester', 'Flagami',
    ],
  },
  {
    name: 'Dallas TX - Areas and Neighborhoods',
    country: 'Estados Unidos',
    locations: [
      'Downtown Dallas', 'Uptown', 'Deep Ellum', 'Bishop Arts', 'Oak Lawn',
      'Highland Park', 'University Park', 'Plano', 'Frisco', 'McKinney', 'Allen',
      'Richardson', 'Garland', 'Arlington', 'Irving', 'Grand Prairie', 'Mesquite',
      'Carrollton', 'Lewisville', 'Flower Mound', 'Southlake', 'Addison',
      'Cedar Hill', 'Duncanville', 'DeSoto',
    ],
  },
  {
    name: 'New York NY - Boroughs and Neighborhoods',
    country: 'Estados Unidos',
    locations: [
      'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Midtown',
      'Upper East Side', 'Upper West Side', 'SoHo', 'Tribeca', 'Chelsea',
      'Greenwich Village', 'East Village', 'Lower East Side', 'Harlem',
      'Washington Heights', 'Williamsburg', 'DUMBO', 'Park Slope', 'Bushwick',
      'Astoria', 'Long Island City', 'Flushing', 'Jamaica', 'Hoboken', 'Jersey City',
    ],
  },
  {
    name: 'Chicago IL - Areas and Neighborhoods',
    country: 'Estados Unidos',
    locations: [
      'Downtown Chicago', 'Loop', 'River North', 'Lincoln Park', 'Lakeview',
      'Wicker Park', 'Bucktown', 'Logan Square', 'Old Town', 'Gold Coast',
      'South Loop', 'West Loop', 'Pilsen', 'Hyde Park', 'Evanston', 'Oak Park',
      'Naperville', 'Schaumburg', 'Skokie', 'Wrigleyville', 'Streeterville',
      'Chinatown', 'Bridgeport', 'Ukrainian Village',
    ],
  },
  // ========== CANADÁ ==========
  {
    name: 'Toronto ON - Areas and Neighborhoods',
    country: 'Canadá',
    locations: [
      'Downtown Toronto', 'Midtown', 'North York', 'Scarborough', 'Etobicoke',
      'York', 'East York', 'Yorkville', 'The Annex', 'Kensington Market',
      'Queen West', 'Liberty Village', 'King West', 'Distillery District',
      'Leslieville', 'The Beaches', 'Danforth', 'High Park', 'Roncesvalles',
      'Bloor West', 'Forest Hill', 'Lawrence Park', 'Don Mills', 'Mississauga',
      'Brampton', 'Markham', 'Vaughan', 'Richmond Hill', 'Oakville',
    ],
  },
  {
    name: 'Montreal QC - Arrondissements et Quartiers',
    country: 'Canadá',
    locations: [
      'Ville-Marie', 'Le Plateau-Mont-Royal', 'Rosemont-La Petite-Patrie',
      'Côte-des-Neiges-Notre-Dame-de-Grâce', 'Le Sud-Ouest',
      'Mercier-Hochelaga-Maisonneuve', 'Ahuntsic-Cartierville', 'Verdun',
      'LaSalle', 'Saint-Laurent', 'Outremont', 'Westmount', 'Griffintown',
      'Old Montreal', 'Mile End', 'Little Italy', 'Jean-Talon', 'Laval',
      'Longueuil', 'Brossard',
    ],
  },
  {
    name: 'Vancouver BC - Areas and Neighborhoods',
    country: 'Canadá',
    locations: [
      'Downtown Vancouver', 'Gastown', 'Yaletown', 'Kitsilano', 'Mount Pleasant',
      'Commercial Drive', 'Main Street', 'West End', 'Coal Harbour', 'Chinatown',
      'Fairview', 'Kerrisdale', 'Dunbar', 'Point Grey', 'UBC', 'Burnaby',
      'Richmond', 'Surrey', 'North Vancouver', 'West Vancouver', 'Coquitlam',
      'New Westminster', 'Langley', 'White Rock', 'Delta',
    ],
  },
  {
    name: 'Estado de México - Municipios y Zonas',
    country: 'México',
    locations: [
      'Toluca', 'Metepec', 'Naucalpan', 'Tlalnepantla', 'Ecatepec', 'Nezahualcóyotl',
      'Huixquilucan', 'Atizapán de Zaragoza', 'Cuautitlán Izcalli', 'Coacalco',
      'Tultitlán', 'Texcoco', 'Chalco', 'Ixtapaluca', 'Los Reyes La Paz',
      'Chimalhuacán', 'Tecámac', 'Nicolás Romero', 'Zinacantepec', 'Lerma',
      'Ocoyoacac', 'San Mateo Atenco', 'Tenango del Valle', 'Almoloya de Juárez',
      'Valle de Bravo', 'Interlomas', 'Satélite', 'Ciudad López Mateos',
      'Buenavista', 'Santa Fe Estado de México',
    ],
  },
  {
    name: 'Campeche - Municipios y Zonas',
    country: 'México',
    locations: [
      'Campeche Centro', 'Ciudad del Carmen', 'Champotón', 'Calkiní', 'Hopelchén',
      'Escárcega', 'Candelaria', 'Tenabo', 'Hecelchakán', 'Palizada',
      'Calakmul', 'Seybaplaya', 'Sabancuy', 'Isla del Carmen', 'Atasta',
    ],
  },
  {
    name: 'Quintana Roo - Estado Completo',
    country: 'México',
    locations: [
      'Cancún', 'Playa del Carmen', 'Tulum', 'Chetumal', 'Cozumel', 'Isla Mujeres',
      'Puerto Morelos', 'Bacalar', 'Felipe Carrillo Puerto', 'José María Morelos',
      'Lázaro Cárdenas', 'Solidaridad', 'Benito Juárez', 'Othón P. Blanco',
      'Puerto Aventuras', 'Akumal', 'Holbox', 'Mahahual', 'Xcaret', 'Cobá',
      'Zona Hotelera Cancún', 'Playacar', 'Playa Mujeres', 'Puerto Cancún',
      'Alfredo V. Bonfil',
    ],
  },
]

async function main() {
  console.log(`Seeding ${templates.length} location templates...`)

  // Check existing templates to avoid duplicates
  const existing = await db.listDocuments(DB, COL, [Query.limit(100)])
  const existingNames = new Set(existing.documents.map((d) => d.name as string))

  let created = 0
  let skipped = 0

  for (const tpl of templates) {
    if (existingNames.has(tpl.name)) {
      console.log(`  SKIP: "${tpl.name}" (already exists)`)
      skipped++
      continue
    }

    await db.createDocument(DB, COL, ID.unique(), {
      name: tpl.name,
      country: tpl.country,
      locations: tpl.locations.join('\n'),
      userId: 'system',
      createdAt: new Date().toISOString(),
    })
    console.log(`  CREATED: "${tpl.name}" (${tpl.locations.length} locations)`)
    created++
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`)
}

main().catch(console.error)
