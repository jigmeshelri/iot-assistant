import { useState } from 'react'
import { insertLocation, buildTree, type Location as BaseLocation } from '../../lib/locations'

interface Location extends BaseLocation {
  qr_code: string
}

interface Props {
  locations: Location[]
  stockCounts?: Record<string, number>
}

function TreeNode({ loc, tree, stockCounts, depth = 0 }: { loc: Location; tree: Map<string | null, Location[]>; stockCounts?: Record<string, number>; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const [showNewChild, setShowNewChild] = useState(false)
  const [newChildName, setNewChildName] = useState('')
  const [creatingChild, setCreatingChild] = useState(false)
  const children = tree.get(loc.id) ?? []
  const count = stockCounts?.[loc.id]

  async function createChild(e: React.FormEvent) {
    e.preventDefault()
    if (!newChildName.trim()) return
    setCreatingChild(true)
    try {
      await insertLocation(newChildName, loc.id)
      window.location.reload()
    } finally {
      setCreatingChild(false)
    }
  }

  const childCount = children.length
  const subtitle = childCount > 0 ? `${childCount} sub-ubicación${childCount === 1 ? '' : 'es'}` : 'Ubicación'

  return (
    <div className="flex flex-col gap-2.5" style={{ paddingLeft: depth * 16 + 'px' }}>
      <a
        href={`/locations/${loc.id}`}
        className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
      >
        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <circle cx="12" cy="11" r="3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{loc.name}</p>
          <p className="text-xs text-slate-400 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {count !== undefined && count > 0 && (
            <span className="text-sm font-bold text-amber-500">{count} pzas</span>
          )}
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setShowNewChild(true) }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-teal-500 hover:bg-teal-50 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Añadir sub-ubicación"
          >+</button>
          {childCount > 0 && (
            <button
              onClick={e => { e.preventDefault(); setExpanded(!expanded) }}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600"
              aria-label={expanded ? 'Colapsar' : 'Expandir'}
            >
              {expanded ? '▾' : '▸'}
            </button>
          )}
        </div>
      </a>
      {showNewChild && (
        <form onSubmit={createChild} className="flex gap-2 py-2 mt-2" style={{ paddingLeft: (depth + 1) * 16 + 'px' }}>
          <input autoFocus value={newChildName} onChange={e => setNewChildName(e.target.value)}
            placeholder="Nombre sub-ubicación"
            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <button type="submit" disabled={creatingChild}
            className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600 disabled:opacity-50">
            {creatingChild ? '...' : 'Crear'}
          </button>
          <button type="button" onClick={() => setShowNewChild(false)}
            className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </form>
      )}
      {expanded && children.map(child => (
        <TreeNode key={child.id} loc={child} tree={tree} stockCounts={stockCounts} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function LocationTree({ locations, stockCounts }: Props) {
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const tree = buildTree(locations)
  const roots = tree.get(null) ?? []

  async function createLocation(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await insertLocation(newName)
      window.location.reload()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-colors"
        >
          + Nueva ubicación
        </button>
      ) : (
        <form onSubmit={createLocation} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre de ubicación"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button type="submit" disabled={creating}
            className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
            {creating ? '...' : 'Crear'}
          </button>
          <button type="button" onClick={() => setShowNew(false)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">
            ✕
          </button>
        </form>
      )}

      {roots.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {roots.map(loc => <TreeNode key={loc.id} loc={loc} tree={tree} stockCounts={stockCounts} />)}
        </div>
      )}
    </div>
  )
}
