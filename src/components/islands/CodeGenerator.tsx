import { useState } from 'react'
import { generateCode } from '../../lib/api'
import { createSupabaseBrowserClient } from '../../lib/supabase'

const ENVIRONMENTS = ['arduino','platformio','esp-idf','zephyr','rust','esphome','micropython'] as const
const MODES = [{ value: 'skeleton', label: 'Esqueleto (TODOs)' }, { value: 'complete', label: 'Completo' }]

interface Props {
  projectId: string
  projectTitle: string
  projectType: string
  bom: { component_name: string; quantity_required: number }[]
}

export default function CodeGenerator({ projectId, projectTitle, projectType, bom }: Props) {
  const [env, setEnv] = useState<string>('arduino')
  const [mode, setMode] = useState('skeleton')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resources, setResources] = useState<{ filename: string; language: string; content: string; explanation: string }[]>([])
  const [activeFile, setActiveFile] = useState(0)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const result = await generateCode({ project_type: projectType ?? 'diy', environment: env, bom, project_title: projectTitle, mode }, session.access_token)
      setResources(result.resources)
      setActiveFile(0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generando código')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleGenerate} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Generar código</h3>
        <div className="grid grid-cols-2 gap-2">
          <select value={env} onChange={e => setEnv(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
            {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={mode} onChange={e => setMode(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
            {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
          ) : '✨ Generar código'}
        </button>
      </form>

      {resources.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {resources.map((r, i) => (
              <button key={i} onClick={() => setActiveFile(i)}
                className={`px-4 py-2.5 text-xs font-mono whitespace-nowrap transition-colors ${i === activeFile ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {r.filename}
              </button>
            ))}
          </div>
          <div className="bg-slate-900 p-4 overflow-x-auto max-h-80">
            <pre className="text-xs text-sky-200 font-mono leading-relaxed whitespace-pre">
              {resources[activeFile]?.content}
            </pre>
          </div>
          {resources[activeFile]?.explanation && (
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-600 leading-relaxed">{resources[activeFile].explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
