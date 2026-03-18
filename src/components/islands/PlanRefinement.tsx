import { useState } from 'react'
import { discoverProjects, planProject } from '../../lib/api'
import { createSupabaseBrowserClient } from '../../lib/supabase'
import BOMTable from './BOMTable'

interface Props {
  mode: 'discover' | 'plan'
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

export default function PlanRefinement({ mode }: Props) {
  const [description, setDescription] = useState('')
  const [preferredController, setPreferredController] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [constraints, setConstraints] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Fetch user inventory
      const { data: stock } = await supabase
        .from('stock')
        .select('quantity, notes, component:components(id,name,category,platform_family,connectivity_caps,technical_specs)')
      const inventory = (stock ?? []).map(s => ({
        component_id: (s.component as Record<string, unknown>)?.id,
        name: (s.component as Record<string, unknown>)?.name,
        category: (s.component as Record<string, unknown>)?.category,
        quantity: s.quantity,
        platform_family: (s.component as Record<string, unknown>)?.platform_family,
        connectivity_caps: (s.component as Record<string, unknown>)?.connectivity_caps ?? {},
        technical_specs: (s.component as Record<string, unknown>)?.technical_specs ?? {},
      }))

      if (mode === 'discover') {
        const res = await discoverProjects(inventory, session.access_token)
        setResults(res.suggestions as unknown as Record<string, unknown>[])
      } else {
        const refinement = {
          preferred_controller: preferredController || null,
          difficulty: difficulty || null,
          constraints: constraints ? constraints.split(',').map(s => s.trim()).filter(Boolean) : [],
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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        {mode === 'plan' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Describe tu proyecto *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Quiero construir un monitor de temperatura con WiFi y pantalla OLED..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Controlador preferido</label>
            <input value={preferredController} onChange={e => setPreferredController(e.target.value)}
              placeholder="ESP32, Arduino..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dificultad</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">Cualquiera</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Restricciones (separadas por coma)</label>
          <input value={constraints} onChange={e => setConstraints(e.target.value)}
            placeholder="sin WiFi, batería pequeña, bajo coste..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium text-sm hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Consultando IA...</>
          ) : mode === 'discover' ? '✨ Descubrir proyectos' : '🗺️ Generar BOM'}
        </button>
      </form>

      {results && results.map((result, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">{String(result.title ?? '')}</h3>
            {result.viability_pct !== undefined && (
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-teal-600">{String(result.viability_pct)}%</div>
                <div className="text-xs text-slate-400">viabilidad</div>
              </div>
            )}
          </div>
          {result.description && <p className="text-xs text-slate-600 leading-relaxed">{String(result.description)}</p>}
          {result.bom && Array.isArray(result.bom) && result.bom.length > 0 && (
            <BOMTable items={result.bom as Parameters<typeof BOMTable>[0]['items']} />
          )}
          {mode === 'discover' && (
            <button
              onClick={async () => {
                const supabase = createSupabaseBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: project } = await supabase
                  .from('projects')
                  .insert({
                    user_id: user.id,
                    title: String(result.title ?? 'Proyecto IA'),
                    description: String(result.description ?? ''),
                    source: 'ai_discover',
                    project_type: String(result.project_type ?? 'diy'),
                    difficulty: result.difficulty ? String(result.difficulty) : null,
                    tags: Array.isArray(result.tags) ? result.tags.map(String) : [],
                  })
                  .select()
                  .single()
                if (project) window.location.href = `/projects/${project.id}`
              }}
              className="w-full py-2 border border-teal-200 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-50 transition-colors"
            >
              Guardar este proyecto
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
