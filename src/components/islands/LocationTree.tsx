import { useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

interface Location {
  id: string
  name: string
  parent_id: string | null
  qr_code: string
}

interface Props {
  locations: Location[]
}

function buildTree(locations: Location[]) {
  const map = new Map<string | null, Location[]>()
  for (const loc of locations) {
    const parentKey = loc.parent_id ?? null
    if (!map.has(parentKey)) map.set(parentKey, [])
    map.get(parentKey)!.push(loc)
  }
  return map
}

function TreeNode({ loc, tree, depth = 0 }: { loc: Location; tree: Map<string | null, Location[]>; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const children = tree.get(loc.id) ?? []

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
        <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        <span className="text-sm font-medium text-slate-800 flex-1">{loc.name}</span>
        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
      {expanded && children.map(child => (
        <TreeNode key={child.id} loc={child} tree={tree} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function LocationTree({ locations }: Props) {
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
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await supabase.from('locations').insert({ user_id: user.id, name: newName.trim() })
      window.location.reload()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {roots.length === 0 ? (
          <p className="text-sm text-slate-400 p-4 text-center">Sin ubicaciones raíz</p>
        ) : (
          <div className="p-2">
            {roots.map(loc => <TreeNode key={loc.id} loc={loc} tree={tree} />)}
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
