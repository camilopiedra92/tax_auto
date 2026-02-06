# Configuración de Coolify - Guía Rápida

Esta guía contiene la configuración exacta que necesitas en Coolify para que tu aplicación funcione correctamente.

## 🌐 Tus Dominios

- **Frontend**: `https://portfolio.camilo-systems.com`
- **Backend**: `https://portfoliobackend.camilo-systems.com`

## ⚙️ Variables de Entorno en Coolify

### Servicio: `backend`

En Coolify, ve a tu proyecto → servicio `backend` → **Environment Variables** y configura:

```env
FRONTEND_URL=https://portfolio.camilo-systems.com
BACKEND_URL=https://portfoliobackend.camilo-systems.com
ENVIRONMENT=production
API_PORT=8000
```

### Servicio: `frontend`

En Coolify, ve a tu proyecto → servicio `frontend` → **Environment Variables** y configura:

```env
BACKEND_URL=https://portfoliobackend.camilo-systems.com
```

## 📋 Checklist de Despliegue

- [ ] 1. Hacer commit y push de los cambios a GitHub
  ```bash
  git add .
  git commit -m "fix: configure separate domains for frontend and backend"
  git push origin main
  ```

- [ ] 2. Configurar variables de entorno en Coolify (ver arriba)

- [ ] 3. Redesplegar ambos servicios en Coolify
  - Redesplegar `backend` primero
  - Luego redesplegar `frontend`

- [ ] 4. Verificar que el backend esté funcionando:
  ```bash
  curl https://portfoliobackend.camilo-systems.com/health
  ```
  **Respuesta esperada**: `{"status":"healthy"}`

- [ ] 5. Verificar que el frontend cargue:
  - Abrir `https://portfolio.camilo-systems.com` en el navegador
  - Abrir DevTools (F12) → pestaña **Console**
  - No debe haber errores CORS

- [ ] 6. Probar el login:
  - Intentar hacer login en la aplicación
  - Verificar en DevTools → **Network** que las peticiones a `portfoliobackend.camilo-systems.com` retornen 200 OK

## 🔍 Troubleshooting

### Error: "CORS policy blocked"

**Causa**: La variable `FRONTEND_URL` no está configurada correctamente en el backend.

**Solución**: 
1. Ve a Coolify → servicio `backend` → Environment Variables
2. Verifica que `FRONTEND_URL=https://portfolio.camilo-systems.com` (sin barra final `/`)
3. Redesplegar el backend

### Error: "Failed to fetch" o "Network Error"

**Causa**: El frontend no puede conectarse al backend.

**Solución**:
1. Verifica que el backend esté corriendo: `curl https://portfoliobackend.camilo-systems.com/health`
2. Verifica que `BACKEND_URL` esté configurado en el frontend
3. Revisa los logs del backend en Coolify para ver errores

### Backend no arranca

**Causa**: Error en el código o dependencias faltantes.

**Solución**:
1. Ve a Coolify → servicio `backend` → **Logs**
2. Busca errores de Python o dependencias faltantes
3. Verifica que `requirements.txt` tenga todas las dependencias

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         Usuario                              │
└────────────┬────────────────────────────────┬───────────────┘
             │                                 │
             │ HTTPS                           │ HTTPS
             │                                 │
             ▼                                 ▼
┌────────────────────────┐      ┌─────────────────────────────┐
│  portfolio.camilo-     │      │ portfoliobackend.camilo-    │
│  systems.com           │      │ systems.com                 │
│                        │      │                             │
│  ┌──────────────────┐ │      │  ┌───────────────────────┐  │
│  │ Nginx            │ │      │  │ FastAPI (uvicorn)     │  │
│  │ (puerto 80)      │ │      │  │ (puerto 8000)         │  │
│  └──────────────────┘ │      │  └───────────────────────┘  │
│  ┌──────────────────┐ │      │  ┌───────────────────────┐  │
│  │ React App        │ │      │  │ CORS: permite         │  │
│  │ (archivos        │ │      │  │ portfolio.camilo-     │  │
│  │  estáticos)      │ │      │  │ systems.com           │  │
│  └──────────────────┘ │      │  └───────────────────────┘  │
└────────────────────────┘      └─────────────────────────────┘
         Frontend                         Backend
```

**Flujo de peticiones:**
1. Usuario abre `https://portfolio.camilo-systems.com`
2. Nginx sirve la aplicación React
3. React hace peticiones HTTPS a `https://portfoliobackend.camilo-systems.com`
4. Backend verifica CORS y responde
