import { useState } from 'react'
import { buildTree, type Location } from '../../lib/locations'
import LocationCreateForm from './LocationCreateForm'

interface Props {
  locations: Location[]
  stockCounts?: Record<string, number>
}

function TreeNode({
  loc,
  tree,
  stockCounts,
  depth = 0,
  onCreated,
}: {
  loc: Location
  tree: Map<string | null, Location[]>
  stockCounts?: Record<string, number>
  depth?: number
  onCreated: (loc: Location) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showNewChild, setShowNewChild] = useState(false)
  const children = tree.get(loc.id) ?? []
  const count = stockCounts?.[loc.id]

  const childCount = children.length
  const subtitle = childCount > 0 ? `${childCount} sub-ubicación${childCount === 1 ? '' : 'es'}` : 'Ubicación'

  return (
    <div className="flex flex-col gap-2.5" style={{ paddingLeft: depth * 16 + 'px' }}>
      <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
        <a
          href={`/locations/${loc.id}`}
          className="flex items-center gap-3 flex-1 min-w-0"
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
        </a>
        <div className="flex items-center gap-2 flex-shrink-0">
          {count !== undefined && count > 0 && (
            <span className="text-sm font-bold text-amber-500">{count} pzas</span>
          )}
          <button
            onClick={() => setShowNewChild(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-teal-500 hover:bg-teal-50 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Añadir sub-ubicación"
          >+</button>
          {childCount > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600"
              aria-label={expanded ? 'Colapsar' : 'Expandir'}
            >
              {expanded ? '▾' : '▸'}
            </button>
          )}
        </div>
      </div>
      {showNewChild && (
        <div style={{ paddingLeft: (depth + 1) * 16 + 'px' }}>
          <LocationCreateForm
            parentId={loc.id}
            variant="child"
            placeholder="Nombre sub-ubicación"
            onCreated={(newLoc) => {
              onCreated(newLoc)
              setShowNewChild(false)
            }}
            onCancel={() => setShowNewChild(false)}
          />
        </div>
      )}
      {expanded && children.map(child => (
        <TreeNode key={child.id} loc={child} tree={tree} stockCounts={stockCounts} depth={depth + 1} onCreated={onCreated} />
      ))}
    </div>
  )
}

export default function LocationTree({ locations: initialLocations, stockCounts }: Props) {
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const [showNew, setShowNew] = useState(false)

  const tree = buildTree(locations)
  const roots = tree.get(null) ?? []

  function handleCreated(loc: Location) {
    setLocations(prev => [...prev, loc])
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
        <LocationCreateForm
          variant="root"
          onCreated={(loc) => {
            handleCreated(loc)
            setShowNew(false)
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {roots.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {roots.map(loc => (
            <TreeNode key={loc.id} loc={loc} tree={tree} stockCounts={stockCounts} onCreated={handleCreated} />
          ))}
        </div>
      )}
    </div>
  )
}
