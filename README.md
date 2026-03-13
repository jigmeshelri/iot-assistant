# IoT Assistant: Inventory & Telemetry Ecosystem

Plataforma unificada para la gestión de inventario de componentes electrónicos y monitoreo de telemetría IoT, diseñada para el trabajo colaborativo entre entusiastas del hardware.

<p align="center">
  <img src="https://img.shields.io/badge/Astro-6-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Security-RLS-blue?style=for-the-badge&logo=postgresql&logoColor=white" alt="RLS" />
</p>

---

## 🚀 Arquitectura General

El proyecto utiliza un enfoque **Híbrido Moderno** para maximizar el rendimiento y la flexibilidad:

* **Frontend (Astro 6 + React 19):** Generación estática (SSG) para el catálogo maestro de componentes y React Islands para la gestión interactiva del stock.
* **Backend de Datos (Supabase):** PostgreSQL como motor principal, utilizando **Row Level Security (RLS)** para garantizar que cada usuario gestione solo su stock privado.
* **API de Inteligencia (FastAPI):** Microservicio dedicado al procesamiento de imágenes (reconocimiento de componentes) e ingesta masiva de telemetría.
* **Infraestructura:** Despliegue en **Vercel** y **Supabase Cloud** para alta disponibilidad con latencia mínima.

## 🛠️ Características Principales

1.  **Catálogo Maestro Normalizado:** Base de datos compartida de especificaciones técnicas (ESP32, Sensores, Actuadores) para evitar redundancia.
2.  **Gestión de Stock Multi-usuario:** Aislamiento total de datos mediante políticas de RLS.
3.  **Ubicaciones mediante QR:** Sistema de gestión de cajas y estantes físicos mediante identificadores únicos.
4.  **Telemetría en Tiempo Real:** Dashboard para visualizar datos enviados por nodos IoT (vía TimescaleDB).

## 📊 Estructura de Datos (Multi-modelo)

| Capa | Tecnología | Tipo de Datos |
| :--- | :--- | :--- |
| **Relacional** | PostgreSQL | Usuarios, Stock, Ubicaciones |
| **Documental** | JSONB | Especificaciones técnicas de hardware |
| **Series Temporales** | TimescaleDB | Logs y Telemetría de sensores |

## 🛠️ Entorno de Desarrollo

```bash
# Clonar el repositorio
git clone [https://github.com/jigmeshelri/iot-assistant.git](https://github.com/jigmeshelri/iot-assistant.git)

# Instalar dependencias
npm install

# Levantar entorno local (Docker)
docker-compose up -d
```

<p align="center">
<sub>Arquitectura diseñada para escalabilidad y colaboración Maker.</sub>
</p>
