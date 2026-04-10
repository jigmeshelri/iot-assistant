import { useState } from 'react'
import { insertLocation, type Location } from '../../lib/locations'

interface Props {
  parentId?: string
  onCreated: (loc: Location) => void
  onCancel: () => void
  placeholder?: string
  variant?: 'root' | 'child'
}

export default function LocationCreateForm({
  parentId,
  onCreated,
  onCancel,
  placeholder = 'Nombre de ubicación',
  variant = 'root',
}: Props) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const loc = await insertLocation(name, parentId)
      if (!loc) {
        setError('No se pudo crear la ubicación')
        return
      }
      onCreated(loc)
      setName('')
    } catch {
      setError('No se pudo crear la ubicación')
    } finally {
      setCreating(false)
    }
  }

  if (variant === 'child') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-1 py-2 mt-2">
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600 disabled:opacity-50"
          >
            {creating ? '...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-sm"
          >
            ✕
          </button>
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </form>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
        >
          {creating ? '...' : 'Crear'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50"
        >
          ✕
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </form>
  )
}
