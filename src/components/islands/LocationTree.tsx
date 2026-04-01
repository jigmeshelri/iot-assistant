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

  return (
    <div style={{ paddingLeft: depth * 16 + 'px' }}>
      <a
        href={`/locations/${loc.id}`}
        className="flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-teal-50 group transition-colors"
      >
        {children.length > 0 ? (
          <button
            onClick={e => { e.preventDefault(); setExpanded(!expanded) }}
            className="w-5 h-5 flex items-center justify-center text-slate-400"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <div className="w-5 h-5 flex items-center justify-center text-slate-300">•</div>
        )}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setShowNewChild(true) }}
          className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-teal-500 hover:bg-teal-50 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Añadir sub-ubicación"
        >+</button>
        <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        <span className="text-sm font-medium text-slate-800 flex-1">{loc.name}</span>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-slate-400 ml-auto mr-2">{count} pzas</span>
        )}
        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
      {showNewChild && (
        <form onSubmit={createChild} className="flex gap-2 py-2" style={{ paddingLeft: (depth + 1) * 16 + 'px' }}>
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {roots.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-400 mb-4">No tenés ubicaciones creadas todavía.</p>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 transition-colors"
            >
              Crear primera ubicación
            </button>
          </div>
        ) : (
          <div className="p-2">
            {roots.map(loc => <TreeNode key={loc.id} loc={loc} tree={tree} stockCounts={stockCounts} />)}
          </div>
        )}
      </div>

      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-colors"
        >
          + Nueva ubicación raíz
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
    </div>
  )
}
