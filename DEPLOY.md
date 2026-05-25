# Deployment - SEOImediato

## Deploy en Dokploy (Hetzner)

### 1. Crear aplicacion

1. En Dokploy, ir a **Projects** → **New Application**
2. Source: **GitHub** → repositorio `invisiongo/seoinmediato` → branch `main`
3. Build Type: **Dockerfile**
4. Dokploy detectara el Dockerfile en la raiz automaticamente

### 2. Variables de entorno

Configurar en Dokploy → Application → Environment:

```
NEXT_PUBLIC_APP_URL=https://seoinmediato.com
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://db.invisiongo.com/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=6a144cb200033adb6dbb
NEXT_PUBLIC_APPWRITE_PROJECT_NAME=SEOImediato
APPWRITE_API_KEY=your_appwrite_api_key_here
OPENROUTER_API_KEY=sk-or-v1-your_key_here
CRON_SECRET=genera_un_secreto_aleatorio_seguro
```

### 3. Dominio y red

1. Dominio: `seoinmediato.com`
2. HTTPS: Activar (Let's Encrypt automatico con Dokploy)
3. Network: `dokploy-network`
4. Puerto: 3000

### 4. Appwrite - Agregar plataforma web

En la consola de Appwrite:
1. Ir al proyecto → Settings → Platforms
2. Agregar plataforma Web: `seoinmediato.com`
3. Esto permite que el SDK de Appwrite funcione desde el dominio de produccion

### 5. Deploy

Click en **Deploy** en Dokploy. El build toma ~2-3 minutos.

### 6. Post-deploy

```bash
# Crear las colecciones en Appwrite (si es primera vez)
npm run setup:appwrite

# Crear usuario admin
npm run create:admin

# Cargar templates de ubicaciones (MX, ES, US, CA)
npm run seed:locations
```

---

## Proxy para dominios de clientes

Las paginas SEO se sirven desde la API route:
```
/api/sites/[domain]/[slug]
```

Para que los dominios reales de clientes apunten a estas rutas, se necesita un proxy inverso.

### Opcion A: Dokploy alias (simple)

1. En Dokploy → Application → Domains → Add Domain
2. Agregar el dominio del cliente: `cafeteriadeleite.com`
3. En el DNS del cliente, crear CNAME apuntando al servidor Dokploy
4. Nota: con este metodo la app recibe el request directamente, pero la ruta seria `/` no `/api/sites/...`

### Opcion B: Nginx proxy (recomendado)

Crear un servicio Nginx en Dokploy con la siguiente configuracion:

```nginx
server {
    listen 80;
    server_name cafeteriadeleite.com;

    # Paginas SEO
    location / {
        proxy_pass http://seoinmediato-app:3000/api/sites/cafeteriadeleite.com$request_uri;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Sitemap
    location = /sitemap.xml {
        proxy_pass http://seoinmediato-app:3000/api/sites/cafeteriadeleite.com/sitemap.xml;
    }

    # Sitemap pages
    location ~ ^/sitemaps/(\d+)$ {
        proxy_pass http://seoinmediato-app:3000/api/sites/cafeteriadeleite.com/sitemaps/$1;
    }

    # robots.txt
    location = /robots.txt {
        proxy_pass http://seoinmediato-app:3000/api/sites/cafeteriadeleite.com/robots.txt;
    }
}
```

### Opcion C: Caddy (alternativa)

```caddyfile
cafeteriadeleite.com {
    reverse_proxy /sitemap.xml seoinmediato-app:3000 {
        rewrite /api/sites/cafeteriadeleite.com/sitemap.xml
    }
    reverse_proxy /robots.txt seoinmediato-app:3000 {
        rewrite /api/sites/cafeteriadeleite.com/robots.txt
    }
    reverse_proxy /sitemaps/* seoinmediato-app:3000 {
        rewrite /api/sites/cafeteriadeleite.com{uri}
    }
    reverse_proxy * seoinmediato-app:3000 {
        rewrite /api/sites/cafeteriadeleite.com{uri}
    }
}
```

### DNS del cliente

El cliente debe configurar su DNS:
```
CNAME  @   →  servidor-dokploy.tu-dominio.com
CNAME  www →  servidor-dokploy.tu-dominio.com
```

---

## Testing local

```bash
# Desarrollo
npm run dev

# Probar paginas SEO directamente
http://localhost:3000/api/sites/cafeterias-quito.com/comprar-cafeteria-barata-en-calderon
http://localhost:3000/api/sites/cafeterias-quito.com/sitemap.xml
http://localhost:3000/api/sites/cafeterias-quito.com/robots.txt
```

## Docker local

```bash
docker build -t seoinmediato .
docker run -p 3000:3000 --env-file .env.local seoinmediato
```

## Arquitectura

```
[Cliente Browser] → [Dokploy/Nginx] → [SEOImediato Next.js :3000]
                                              ↓
                                        [Appwrite DB]
                                              ↓
                                   [Google Indexing API]

[Google Bot] → [Nginx Proxy] → [/api/sites/domain/slug] → [HTML SEO Page]
```
