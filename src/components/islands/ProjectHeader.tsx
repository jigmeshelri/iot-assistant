import { useState, useRef, useEffect } from 'react'
import { updateProjectField, deleteProject } from '../../lib/projects'

interface Props {
  projectId: string
  title: string
  description: string
  status: string
  projectType: string
  difficulty: string | null
  progress: number
  isPublic: boolean
  tags: string[]
}

const STATUS_BADGE: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-brand-50 text-brand-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  abandoned: 'bg-red-50 text-red-600',
}

const STATUS_LABEL: Record<string, string> = {
  saved: 'Guardado',
  in_progress: 'En progreso',
  paused: 'Pausado',
  completed: 'Completado',
  abandoned: 'Abandonado',
}

const TYPE_LABEL: Record<string, string> = {
  diy: 'DIY',
  prototype: 'Prototipo',
  professional: 'Profesional',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Medio',
  hard: 'Difícil',
}

const PENCIL_ICON = (
  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

export default function ProjectHeader({
  projectId,
  title: initialTitle,
  description: initialDescription,
  status: initialStatus,
  projectType,
  difficulty,
  progress: initialProgress,
  isPublic: _isPublic,
  tags,
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleSaved, setTitleSaved] = useState(false)
  const [titleError, setTitleError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const [description, setDescription] = useState(initialDescription)
  const [editingDescription, setEditingDescription] = useState(false)
  const [descSaved, setDescSaved] = useState(false)
  const [descError, setDescError] = useState('')
  const descRef = useRef<HTMLTextAreaElement>(null)

  const [status, setStatus] = useState(initialStatus)
  const [statusError, setStatusError] = useState('')

  const [progress, setProgress] = useState(initialProgress)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressSaved, setProgressSaved] = useState(false)
  const [progressError, setProgressError] = useState('')

  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  useEffect(() => {
    if (editingDescription) {
      const el = descRef.current
      if (el) {
        el.focus()
        el.selectionStart = el.value.length
      }
    }
  }, [editingDescription])

  function flashSaved(setter: (v: boolean) => void) {
    setter(true)
    setTimeout(() => setter(false), 1500)
  }

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle)
      setEditingTitle(false)
      return
    }
    setTitleError('')
    const { error } = await updateProjectField(projectId, { title: trimmed })
    if (error) {
      setTitleError('Error al guardar título')
      return
    }
    setEditingTitle(false)
    flashSaved(setTitleSaved)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') {
      setTitle(initialTitle)
      setEditingTitle(false)
    }
  }

  async function saveDescription() {
    const trimmed = description.trim()
    if (trimmed === initialDescription) {
      setEditingDescription(false)
      return
    }
    setDescError('')
    const { error } = await updateProjectField(projectId, { description: trimmed })
    if (error) {
      setDescError('Error al guardar descripción')
      return
    }
    setEditingDescription(false)
    flashSaved(setDescSaved)
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setDescription(initialDescription)
      setEditingDescription(false)
    }
  }

  async function changeStatus(newStatus: string) {
    setStatusError('')
    const { error } = await updateProjectField(projectId, { status: newStatus })
    if (error) {
      setStatusError('Error al cambiar estado')
      return
    }
    setStatus(newStatus)
  }

  async function saveProgress(value: number) {
    setProgress(value)
    setProgressError('')
    const { error } = await updateProjectField(projectId, { progress: value })
    if (error) {
      setProgressError('Error al guardar progreso')
      return
    }
    flashSaved(setProgressSaved)
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return
    setDeleteError('')
    const { error } = await deleteProject(projectId)
    if (error) {
      setDeleteError('Error al eliminar proyecto')
      return
    }
    window.location.href = '/projects'
  }

  function renderStatusActions() {
    if (status === 'completed' || status === 'abandoned') return null
    const buttons: { label: string; target: string; color: string }[] = []
    if (status === 'saved') {
      buttons.push({ label: '▶ Iniciar', target: 'in_progress', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' })
    } else if (status === 'in_progress') {
      buttons.push({ label: '⏸ Pausar', target: 'paused', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' })
      buttons.push({ label: '✅ Completar', target: 'completed', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' })
      buttons.push({ label: '🗑 Abandonar', target: 'abandoned', color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' })
    } else if (status === 'paused') {
      buttons.push({ label: '▶ Reanudar', target: 'in_progress', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' })
      buttons.push({ label: '🗑 Abandonar', target: 'abandoned', color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' })
    }
    return (
      <div className="flex flex-wrap gap-2">
        {buttons.map(b => (
          <button
            key={b.target}
            onClick={() => changeStatus(b.target)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border ${b.color} transition-colors`}
          >
            {b.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 min-w-0">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
              className="text-lg lg:text-xl font-bold text-slate-900 bg-transparent border-b-2 border-brand-500 outline-none w-full min-w-0"
            />
          ) : (
            <>
              <h1 className="text-lg lg:text-xl font-bold text-slate-900 truncate">{title}</h1>
              <button
                onClick={() => setEditingTitle(true)}
                className="flex-shrink-0 p-1 rounded hover:bg-slate-100 transition-colors"
                title="Editar título"
              >
                {PENCIL_ICON}
              </button>
            </>
          )}
          {titleSaved && <span className="text-xs text-teal-600 flex-shrink-0">Guardado</span>}
        </div>
        {titleError && <p className="text-xs text-red-600 mt-1">{titleError}</p>}
      </div>

      {/* Description */}
      <div>
        {editingDescription ? (
          <textarea
            ref={descRef}
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={handleDescriptionKeyDown}
            rows={3}
            className="w-full text-sm text-slate-600 bg-transparent border border-brand-300 rounded-lg p-2 outline-none focus:border-brand-500 resize-none leading-relaxed"
          />
        ) : (
          <div
            onClick={() => setEditingDescription(true)}
            className="group cursor-pointer flex items-start gap-2"
          >
            <p className="text-sm text-slate-600 leading-relaxed flex-1">
              {description || 'Sin descripción — clic para agregar'}
            </p>
            <button
              className="flex-shrink-0 p-1 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Editar descripción"
            >
              {PENCIL_ICON}
            </button>
          </div>
        )}
        {descSaved && <span className="text-xs text-teal-600">Guardado</span>}
        {descError && <p className="text-xs text-red-600 mt-1">{descError}</p>}
      </div>

      {/* Status + actions */}
      <div className="space-y-2">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
        {renderStatusActions()}
        {statusError && <p className="text-xs text-red-600">{statusError}</p>}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Progreso</span>
          <span className="text-xs text-slate-500">{progress}%</span>
        </div>
        {editingProgress ? (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={e => {
                const v = Number(e.target.value)
                setProgress(v)
              }}
              onMouseUp={() => {
                saveProgress(progress)
                setEditingProgress(false)
              }}
              onTouchEnd={() => {
                saveProgress(progress)
                setEditingProgress(false)
              }}
              className="flex-1 accent-brand-600"
            />
            <span className="text-xs text-slate-600 w-8 text-right">{progress}%</span>
          </div>
        ) : (
          <div
            className="h-2 bg-slate-100 rounded-full cursor-pointer overflow-hidden"
            onClick={() => setEditingProgress(true)}
          >
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {progressSaved && <span className="text-xs text-teal-600">Guardado</span>}
        {progressError && <p className="text-xs text-red-600">{progressError}</p>}
      </div>

      {/* Type + difficulty badges */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
          {TYPE_LABEL[projectType] ?? projectType}
        </span>
        {difficulty && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {DIFFICULTY_LABEL[difficulty] ?? difficulty}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Delete project */}
      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Eliminar proyecto
        </button>
        {deleteError && <p className="text-xs text-red-600 mt-1">{deleteError}</p>}
      </div>
    </div>
  )
}
