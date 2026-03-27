import { useState } from 'react'
import { generateCode, analyzeCode } from '../../lib/api'
import type { SavedCodeResource } from '../../lib/codeResources'
import { localMaxVersion, getAuthToken, saveCodeResource, deleteCodeResource } from '../../lib/codeResources'

const IMPROVEMENT_KEYWORDS: { pattern: RegExp; label: string; color: string }[] = [
  { pattern: /performance|rendimiento/i,  label: 'rendimiento', color: 'bg-blue-100 text-blue-700' },
  { pattern: /security|seguridad/i,       label: 'seguridad',   color: 'bg-red-100 text-red-700' },
  { pattern: /readability|legibilidad/i,  label: 'legibilidad', color: 'bg-green-100 text-green-700' },
  { pattern: /bug|error/i,                label: 'bug potencial', color: 'bg-orange-100 text-orange-700' },
  { pattern: /style|estilo/i,             label: 'estilo',      color: 'bg-purple-100 text-purple-700' },
  { pattern: /optimization|optimización/i, label: 'optimización', color: 'bg-teal-100 text-teal-700' },
]

function ImprovementBadges({ explanation }: { explanation: string }) {
  const found = IMPROVEMENT_KEYWORDS.filter(k => k.pattern.test(explanation))
  if (found.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {found.map(k => (
        <span key={k.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${k.color}`}>
          {k.label}
        </span>
      ))}
    </div>
  )
}

const ENVIRONMENTS = ['arduino','platformio','esp-idf','zephyr','rust','esphome','micropython'] as const
const ANALYZE_MODES = [
  { value: 'review',   label: 'Revisar bugs' },
  { value: 'optimize', label: 'Optimizar' },
  { value: 'refactor', label: 'Refactorizar' },
] as const

interface Props {
  projectId:        string
  projectTitle:     string
  projectType:      string
  bom:              { component_name: string; quantity_required: number }[]
  initialResources: SavedCodeResource[]
}

type View          = 'generate' | 'analyze'
type AnalyzeSource = 'existing' | 'paste'

export default function CodeResources({ projectId, projectTitle, projectType, bom, initialResources }: Props) {
  const [view, setView]               = useState<View>('generate')
  const [resources, setResources]     = useState<SavedCodeResource[]>(initialResources)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [explanation, setExplanation] = useState('')

  // Generate mode state
  const [env, setEnv]   = useState('arduino')
  const [mode, setMode] = useState('skeleton')

  // Analyze mode state
  const [analyzeSource, setAnalyzeSource]     = useState<AnalyzeSource>('existing')
  const [analyzeMode, setAnalyzeMode]         = useState<'review'|'optimize'|'refactor'>('review')
  const [selectedResourceId, setSelectedResourceId] = useState('')
  const [pasteCode, setPasteCode]             = useState('')
  const [pasteLang, setPasteLang]             = useState('cpp')
  const [pasteEnv, setPasteEnv]               = useState('arduino')
  const [pasteFilename, setPasteFilename]     = useState('')

  // Delete confirmation state: resourceId → 'pending' | undefined
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Version viewer: filename → version number to display
  const [viewingVersion, setViewingVersion] = useState<Record<string, number>>({})

  function friendlyError(msg: string): string {
    if (msg.includes('503')) return 'La IA se encuentra en la oficina sin teléfono, por favor intenta más tarde'
    if (msg.includes('422')) return 'La IA y yo no nos estamos entendiendo, intenta más tarde'
    return msg
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setExplanation('')
    try {
      const token = await getAuthToken()
      const result = await generateCode({ project_type: projectType ?? 'diy', environment: env, bom, project_title: projectTitle, mode }, token)
      const newResources: SavedCodeResource[] = []
      for (const r of result.resources) {
        // Nota sobre parent_id: se deriva del estado local para trazabilidad de linaje.
        // Los números de versión se leen de Supabase (fetchMaxVersion) → siempre son correctos.
        // Si otro cliente añadió versiones desde que se cargó la página, parent_id puede apuntar
        // a una versión intermedia que no es la última en DB, pero esto es aceptable.
        const currentMax = localMaxVersion(resources, r.filename)
        const parentId = currentMax > 0
          ? (resources.find(x => x.filename === r.filename && x.version === currentMax)?.id ?? null)
          : null
        const saved = await saveCodeResource(projectId, { filename: r.filename, language: r.language, environment: env, content: r.content, isGenerated: true, parentId })
        newResources.push(saved)
      }
      setResources(prev => {
        const updated = [...prev]
        for (const r of newResources) {
          const idx = updated.findIndex(x => x.filename === r.filename && x.version === r.version)
          if (idx >= 0) updated[idx] = r; else updated.push(r)
        }
        return updated
      })
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setExplanation('')
    try {
      const token = await getAuthToken()
      let code = '', language = 'cpp', environment: string | null = null, filename = '', sourceId: string | null = null
      if (analyzeSource === 'existing' && selectedResourceId) {
        const src = resources.find(r => r.id === selectedResourceId)
        if (!src) throw new Error('Recurso no encontrado')
        code = src.content; language = src.language; environment = src.environment; filename = src.filename; sourceId = src.id
      } else {
        if (!pasteCode.trim()) throw new Error('El código no puede estar vacío')
        code = pasteCode; language = pasteLang; environment = pasteEnv || null; filename = pasteFilename || `code.${pasteLang}`
      }
      const result = await analyzeCode({ code, language, environment: environment ?? undefined, mode: analyzeMode, project_type: projectType ?? 'diy' }, token)
      setExplanation(result.explanation)
      const saved = await saveCodeResource(projectId, { filename, language, environment, content: result.improved_code, isGenerated: false, parentId: sourceId })
      setResources(prev => [...prev, saved])
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(resource: SavedCodeResource) {
    // Optimistic update
    setResources(prev => prev.filter(r => r.id !== resource.id))
    setDeleteConfirm(null)
    try {
      await deleteCodeResource(projectId, resource.id)
    } catch {
      // Revert
      setResources(prev => [...prev, resource].sort((a, b) => a.version - b.version))
      setError(`No se pudo eliminar ${resource.filename} v${resource.version}`)
    }
  }

  function handleDownload(resource: SavedCodeResource) {
    const blob = new Blob([resource.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = resource.filename; a.click()
    URL.revokeObjectURL(url)
  }

  // Group resources by filename, sorted by version desc
  const grouped = Object.entries(
    resources.reduce<Record<string, SavedCodeResource[]>>((acc, r) => {
      if (!acc[r.filename]) acc[r.filename] = []
      acc[r.filename].push(r)
      return acc
    }, {})
  ).map(([filename, versions]) => ({
    filename,
    versions: versions.sort((a, b) => b.version - a.version),
  }))

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['generate', 'analyze'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setError(''); setExplanation('') }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {v === 'generate' ? 'Generar' : 'Analizar'}
          </button>
        ))}
      </div>

      {/* Generate panel */}
      {view === 'generate' && (
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={env} onChange={e => setEnv(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={mode} onChange={e => setMode(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="skeleton">Esqueleto (TODOs)</option>
              <option value="complete">Completo</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
              : '✨ Generar código'}
          </button>
        </form>
      )}

      {/* Analyze panel */}
      {view === 'analyze' && (
        <form onSubmit={handleAnalyze} className="space-y-3">
          {/* Source toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['existing', 'paste'] as AnalyzeSource[]).map(s => (
              <button key={s} type="button"
                onClick={() => setAnalyzeSource(s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${analyzeSource === s ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {s === 'existing' ? 'Recurso existente' : 'Pegar código'}
              </button>
            ))}
          </div>

          {analyzeSource === 'existing' ? (
            <select value={selectedResourceId} onChange={e => setSelectedResourceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— Selecciona un archivo —</option>
              {grouped.flatMap(({ versions }) =>
                versions.map(r => (
                  <option key={r.id} value={r.id}>{r.filename} v{r.version}</option>
                ))
              )}
            </select>
          ) : (
            <div className="space-y-2">
              <input value={pasteFilename} onChange={e => setPasteFilename(e.target.value)}
                placeholder="nombre-archivo.cpp"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <div className="grid grid-cols-2 gap-2">
                <input value={pasteLang} onChange={e => setPasteLang(e.target.value)} placeholder="cpp"
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <select value={pasteEnv} onChange={e => setPasteEnv(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <textarea value={pasteCode} onChange={e => setPasteCode(e.target.value)}
                placeholder="Pega tu código aquí..." rows={6}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          )}

          {/* Analyze mode buttons */}
          <div className="flex gap-2">
            {ANALYZE_MODES.map(m => (
              <button key={m.value} type="button"
                onClick={() => setAnalyzeMode(m.value as typeof analyzeMode)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${analyzeMode === m.value ? 'bg-teal-500 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analizando...</>
              : '🔍 Analizar código'}
          </button>
        </form>
      )}

      {/* Explanation panel */}
      {explanation && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-800">Resultado del análisis</span>
            <button onClick={() => setExplanation('')} className="text-xs text-amber-600 hover:text-amber-800">✕</button>
          </div>
          <ImprovementBadges explanation={explanation} />
          <div className="text-xs text-amber-900 whitespace-pre-wrap">{explanation}</div>
        </div>
      )}

      {/* Resource list */}
      {grouped.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recursos guardados</h3>
          {grouped.map(({ filename, versions }) => {
            const activeVersion = viewingVersion[filename] ?? versions[0].version
            const activeResource = versions.find(v => v.version === activeVersion) ?? versions[0]
            const prevCount = versions.length - 1
            return (
              <div key={filename} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-mono font-medium text-slate-800 truncate block">{filename}</span>
                    <span className="text-xs text-slate-400">{activeResource.language} · {activeResource.environment ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Version picker */}
                    <select
                      value={activeVersion}
                      onChange={e => setViewingVersion(prev => ({ ...prev, [filename]: +e.target.value }))}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      {versions.map(v => (
                        <option key={v.id} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                    {/* Download */}
                    <button onClick={() => handleDownload(activeResource)} title="Descargar"
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                      <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    {/* Delete */}
                    {deleteConfirm === activeResource.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(activeResource)}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600">Confirmar</button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="text-xs px-2 py-1 border border-slate-200 rounded-lg text-slate-500">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(activeResource.id)} title="Eliminar"
                        aria-label="eliminar"
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <svg className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {prevCount > 0 && (
                  <p className="text-xs text-slate-400">{prevCount} versión{prevCount > 1 ? 'es' : ''} anterior{prevCount > 1 ? 'es' : ''}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
