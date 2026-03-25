import { useState, useRef, useEffect } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

interface Props {
  locationId: string
  name: string
  stockCount: number
}

export default function LocationManager({ locationId, name: initialName, stockCount }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === initialName) {
      setName(initialName)
      setEditing(false)
      return
    }
    const supabase = createSupabaseBrowserClient()
    await supabase.from('locations').update({ name: trimmed }).eq('id', locationId)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') {
      setName(initialName)
      setEditing(false)
    }
  }

  async function handleDelete() {
    const msg = stockCount > 0
      ? `Esta ubicación tiene ${stockCount} componentes que quedarán sin ubicación. ¿Continuar?`
      : '¿Eliminar esta ubicación?'
    if (!window.confirm(msg)) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('locations').delete().eq('id', locationId)
    window.location.href = '/locations'
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={handleKeyDown}
            className="text-xl font-bold text-slate-900 bg-transparent border-b-2 border-brand-500 outline-none w-full min-w-0"
          />
        ) : (
          <>
            <h2 className="text-xl font-bold text-slate-900 truncate">{name}</h2>
            <button
              onClick={() => setEditing(true)}
              className="flex-shrink-0 p-1 rounded hover:bg-slate-100 transition-colors"
              title="Editar nombre"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </>
        )}
        {saved && <span className="text-xs text-teal-600 flex-shrink-0">Guardado</span>}
      </div>
      <button
        onClick={handleDelete}
        className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-red-50 flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
        Eliminar ubicación
      </button>
    </div>
  )
}
