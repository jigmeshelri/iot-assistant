import { useState, useEffect, useRef } from 'react'
import { fetchLocations, insertLocation, buildTree, type Location } from '../../lib/locations'

interface Props {
  value: string | null
  onChange: (locationId: string | null) => void
  locationName?: string
}

interface FlatNode {
  loc: Location
  depth: number
  hasChildren: boolean
}

function flattenTree(tree: Map<string | null, Location[]>, parentId: string | null, depth: number, expanded: Set<string>): FlatNode[] {
  const children = [...(tree.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const result: FlatNode[] = []
  for (const loc of children) {
    const hasChildren = (tree.get(loc.id) ?? []).length > 0
    result.push({ loc, depth, hasChildren })
    if (hasChildren && expanded.has(loc.id)) {
      result.push(...flattenTree(tree, loc.id, depth + 1, expanded))
    }
  }
  return result
}

export default function LocationPicker({ value, onChange, locationName }: Props) {
  const [open, setOpen] = useState(false)
  const [locations, setLocations] = useState<Location[] | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLocations().then(setLocations)
  }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreate(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectedName = value
    ? locationName ?? locations?.find(l => l.id === value)?.name ?? 'Sin ubicación'
    : 'Sin ubicación'

  const tree = locations ? buildTree(locations) : null
  const nodes = tree ? flattenTree(tree, null, 0, expanded) : []

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const newId = await insertLocation(newName.trim())
      if (newId) {
        setLocations(prev => prev ? [...prev, { id: newId, name: newName.trim(), parent_id: null }] : prev)
        onChange(newId)
      }
      setShowCreate(false)
      setNewName('')
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  function handleCancelCreate() {
    setShowCreate(false)
    setNewName('')
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancelCreate()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-xl text-sm cursor-pointer hover:border-slate-300"
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>
          {selectedName}
        </span>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {locations === null ? (
            <div className="px-3 py-2 text-sm text-slate-400">Cargando ubicaciones...</div>
          ) : (
            <>
              {showCreate ? (
                <form onSubmit={handleCreate} className="px-3 py-2 flex gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Nombre de ubicación"
                    className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-3 py-1 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600 disabled:opacity-50"
                  >
                    {creating ? '...' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    aria-label="Cancelar"
                    className="px-2 py-1 text-slate-400 hover:text-slate-600 text-sm"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="w-full px-3 py-2 text-sm text-teal-600 hover:bg-teal-50 text-left"
                >
                  + Nueva ubicación
                </button>
              )}

              <div className="border-b border-slate-100" />

              <div
                onClick={() => { onChange(null); setOpen(false) }}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  value === null
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-slate-700 hover:bg-teal-50'
                }`}
              >
                Sin ubicación
              </div>

              {nodes.map(({ loc, depth, hasChildren }) => (
                <div
                  key={loc.id}
                  onClick={() => { onChange(loc.id); setOpen(false) }}
                  className={`flex items-center text-sm cursor-pointer ${
                    value === loc.id
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-slate-700 hover:bg-teal-50'
                  }`}
                  style={{ paddingLeft: depth * 16 + 12 + 'px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px' }}
                >
                  {hasChildren ? (
                    <span
                      onClick={(e) => toggleExpand(loc.id, e)}
                      className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-slate-400"
                    >
                      {expanded.has(loc.id) ? '▾' : '▸'}
                    </span>
                  ) : (
                    <span className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{loc.name}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
