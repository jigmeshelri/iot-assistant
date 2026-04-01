import { useState } from 'react'
import { addLogEntry, type LogEntry } from '../../lib/projects'

type LogTag = 'progress' | 'problem' | 'solution' | 'learning' | 'code'

interface Props {
  projectId: string
  initialEntries: LogEntry[]
}

const TAG_LABELS: Record<LogTag, { label: string; emoji: string; class: string }> = {
  progress: { label: 'Progreso', emoji: '📈', class: 'bg-teal-100 text-teal-700' },
  problem:  { label: 'Problema', emoji: '🐛', class: 'bg-red-100 text-red-700' },
  solution: { label: 'Solución', emoji: '💡', class: 'bg-amber-100 text-amber-700' },
  learning: { label: 'Aprendizaje', emoji: '📚', class: 'bg-purple-100 text-purple-700' },
  code:     { label: 'Código', emoji: '💻', class: 'bg-slate-100 text-slate-700' },
}

export default function LogTimeline({ projectId, initialEntries }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>(initialEntries)
  const [content, setContent] = useState('')
  const [tag, setTag] = useState<LogTag>('progress')
  const [isPublic, setIsPublic] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setAdding(true)
    const { data } = await addLogEntry({ projectId, content, tag, isPublic })
    setAdding(false)
    if (data) {
      setEntries(prev => [data, ...prev])
      setContent('')
      setShowForm(false)
    }
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-colors"
        >
          + Añadir entrada a la bitácora
        </button>
      ) : (
        <form onSubmit={handleAddEntry} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
          <select value={tag} onChange={e => setTag(e.target.value as LogTag)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            {Object.entries(TAG_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="¿Qué hiciste? ¿Qué encontraste?"
            rows={3}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-teal-500" />
            Visible públicamente
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={adding}
              className="flex-1 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
              {adding ? '...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {entries.map(entry => {
        const t = TAG_LABELS[entry.tag] ?? TAG_LABELS.progress
        return (
          <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.class}`}>
                {t.emoji} {t.label}
              </span>
              {entry.is_public && <span className="text-xs text-slate-400">🌍 Público</span>}
              <span className="text-xs text-slate-400 ml-auto">
                {new Date(entry.created_at).toLocaleDateString('es', { day:'2-digit', month:'short' })}
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
          </div>
        )
      })}
    </div>
  )
}
