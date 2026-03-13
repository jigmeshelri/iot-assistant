# IoT Assistant: Inventory & Telemetry Ecosystem

Plataforma unificada para la gestión de inventario de componentes electrónicos y monitoreo de telemetría IoT, diseñada para el trabajo colaborativo entre entusiastas del hardware.

<p align="center">
  <img src="https://img.shields.io/badge/Astro-6-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TimescaleDB-pg16-FDB515?style=for-the-badge&logo=postgresql&logoColor=white" alt="TimescaleDB" />
</p>

---

## Arquitectura General

Enfoque **Híbrido Moderno** para maximizar rendimiento y flexibilidad:

| Capa | Tecnología | Responsabilidad |
| :--- | :--- | :--- |
| **Frontend** | Astro 6 + React 19 | SSG para catálogo maestro; React Islands para gestión de stock interactiva |
| **Base de Datos** | Supabase (PostgreSQL + RLS) | Datos relacionales y JSONB con aislamiento multi-usuario via Row Level Security |
| **Series Temporales** | TimescaleDB (pg16) | Ingesta y consulta de telemetría de sensores IoT |
| **API de Inteligencia** | FastAPI (Python 3.12+) | Reconocimiento de componentes por imagen e ingesta de telemetría |
| **Infraestructura Cloud** | Vercel + Supabase Cloud | Frontend y base de datos en producción |

## Características Principales

1. **Catálogo Maestro Normalizado** — Base compartida de specs técnicas (MCUs, Sensores, Actuadores) para evitar redundancia; specs flexibles via JSONB.
2. **Gestión de Stock Multi-usuario** — Aislamiento total mediante políticas RLS: cada usuario ve y gestiona únicamente su propio stock.
3. **Ubicaciones con QR** — Gestión jerárquica de cajas y estantes físicos mediante identificadores únicos escaneables.
4. **Telemetría en Tiempo Real** — Dashboard para visualizar datos de nodos IoT almacenados en TimescaleDB.

## Estructura del Repositorio

```
iot-assistant/
├── api/                    # FastAPI microservice (Python 3.12+)
│   ├── main.py             # App entry point
│   ├── requirements.txt
│   └── Dockerfile
├── supabase/
│   └── migrations/         # SQL migrations (validadas antes de aplicar)
├── src/                    # Astro 6 + React 19 frontend
│   ├── components/         # React Islands
│   ├── layouts/
│   └── pages/
├── docker-compose.yaml     # Entorno local: TimescaleDB + FastAPI
└── README.md
```

## Entorno de Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/jigmeshelri/iot-assistant.git
cd iot-assistant

# Levantar base de datos (TimescaleDB) + API
docker-compose up -d

# API disponible en: http://localhost:8000
# Docs interactivos:  http://localhost:8000/docs

# Instalar dependencias del frontend
npm install

# Iniciar servidor de desarrollo Astro
npm run dev
# Frontend en: http://localhost:4321
```

### Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores antes de levantar Docker:

```bash
cp .env.example .env
```

<p align="center">
<sub>Arquitectura diseñada para escalabilidad y colaboración Maker.</sub>
</p>
