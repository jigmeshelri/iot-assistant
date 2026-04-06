import { useState } from 'react'
import { DIFFICULTY } from '../../lib/constants'
import { publishProject, unpublishProject } from '../../lib/projects'

interface LogEntry {
  id: string
  content: string
  tag: string
  is_public: boolean
  created_at: string
}

interface Props {
  projectId: string
  isPublic: boolean
  status: string
  title: string
  description: string | null
  difficulty: string | null
  tags: string[]
  logEntries: LogEntry[]
}

const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTY) as Array<keyof typeof DIFFICULTY>).map(key => ({
  value: key,
  label: DIFFICULTY[key].label,
}))

const TAG_BADGE: Record<string, string> = {
  progress: 'bg-brand-50 text-brand-700',
  issue: 'bg-red-50 text-red-600',
  milestone: 'bg-amber-50 text-amber-700',
  note: 'bg-slate-100 text-slate-600',
}

export default function PublishProject({
  projectId,
  isPublic,
  status,
  title,
  description,
  difficulty,
  tags,
  logEntries,
}: Props) {
  const [open, setOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [error, setError] = useState('')

  const [pubTitle, setPubTitle] = useState(title)
  const [pubDescription, setPubDescription] = useState(description ?? '')
  const [pubDifficulty, setPubDifficulty] = useState(difficulty ?? 'beginner')
  const [pubTags, setPubTags] = useState<string[]>(tags)
  const [tagInput, setTagInput] = useState('')
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(
    () => new Set(logEntries.filter(e => e.is_public).map(e => e.id))
  )

  if (status !== 'completed') return null

  async function handlePublish() {
    setPublishing(true)
    setError('')
    const logUpdates = logEntries
      .filter(entry => entry.is_public !== selectedLogs.has(entry.id))
      .map(entry => ({ id: entry.id, is_public: selectedLogs.has(entry.id) }))
    const { error: projErr } = await publishProject(
      projectId,
      { title: pubTitle.trim(), description: pubDescription.trim() || null, difficulty: pubDifficulty, tags: pubTags },
      logUpdates,
    )
    if (projErr) {
      setError('Error al publicar el proyecto')
      setPublishing(false)
      return
    }
    window.location.reload()
  }

  async function handleUnpublish() {
    if (!window.confirm('¿Despublicar este proyecto? Ya no será visible en la comunidad.')) return
    setUnpublishing(true)
    setError('')
    const { error: err } = await unpublishProject(projectId)
    if (err) {
      setError('Error al despublicar')
      setUnpublishing(false)
      return
    }
    window.location.reload()
  }

  function toggleLog(id: string) {
    setSelectedLogs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removeTag(tag: string) {
    setPubTags(prev => prev.filter(t => t !== tag))
  }

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !pubTags.includes(trimmed)) {
      setPubTags(prev => [...prev, trimmed])
    }
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  if (isPublic) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
            Publicado en comunidad ✓
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/community/${projectId}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Ver en comunidad →
          </a>
          <button
            onClick={handleUnpublish}
            disabled={unpublishing}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {unpublishing ? 'Despublicando...' : 'Despublicar'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-brand-600 text-white rounded-2xl py-3 w-full font-medium text-sm hover:bg-brand-700 transition-colors"
        >
          Publicar en comunidad
        </button>
      )}

      {open && (
        <div className="border border-slate-200 rounded-2xl p-4 space-y-4 bg-white">
          <h3 className="text-sm font-semibold text-slate-800">Publicar proyecto</h3>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
            <input
              type="text"
              value={pubTitle}
              onChange={e => setPubTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
            <textarea
              value={pubDescription}
              onChange={e => setPubDescription(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dificultad</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPubDifficulty(opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    pubDifficulty === opt.value
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Etiquetas</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pubTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-brand-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag() }}
                placeholder="+ añadir"
                className="text-xs border border-dashed border-slate-300 rounded-full px-2.5 py-0.5 outline-none focus:border-brand-400 w-20"
              />
            </div>
          </div>

          {/* Log entries selector */}
          {logEntries.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Entradas de bitácora visibles
              </label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {logEntries.map(entry => (
                  <label
                    key={entry.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLogs.has(entry.id)}
                      onChange={() => toggleLog(entry.id)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TAG_BADGE[entry.tag] ?? 'bg-slate-100 text-slate-600'}`}>
                      {entry.tag}
                    </span>
                    <span className="text-xs text-slate-700 truncate flex-1">
                      {entry.content.length > 60 ? entry.content.slice(0, 60) + '...' : entry.content}
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatDate(entry.created_at)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Privacy note */}
          <div className="bg-sky-50 text-sky-700 rounded-xl p-3 text-xs">
            Tu inventario personal (cantidades, ubicaciones) no será visible para otros usuarios.
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setOpen(false)}
              disabled={publishing}
              className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || !pubTitle.trim()}
              className="flex-1 py-2.5 rounded-2xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {publishing ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
