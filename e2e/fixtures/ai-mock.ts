import { test as base } from '@playwright/test'
import type {
  RecognizeResponse,
  CodeResource,
  CodeAnalyzeResponse,
} from '../../src/lib/api'

// ---------------------------------------------------------------------------
// Mock response shapes (match src/lib/api.ts interfaces)
// ---------------------------------------------------------------------------

function buildRecognizeResponse(confidence: number): RecognizeResponse {
  return {
    name: 'ESP32-C6 XIAO',
    category: 'MCU',
    confidence,
    platform_family: 'ESP32',
    connectivity_caps: { wifi: true, ble: true, zigbee: true },
    technical_specs: { flash: '4MB', ram: '512KB', voltage: '3.3V' },
    datasheet_url: 'https://example.com/esp32-c6-datasheet.pdf',
    notes: 'Microcontrolador de bajo consumo con conectividad múltiple',
  }
}

const DISCOVER_RESPONSE = {
  suggestions: [
    {
      title: 'Estación meteorológica IoT',
      description: 'Monitor temperatura y humedad con visualización en dashboard',
      viability_pct: 92,
      difficulty: 'intermediate',
      project_type: 'diy',
      bom: [
        {
          component_name: 'ESP32-C6 XIAO',
          quantity_required: 1,
          state: 'available' as const,
          available_quantity: 3,
          alternatives: [],
          notes: null,
        },
        {
          component_name: 'DHT22',
          quantity_required: 1,
          state: 'available' as const,
          available_quantity: 5,
          alternatives: ['DHT11'],
          notes: null,
        },
      ],
      tags: ['iot', 'clima', 'wifi'],
    },
    {
      title: 'Control de acceso con RFID',
      description: 'Sistema de control de acceso usando lector RFID y relay',
      viability_pct: 78,
      difficulty: 'beginner',
      project_type: 'prototype',
      bom: [
        {
          component_name: 'Relay Module 5V',
          quantity_required: 1,
          state: 'available' as const,
          available_quantity: 1,
          alternatives: [],
          notes: null,
        },
      ],
      tags: ['seguridad', 'rfid'],
    },
    {
      title: 'Automatización de riego',
      description: 'Sistema automático de riego con sensores de humedad del suelo',
      viability_pct: 65,
      difficulty: 'intermediate',
      project_type: 'diy',
      bom: [
        {
          component_name: 'Servo SG90',
          quantity_required: 2,
          state: 'partial' as const,
          available_quantity: 2,
          alternatives: [],
          notes: null,
        },
      ],
      tags: ['jardinería', 'automatización'],
    },
  ],
}

const PLAN_RESPONSE = {
  title: 'Estación meteorológica IoT',
  description: 'Monitor temperatura y humedad con visualización en dashboard',
  status: 'saved',
  project_type: 'diy',
  difficulty: 'intermediate',
  source: 'ai_plan',
  progress: 0,
  tags: ['iot', 'clima', 'wifi'],
  bom: [
    {
      component_name: 'ESP32-C6 XIAO',
      quantity_required: 1,
      state: 'available' as const,
      available_quantity: 3,
      alternatives: [],
      notes: null,
    },
    {
      component_name: 'DHT22',
      quantity_required: 1,
      state: 'available' as const,
      available_quantity: 5,
      alternatives: [],
      notes: null,
    },
  ],
  steps: [
    'Conectar DHT22 al pin GPIO4 del ESP32',
    'Configurar WiFi con las credenciales de la red',
    'Publicar datos vía MQTT cada 30 segundos',
  ],
}

function buildCodeGenerateResponse(): { resources: CodeResource[] } {
  return {
    resources: [
      {
        filename: 'main.cpp',
        language: 'cpp',
        content: `#include <DHT.h>
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  Serial.printf("Temp: %.1f°C  Hum: %.1f%%\\n", t, h);
  delay(2000);
}`,
        explanation: 'Código de ejemplo para leer temperatura y humedad con DHT22',
        dependencies: ['DHT sensor library', 'Adafruit Unified Sensor'],
      },
    ],
  }
}

const CODE_ANALYZE_RESPONSE: CodeAnalyzeResponse = {
  explanation: 'El código es correcto y sigue buenas prácticas para Arduino. Se recomienda agregar manejo de errores para lecturas NaN del DHT22.',
  improved_code: `#include <DHT.h>
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println("Error leyendo DHT22");
    delay(2000);
    return;
  }
  Serial.printf("Temp: %.1f°C  Hum: %.1f%%\\n", t, h);
  delay(2000);
}`,
}

// ---------------------------------------------------------------------------
// Fixture type
// ---------------------------------------------------------------------------

export type AiMockFixture = {
  aiMock: void
}

export type LowConfidenceAiMockFixture = {
  lowConfidenceAiMock: void
}

// ---------------------------------------------------------------------------
// Helper: wire all AI routes on the given page
// ---------------------------------------------------------------------------

async function wireAiRoutes(
  page: import('@playwright/test').Page,
  confidence: number,
) {
  const recognizeResponse = buildRecognizeResponse(confidence)

  await page.route('**/ai/recognize', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(recognizeResponse),
    })
  })

  await page.route('**/ai/projects/discover', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DISCOVER_RESPONSE),
    })
  })

  await page.route('**/ai/projects/plan', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PLAN_RESPONSE),
    })
  })

  await page.route('**/ai/code/generate', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildCodeGenerateResponse()),
    })
  })

  await page.route('**/ai/code/analyze', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CODE_ANALYZE_RESPONSE),
    })
  })
}

// ---------------------------------------------------------------------------
// Exported fixtures
// ---------------------------------------------------------------------------

/**
 * `aiMock` — intercepts all AI API routes with high-confidence responses.
 * Compose with your base fixture using `test.extend()`.
 */
export const aiMock = base.extend<AiMockFixture>({
  aiMock: async ({ page }, use) => {
    await wireAiRoutes(page, 0.95)
    await use()
  },
})

/**
 * `lowConfidenceAiMock` — same as aiMock but recognize returns confidence 0.45
 * (below threshold → triggers the low-confidence warning UI).
 */
export const lowConfidenceAiMock = base.extend<LowConfidenceAiMockFixture>({
  lowConfidenceAiMock: async ({ page }, use) => {
    await wireAiRoutes(page, 0.45)
    await use()
  },
})
