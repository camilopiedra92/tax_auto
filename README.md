# Portfolio Hub - Plataforma de Consolidación de Inversiones

Una aplicación para centralizar y analizar tus portfolios de inversión en un solo lugar. Actualmente soporta Interactive Brokers (IBKR) con planes de expandirse a otros brokers y plataformas.

## Características

- **Consolidación de Portfolios**: Visualiza todas tus inversiones en un dashboard unificado.
- **Análisis en Tiempo Real**: Seguimiento de posiciones, PnL y distribución de activos.
- **Soporte Multi-Broker**: Actualmente IBKR, con arquitectura preparada para expansión.
- **Multilenguaje**: Soporte para Español e Inglés.
- **Preparado para Docker**: Despliegue sencillo mediante Docker Compose.

## Estructura del Proyecto

- `/frontend`: Aplicación React + Vite con diseño moderno.
- `/api.py`: Backend FastAPI que sirve los datos procesados.
- `/parser.py`: Lógica de procesamiento de reportes (actualmente IBKR Flex Query XML).
- `Dockerfile` & `docker-compose.yml`: Configuraciones para contenedores.

## Requisitos Previos

- Python 3.11+
- Node.js 18+
- Docker (opcional, para despliegue)

## Instalación Local

### Backend
1. Instala las dependencias: `pip install -r requirements.txt`
2. Configura tu `config.json` con tu token de IBKR.
3. Inicia el servidor: `python api.py`

### Frontend
1. Entra a la carpeta: `cd frontend`
2. Instala dependencias: `npm install`
3. Inicia el modo desarrollo: `npm run dev`

## Despliegue con Coolify

Este repositorio está configurado para desplegarse automáticamente en Coolify detectando el archivo `docker-compose.yml`. 

Para una guía paso a paso detallada sobre cómo configurar las fuentes de Git, volúmenes persistentes y variables de entorno, consulta nuestra **[Guía de Despliegue (DEPLOY.md)](./DEPLOY.md)**.
