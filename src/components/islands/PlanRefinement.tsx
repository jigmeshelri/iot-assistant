import { useState } from 'react'
import { discoverProjects, planProject } from '../../lib/api'
import { createSupabaseBrowserClient } from '../../lib/supabase'
import BOMTable from './BOMTable'

interface Props {
  mode: 'discover' | 'plan'
}

const DIFFICULTIES = [
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio'   },
  { value: 'advanced',     label: 'Avanzado'     },
]

const DIFFICULTY_BADGES: Record<string, string> = {
  beginner:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced:     'bg-red-50 text-red-700 border-red-200',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

// Normalize API response items: the API returns `status`, BOMTable expects `state`
function normalizeBOMItems(items: unknown[]): Parameters<typeof BOMTable>[0]['items'] {
  return (items as Record<string, unknown>[]).map(item => ({
    component_name:    String(item.component_name ?? ''),
    quantity_required: Number(item.quantity_required ?? 1),
    notes:             item.incompatibility_reason ? String(item.incompatibility_reason) : undefined,
    state:             (item.status ?? item.state) as 'available' | 'partial' | 'missing' | 'incompatible' | undefined,
  }))
}

export default function PlanRefinement({ mode }: Props) {
  const [description, setDescription]             = useState('')
  const [preferredController, setPreferredController] = useState('')
  const [difficulty, setDifficulty]               = useState('')
  const [constraints, setConstraints]             = useState('')
  const [loading, setLoading]                     = useState(false)
  const [error, setError]                         = useState('')
  const [results, setResults]                     = useState<Record<string, unknown>[] | null>(null)
  const [savingIdx, setSavingIdx]                 = useState<number | null>(null)
  const [savedIdx, setSavedIdx]                   = useState<number | null>(null)
  const [saveError, setSaveError]                 = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults(null)
    setSavedIdx(null)
    setSaveError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No autenticado')

      const { data: stock } = await supabase
        .from('stock')
        .select('quantity, component:components(id,name,category,platform_family,connectivity_caps,technical_specs)')
      const inventory = (stock ?? []).map(s => ({
        name:              (s.component as Record<string, unknown>)?.name,
        category:          (s.component as Record<string, unknown>)?.category,
        quantity:          s.quantity,
        platform_family:   (s.component as Record<string, unknown>)?.platform_family,
        connectivity_caps: (s.component as Record<string, unknown>)?.connectivity_caps ?? {},
        specs:             (s.component as Record<string, unknown>)?.technical_specs ?? {},
      }))

      if (mode === 'discover') {
        const res = await discoverProjects(inventory, session.access_token)
        setResults(res.suggestions as unknown as Record<string, unknown>[])
      } else {
        const refinement = {
          preferred_controller: preferredController || null,
          difficulty:           difficulty || null,
          constraints:          constraints ? constraints.split(',').map(s => s.trim()).filter(Boolean) : [],
        }
        const res = await planProject(description, inventory, refinement, session.access_token)
        setResults([res as unknown as Record<string, unknown>])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error consultando IA')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(result: Record<string, unknown>, idx: number) {
    setSavingIdx(idx)
    setSaveError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data: project, error: dbError } = await supabase
        .from('projects')
        .insert({
          user_id:      user.id,
          title:        String(result.title ?? 'Proyecto IA'),
          description:  String(result.description ?? ''),
          source:       mode === 'discover' ? 'ai_discovery' : 'ai_planning',
          project_type: 'diy',
          difficulty:   result.difficulty ? String(result.difficulty) : null,
          tags:         Array.isArray(result.tags) ? result.tags.map(String) : [],
        })
        .select()
        .single()

      if (dbError) throw new Error(dbError.message)
      if (project) {
        setSavedIdx(idx)
        setTimeout(() => { window.location.href = `/projects/${project.id}` }, 600)
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error guardando proyecto')
    } finally {
      setSavingIdx(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">

        {mode === 'plan' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Describe tu proyecto <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Quiero construir un monitor de temperatura con WiFi y pantalla OLED..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-slate-300"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Controlador preferido</label>
            <input
              value={preferredController}
              onChange={e => setPreferredController(e.target.value)}
              placeholder="ESP32, Arduino..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dificultad</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent text-slate-700"
            >
              <option value="">Cualquiera</option>
              {DIFFICULTIES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Restricciones</label>
          <input
            value={constraints}
            onChange={e => setConstraints(e.target.value)}
            placeholder="sin WiFi, batería pequeña, bajo coste... (separadas por coma)"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-slate-300"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Consultando IA...
            </>
          ) : mode === 'discover' ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Descubrir proyectos
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              Generar BOM
            </>
          )}
        </button>
      </form>

      {/* ── Results ──────────────────────────────────────────────────── */}
      {results && results.map((result, i) => {
        const bomItems = Array.isArray(result.bom) ? normalizeBOMItems(result.bom as unknown[]) : []
        const diff = result.difficulty ? String(result.difficulty) : null
        const isSaving = savingIdx === i
        const isSaved  = savedIdx === i

        return (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

            {/* Header */}
            <div className="p-5 border-b border-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {String(result.title ?? '')}
                  </h3>
                  {result.description && (
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {String(result.description)}
                    </p>
                  )}
                </div>

                {/* Viability (discover mode) */}
                {result.viability_pct !== undefined && (
                  <div className="flex-shrink-0 text-center">
                    <div className="text-2xl font-bold text-brand-600">{String(result.viability_pct)}%</div>
                    <div className="text-xs text-slate-400">viabilidad</div>
                  </div>
                )}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mt-3">
                {diff && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${DIFFICULTY_BADGES[diff] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {DIFFICULTY_LABELS[diff] ?? diff}
                  </span>
                )}
                {result.project_type && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {String(result.project_type)}
                  </span>
                )}
              </div>

              {/* Controller note (plan mode) */}
              {result.controller_note && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <p className="text-xs text-amber-700">{String(result.controller_note)}</p>
                </div>
              )}
            </div>

            {/* BOM */}
            {bomItems.length > 0 && (
              <div className="p-5 pt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Lista de materiales ({bomItems.length} componentes)
                </h4>
                <BOMTable items={bomItems} />
              </div>
            )}

            {/* External resources (discover mode) */}
            {Array.isArray(result.resources) && result.resources.length > 0 && (
              <div className="px-5 pb-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recursos</h4>
                <div className="flex flex-col gap-1">
                  {(result.resources as string[]).map((url, ri) => (
                    <a
                      key={ri}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:text-brand-700 truncate"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="px-5 pb-5">
              {saveError && savingIdx === null && (
                <p className="text-xs text-red-500 mb-2">{saveError}</p>
              )}
              <button
                onClick={() => handleSave(result, i)}
                disabled={isSaving || isSaved}
                className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors
                  bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {isSaved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Guardado — redirigiendo...
                  </>
                ) : isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Guardar proyecto
                  </>
                )}
              </button>
            </div>

          </div>
        )
      })}

    </div>
  )
}
