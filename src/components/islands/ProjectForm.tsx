import { useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

const PROJECT_TYPES = [
  { value: 'diy', label: 'DIY' },
  { value: 'prototype', label: 'Prototipo' },
  { value: 'professional', label: 'Profesional' },
] as const

const DIFFICULTIES = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
] as const

export default function ProjectForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState<string>('diy')
  const [difficulty, setDifficulty] = useState<string>('beginner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: insertErr } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          project_type: projectType,
          difficulty,
          status: 'saved',
          source: 'manual',
        })
        .select()
        .single()

      if (insertErr) throw insertErr
      window.location.href = `/projects/${data.id}`
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error desconocido'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function btnClass(active: boolean) {
    return active
      ? 'flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white transition-colors'
      : 'flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <div>
        <label htmlFor="title" className="block text-xs font-medium text-slate-600 mb-1">Nombre del proyecto *</label>
        <input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          placeholder="Mi proyecto IoT"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-medium text-slate-600 mb-1">Descripcion</label>
        <textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe brevemente tu proyecto..."
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Tipo de proyecto</label>
        <div className="flex gap-2">
          {PROJECT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setProjectType(t.value)}
              className={btnClass(projectType === t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Dificultad</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map(d => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={btnClass(difficulty === d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium text-sm hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear proyecto'}
      </button>
    </form>
  )
}
