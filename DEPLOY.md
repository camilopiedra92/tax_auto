# Despliegue en Coolify (Guía Detallada)

Portfolio Hub es una aplicación contenedorizada usando Docker, diseñada para centralizar y gestionar portfolios de inversión. Está optimizada para ser desplegada como un proyecto de **Docker Compose** en Coolify.

## 1. Requisitos Previos
- Un servidor Linux con [Coolify](https://coolify.io/) instalado.
- Tu código debe estar en un repositorio Git (GitHub, GitLab, Bitbucket, o una instancia propia).

## 2. Configuración de la Fuente Git en Coolify
Coolify necesita saber dónde está tu código. Tienes dos opciones principales:

### Opción A: Aplicación de GitHub (Recomendado)
1. Ve a **Sources** en Coolify.
2. Conecta tu cuenta de GitHub e instala la GitHub App de Coolify en tu repositorio.
3. Esto permite que Coolify:
   - Despliegue automáticamente el código nuevo en cada push.
   - Muestre el historial de commits y el estado del despliegue.
   - Maneje repositorios privados de forma segura sin gestionar llaves SSH manualmente.

### Opción B: Repositorio Git Público/Privado
1. En el flujo de **Add New Resource**, selecciona **Public/Private Git Repository**.
2. Pega la URL de Git (ej. `https://github.com/username/tax_auto.git`).
3. Para repositorios privados, necesitarás añadir una **Deploy Key** (llave SSH) en tu proveedor de Git.

## 3. Creación de la Aplicación en Coolify
1. Ve a tu **Project** y haz clic en **+ New Resource**.
2. Selecciona **Docker Compose**.
3. Elige tu **Source** (configurado en el Paso 2) y la **Branch** (usualmente `main`).
4. Coolify leerá el archivo `docker-compose.yml` de tu repositorio.

## 4. Configuración y Variables de Entorno
Una vez creado el recurso, navega a la pestaña de **Environment Variables** en Coolify. Debes configurar lo siguiente:

### Servicio de Backend (`backend`)
| Clave | Valor | Descripción |
| :--- | :--- | :--- |
| `FRONTEND_URL` | `https://portfolio.camilo-systems.com` | **Crucial**: La URL del frontend. Permite peticiones CORS desde el navegador. |
| `BACKEND_URL` | `https://portfoliobackend.camilo-systems.com` | URL del backend (opcional, para health checks externos). |
| `ENVIRONMENT` | `production` | Asegura que el servidor corra en modo producción. |
| `API_PORT` | `8000` | El puerto interno donde corre la API. |

### Servicio de Frontend (`frontend`)
| Clave | Valor | Descripción |
| :--- | :--- | :--- |
| `BACKEND_URL` | `https://portfoliobackend.camilo-systems.com` | URL del backend donde el frontend enviará las peticiones API. |

> [!IMPORTANT]
> **Rebuild Requerido**: Después de cambiar `BACKEND_URL`, debes **forzar un rebuild** del frontend en Coolify (no solo redesplegar). Las variables de Vite se "hornean" en el código JavaScript durante el build.

## 5. Persistencia (Tus Datos)
El `docker-compose.yml` incluye un volumen para el backend:
```yaml
volumes:
  - ./users:/app/users
```
Coolify crea automáticamente un volumen persistente en el servidor host para que tus reportes de IBKR y configuraciones de usuario **no se pierdan** al redespelgar o reiniciar la app.

## 6. Arquitectura (Cómo Funciona)

### Arquitectura con Dominios Separados

Tu aplicación usa **dos dominios separados**:
- **Frontend**: `https://portfolio.camilo-systems.com` (Nginx + React)
- **Backend**: `https://portfoliobackend.camilo-systems.com` (FastAPI)

**Flujo de peticiones:**
1. **Punto de Entrada Frontend**: El navegador carga la app React desde `https://portfolio.camilo-systems.com`
2. **Archivos Estáticos**: Nginx sirve la aplicación React directamente
3. **Peticiones API**: El navegador hace peticiones HTTPS directamente a `https://portfoliobackend.camilo-systems.com`
4. **CORS**: El backend verifica que el encabezado `Origin` sea `https://portfolio.camilo-systems.com` antes de responder

**Importante**: No hay proxy de Nginx en esta configuración. El frontend se comunica directamente con el backend a través de HTTPS.

## 7. Solución de Problemas
- **El despliegue falla**: Revisa los **Deploy Logs** en Coolify. Problemas comunes incluyen archivos faltantes o errores de conexión con Git.
- **Frontend funciona pero Backend no responde**: 
  - Verifica que `FRONTEND_URL` esté configurado correctamente en las variables de entorno del servicio `backend`
  - Asegúrate de que el `docker-compose.yml` tenga `expose: - 8000` en el servicio backend
  - Revisa los logs del contenedor backend en Coolify para ver si hay errores de inicio
  - Prueba el health check: `curl https://tu-dominio.com/api/health` (debe retornar `{"status":"healthy"}`)
- **Frontend no conecta con Backend**: Verifica que `VITE_API_BASE` sea `/api` y que `FRONTEND_URL` coincida perfectamente con tu dominio (incluyendo `https://`).
- **Datos perdidos tras reiniciar**: Revisa la pestaña **Storage** en Coolify para asegurar que el volumen esté correctamente montado.

