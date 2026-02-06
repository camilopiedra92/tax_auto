# Despliegue en Coolify (Guía Detallada)

Esta aplicación está contenedorizada usando Docker y está diseñada para ser desplegada como un proyecto de **Docker Compose** en Coolify.

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
| `ALLOWED_ORIGINS` | `https://tu-dominio.com` | **Crucial**: La URL donde estará el frontend. Permite que el navegador haga peticiones. |
| `ENVIRONMENT` | `production` | Asegura que el servidor corra en modo producción. |
| `PORT` | `8000` | El puerto interno donde corre la API. |

### Servicio de Frontend (`frontend`)
| Clave | Valor | Descripción |
| :--- | :--- | :--- |
| `VITE_API_BASE` | `/api` | Indica a la app de React que envíe las peticiones al proxy local de Nginx. |

## 5. Persistencia (Tus Datos)
El `docker-compose.yml` incluye un volumen para el backend:
```yaml
volumes:
  - ./users:/app/users
```
Coolify crea automáticamente un volumen persistente en el servidor host para que tus reportes de IBKR y configuraciones de usuario **no se pierdan** al redespelgar o reiniciar la app.

## 6. Arquitectura (Cómo Funciona)
1. **Punto de Entrada**: El contenedor `frontend` (Nginx) escucha en el puerto 80.
2. **Archivos Estáticos**: Nginx sirve la aplicación React directamente.
3. **Proxy de API**: Cualquier petición a `https://tu-dominio.com/api/*` es capturada por Nginx y redirigida internamente al contenedor `backend` en `http://backend:8000/*`.
4. **CORS**: El backend verifica el encabezado `Origin` contra tu `ALLOWED_ORIGINS` por seguridad.

## 7. Solución de Problemas
- **El despliegue falla**: Revisa los **Deploy Logs** en Coolify. Problemas comunes incluyen archivos faltantes o errores de conexión con Git.
- **Frontend no conecta con Backend**: Verifica que `VITE_API_BASE` sea `/api` y que `ALLOWED_ORIGINS` coincida perfectamente con tu dominio (incluyendo `https://`).
- **Datos perdidos tras reiniciar**: Revisa la pestaña **Storage** en Coolify para asegurar que el volumen esté correctamente montado.
