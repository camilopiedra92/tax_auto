# 🔍 Diagnóstico: Frontend no se conecta al Backend

## Problema
El frontend muestra: **"No se pudo conectar al backend. Asegúrese de que api.py esté ejecutándose."**

## Causa Raíz
El frontend fue construido (build) con la variable de entorno `VITE_API_BASE` incorrecta o no configurada. Las variables de Vite se "hornean" (bake) en el código JavaScript durante el build, por lo que cambiar la variable después del build NO tiene efecto.

## Solución Paso a Paso

### 1. Verificar que el Backend Funciona

Primero, confirma que el backend está funcionando:

```bash
curl https://portfoliobackend.camilo-systems.com/health
```

**Respuesta esperada:**
```json
{"status":"healthy"}
```

✅ Si esto funciona, el backend está bien. El problema es solo la configuración del frontend.

---

### 2. Configurar Variable de Entorno en Coolify

En Coolify, ve a tu proyecto → servicio **`frontend`** → **Environment Variables**:

**IMPORTANTE**: Asegúrate de que la variable esté configurada en el servicio `frontend`, NO en el servicio `backend`.

```
BACKEND_URL=https://portfoliobackend.camilo-systems.com
```

**⚠️ CRÍTICO**: 
- NO incluyas barra final (`/`) en la URL
- Debe ser `https://` (no `http://`)
- Debe coincidir exactamente con el dominio del backend

---

### 3. Verificar docker-compose.yml

Asegúrate de que tu `docker-compose.yml` tenga esto en el servicio `frontend`:

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      - VITE_API_BASE=${BACKEND_URL:-http://localhost:8000}
  environment:
    - VITE_API_BASE=${BACKEND_URL:-http://localhost:8000}
```

✅ Esto ya está correcto en tu código actual.

---

### 4. Forzar Rebuild del Frontend en Coolify

El problema más común es que Coolify usa una imagen cacheada del frontend que fue construida con la configuración anterior.

**Opción A: Rebuild desde la UI de Coolify**
1. Ve a tu proyecto en Coolify
2. Servicio `frontend` → **Settings** o **Deployment**
3. Busca la opción **"Force Rebuild"** o **"Clear Build Cache"**
4. Haz clic en **Redeploy**

**Opción B: Forzar rebuild con un cambio en el código**
1. Haz un pequeño cambio en cualquier archivo del frontend (ej: agrega un comentario)
2. Commit y push:
   ```bash
   cd /Users/camilopiedra/Documents/tax_auto
   echo "# Force rebuild" >> frontend/README.md
   git add frontend/README.md
   git commit -m "chore: force frontend rebuild"
   git push origin main
   ```
3. Coolify detectará el cambio y reconstruirá automáticamente

---

### 5. Verificar el Build en Coolify

Después de redesplegar, revisa los **Build Logs** del frontend en Coolify. Deberías ver algo como:

```
Building frontend...
--build-arg VITE_API_BASE=https://portfoliobackend.camilo-systems.com
```

Si NO ves la variable `VITE_API_BASE` en los logs, significa que no se está pasando correctamente.

---

### 6. Verificar en el Navegador

Una vez que el frontend se haya reconstruido y desplegado:

1. Abre `https://portfolio.camilo-systems.com`
2. Abre DevTools (F12) → pestaña **Console**
3. Escribe:
   ```javascript
   console.log(import.meta.env.VITE_API_BASE)
   ```
4. Debería mostrar: `https://portfoliobackend.camilo-systems.com`

Si muestra `undefined` o `http://localhost:8000`, el frontend NO se reconstruyó correctamente.

---

### 7. Solución Alternativa: Hardcodear Temporalmente

Si Coolify no está pasando la variable correctamente, puedes hardcodear temporalmente el valor para confirmar que ese es el problema:

**Edita estos 3 archivos:**

`frontend/src/App.jsx` línea 12:
```javascript
const API_BASE = 'https://portfoliobackend.camilo-systems.com';
```

`frontend/src/components/Login.jsx` línea 7:
```javascript
const API_BASE = 'https://portfoliobackend.camilo-systems.com';
```

`frontend/src/components/Settings.jsx` línea 7:
```javascript
const API_BASE = 'https://portfoliobackend.camilo-systems.com';
```

Luego commit, push y redesplega. Si esto funciona, confirma que el problema es la configuración de variables de entorno en Coolify.

---

## Checklist de Diagnóstico

- [ ] Backend responde en `https://portfoliobackend.camilo-systems.com/health`
- [ ] Variable `BACKEND_URL` está configurada en Coolify para el servicio `frontend`
- [ ] Frontend fue reconstruido (no solo redeployado) después de configurar la variable
- [ ] Build logs muestran `VITE_API_BASE` con el valor correcto
- [ ] DevTools console muestra la URL correcta cuando verificas `import.meta.env.VITE_API_BASE`

---

## Comandos Útiles para Debugging

**Verificar backend:**
```bash
curl https://portfoliobackend.camilo-systems.com/health
curl https://portfoliobackend.camilo-systems.com/
```

**Verificar frontend (debería cargar la app React):**
```bash
curl https://portfolio.camilo-systems.com
```

**Ver headers de CORS:**
```bash
curl -I -X OPTIONS https://portfoliobackend.camilo-systems.com/auth/login \
  -H "Origin: https://portfolio.camilo-systems.com" \
  -H "Access-Control-Request-Method: POST"
```

---

## Próximos Pasos

1. Verifica que el backend funcione con el comando curl
2. Configura `BACKEND_URL` en Coolify para el servicio `frontend`
3. Fuerza un rebuild del frontend
4. Verifica en el navegador que la conexión funcione

Si después de estos pasos sigue sin funcionar, comparte:
- Los build logs del frontend en Coolify
- El output de `import.meta.env.VITE_API_BASE` en la consola del navegador
- Los errores específicos en la consola del navegador (pestaña Console y Network)
