import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

interface Location {
  id: string
  name: string
  parent_id: string | null
}

interface Props {
  value: string | null
  onChange: (locationId: string | null) => void
  locationName?: string
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

interface FlatNode {
  loc: Location
  depth: number
  hasChildren: boolean
}

function flattenTree(tree: Map<string | null, Location[]>, parentId: string | null, depth: number, expanded: Set<string>): FlatNode[] {
  const children = tree.get(parentId) ?? []
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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.from('locations').select('id,name,parent_id').order('name').then(({ data }) => {
      setLocations(data ?? [])
    })
  }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
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
          ) : locations.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-400 text-center">
              Sin ubicaciones creadas.{' '}
              <a href="/locations" className="text-teal-600 hover:underline">Crear una</a>
            </div>
          ) : (
            <>
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
