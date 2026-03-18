const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

export interface RecognizeResponse {
  name: string
  category: string
  confidence: number
  platform_family: string | null
  connectivity_caps: Record<string, boolean>
  technical_specs: Record<string, unknown>
  datasheet_url: string | null
  notes: string | null
}

export interface BOMItem {
  component_name: string
  quantity_required: number
  state: 'available' | 'partial' | 'missing' | 'incompatible'
  available_quantity: number
  alternatives: string[]
  notes: string | null
}

export interface ProjectSuggestion {
  title: string
  description: string
  viability_pct: number
  difficulty: string
  project_type: string
  bom: BOMItem[]
  tags: string[]
}

export interface CodeResource {
  filename: string
  language: string
  content: string
  explanation: string
  dependencies: string[]
}

export async function recognizeComponent(
  file: File,
  token: string,
): Promise<RecognizeResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/ai/recognize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function discoverProjects(
  inventory: unknown[],
  token: string,
): Promise<{ suggestions: ProjectSuggestion[] }> {
  return apiFetch('/ai/projects/discover', {
    method: 'POST',
    body: JSON.stringify({ inventory }),
  }, token)
}

export async function planProject(
  description: string,
  inventory: unknown[],
  refinement: unknown,
  token: string,
) {
  return apiFetch('/ai/projects/plan', {
    method: 'POST',
    body: JSON.stringify({ description, inventory, refinement }),
  }, token)
}

export async function generateCode(
  payload: unknown,
  token: string,
): Promise<{ resources: CodeResource[] }> {
  return apiFetch('/ai/code/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
}

export function qrImageUrl(qrCode: string): string {
  return `${API_BASE}/qr/${encodeURIComponent(qrCode)}`
}
