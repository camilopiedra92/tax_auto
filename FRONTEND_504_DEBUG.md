# 🔴 Error 504 Gateway Timeout en Frontend

## Diagnóstico del Problema

El error **504 Gateway Timeout** significa que Coolify no puede conectarse al contenedor del frontend. Esto puede deberse a:

1. ❌ El build del frontend está fallando
2. ❌ El contenedor no está arrancando correctamente
3. ❌ Nginx no está escuchando en el puerto 80
4. ❌ La variable `VITE_API_BASE` tiene un valor inválido que rompe el build

## Pasos de Diagnóstico

### 1. Revisar Build Logs en Coolify

Ve a Coolify → tu proyecto → servicio `frontend` → **Build Logs**

**Busca errores como:**
```
ERROR: failed to solve: process "/bin/sh -c npm run build" did not complete successfully
```

o

```
✘ [ERROR] Could not resolve "..."
```

**Si ves errores de build**, el problema es que Vite no puede construir la aplicación.

---

### 2. Revisar Runtime Logs en Coolify

Ve a Coolify → tu proyecto → servicio `frontend` → **Logs** (runtime logs)

**Deberías ver:**
```
/docker-entrypoint.sh: Configuration complete; ready for start up
```

**Si NO ves esto**, el contenedor no está arrancando.

---

### 3. Verificar Variables de Entorno

**CRÍTICO**: Asegúrate de que `VITE_API_BASE` tenga un valor válido:

✅ **CORRECTO:**
```
VITE_API_BASE=https://portfoliobackend.camilo-systems.com
```

❌ **INCORRECTO (puede romper el build):**
```
VITE_API_BASE=
VITE_API_BASE=/api
VITE_API_BASE=undefined
```

---

### 4. Verificar que el Puerto esté Expuesto

En `docker-compose.yml`, el servicio `frontend` debe tener:

```yaml
frontend:
  expose:
    - 80
```

✅ Esto ya está correcto en tu configuración.

---

## Soluciones Comunes

### Solución 1: Limpiar Cache y Rebuild

1. En Coolify, ve al servicio `frontend`
2. Busca la opción **"Force Rebuild"** o **"Clear Build Cache"**
3. Redesplega el frontend

### Solución 2: Verificar que VITE_API_BASE esté configurado

1. Ve a Coolify → servicio `frontend` → **Environment Variables**
2. Asegúrate de que `VITE_API_BASE` esté configurado:
   ```
   VITE_API_BASE=https://portfoliobackend.camilo-systems.com
   ```
3. Guarda y redesplega

### Solución 3: Verificar el Dockerfile

El `Dockerfile` del frontend debe verse así:

```dockerfile
# Build stage
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

✅ Tu Dockerfile ya tiene esta configuración correcta.

### Solución 4: Verificar nginx.conf

El `nginx.conf` debe ser simple:

```nginx
server {
    listen 80;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

✅ Tu nginx.conf ya tiene esta configuración correcta.

---

## Comandos de Verificación

### Verificar que el backend funciona:
```bash
curl https://portfoliobackend.camilo-systems.com/health
# Debe retornar: {"status":"healthy"}
```

### Verificar que el frontend responde (desde Coolify):
```bash
# Dentro del contenedor del frontend
curl http://localhost:80
# Debe retornar HTML
```

---

## Checklist de Diagnóstico

- [ ] Build logs del frontend no muestran errores
- [ ] Runtime logs muestran "ready for start up"
- [ ] `VITE_API_BASE` está configurado correctamente en Coolify
- [ ] El contenedor del frontend está en estado "running" (no "restarting")
- [ ] El puerto 80 está expuesto en docker-compose.yml
- [ ] Se hizo un rebuild completo (no solo redeploy)

---

## Información Necesaria para Debugging

Si el problema persiste, necesito ver:

1. **Build Logs completos** del frontend en Coolify
2. **Runtime Logs** del frontend en Coolify
3. **Estado del contenedor** (running, restarting, exited)
4. **Variables de entorno** configuradas para el servicio `frontend`

---

## Solución Temporal: Test Local

Para verificar que el frontend funciona localmente:

```bash
cd /Users/camilopiedra/Documents/tax_auto/frontend

# Configurar variable de entorno
export VITE_API_BASE=https://portfoliobackend.camilo-systems.com

# Build local
npm run build

# Verificar que dist/ se creó
ls -la dist/

# Si dist/ existe, el build funciona
```

Si el build local funciona pero en Coolify no, el problema es la configuración de Coolify.
