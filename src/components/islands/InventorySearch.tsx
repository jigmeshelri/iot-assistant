import { useState, useMemo } from 'react'

interface StockItem {
  id: string
  quantity: number
  component: {
    name: string
    sku: string
    category: string
    image_url: string | null
    platform_family: string | null
    connectivity_caps: Record<string, boolean>
  } | null
  location: {
    name: string
    parent: { name: string } | null
  } | null
}

interface Props {
  items: StockItem[]
  desktop?: boolean
}

const categories = ['Todos', 'Microcontrolador', 'Sensor', 'Módulo', 'Pasivo', 'Alimentación', 'Actuador'] as const

const categoryColors: Record<string, { bg: string; icon: string }> = {
  'Microcontrolador': { bg: 'bg-brand-50',  icon: 'text-brand-600'  },
  'Sensor':           { bg: 'bg-amber-50',  icon: 'text-amber-500'  },
  'Actuador':         { bg: 'bg-violet-50', icon: 'text-violet-500' },
  'Alimentación':     { bg: 'bg-green-50',  icon: 'text-green-500'  },
  'Módulo':           { bg: 'bg-violet-50', icon: 'text-violet-500' },
  'Pasivo':           { bg: 'bg-slate-100', icon: 'text-slate-500'  },
}

const categoryTagColors: Record<string, string> = {
  'Microcontrolador': 'bg-brand-50 text-brand-700',
  'Sensor':           'bg-amber-50 text-amber-700',
  'Actuador':         'bg-violet-50 text-violet-700',
  'Alimentación':     'bg-green-50 text-green-700',
  'Módulo':           'bg-violet-50 text-violet-700',
  'Pasivo':           'bg-slate-100 text-slate-600',
}

function qtyColor(qty: number) {
  return qty > 1 ? 'text-slate-900' : 'text-amber-500'
}

function getLocStr(item: StockItem) {
  const locName = item.location?.name
  const parentName = item.location?.parent?.name
  return locName ? (parentName ? `${parentName} → ${locName}` : locName) : null
}

function ChipIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>
    </svg>
  )
}

function SmallChipIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
    </svg>
  )
}

export default function InventorySearch({ items, desktop = false }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return items.filter(item => {
      if (activeCategory) {
        const cat = item.component?.category ?? ''
        if (cat !== activeCategory) return false
      }
      if (q) {
        const name = (item.component?.name ?? '').toLowerCase()
        const sku = (item.component?.sku ?? '').toLowerCase()
        const loc = getLocStr(item)?.toLowerCase() ?? ''
        if (!name.includes(q) && !sku.includes(q) && !loc.includes(q)) return false
      }
      return true
    })
  }, [items, query, activeCategory])

  if (desktop) {
    return <DesktopView items={items} filtered={filtered} query={query} setQuery={setQuery} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
  }

  return <MobileView items={items} filtered={filtered} query={query} setQuery={setQuery} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
}

interface ViewProps {
  items: StockItem[]
  filtered: StockItem[]
  query: string
  setQuery: (q: string) => void
  activeCategory: string | null
  setActiveCategory: (c: string | null) => void
}

function CategoryChips({ activeCategory, setActiveCategory, className }: { activeCategory: string | null; setActiveCategory: (c: string | null) => void; className?: string }) {
  return (
    <div className={className}>
      {categories.map(cat => {
        const isActive = cat === 'Todos' ? activeCategory === null : activeCategory === cat
        return (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat === 'Todos' ? null : cat)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 cursor-pointer transition-colors ${
              isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}

function MobileView({ items, filtered, query, setQuery, activeCategory, setActiveCategory }: ViewProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white min-h-full flex flex-col items-center justify-center px-8 py-16 text-center">
        <p className="text-slate-500 text-sm mb-4">No tenés componentes en tu inventario todavía.</p>
        <a
          href="/inventory/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Añadir primer componente
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-full">
      <div className="px-5 pt-3 pb-3 bg-white sticky top-0 z-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Inventario</h2>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar componentes..."
              className="bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none w-full"
            />
          </div>
          <a
            href="/inventory/new"
            className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-brand-700 transition-colors"
            aria-label="Añadir componente"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </a>
        </div>

        <CategoryChips
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">Sin resultados para &quot;{query}&quot;</div>
      ) : (
        <div className="px-5 flex flex-col gap-2.5 pb-4 pt-3">
          {filtered.map(item => {
            const cat = item.component?.category ?? ''
            const colors = categoryColors[cat] ?? { bg: 'bg-slate-100', icon: 'text-slate-500' }
            const locStr = getLocStr(item)
            const qty = item.quantity ?? 0
            const caps = item.component?.connectivity_caps ?? {}
            const activeCaps = Object.entries(caps).filter(([, v]) => v).map(([k]) => k)

            return (
              <a key={item.id} href={`/inventory/${item.id}`} className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {item.component?.image_url ? (
                    <img src={item.component.image_url} alt={item.component?.name} className="w-10 h-10 object-contain rounded-lg" />
                  ) : (
                    <span className={colors.icon}><ChipIcon /></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.component?.name ?? 'Componente desconocido'}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {cat}
                    {item.component?.sku ? ` · ${item.component.sku}` : ''}
                  </p>
                  {activeCaps.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {activeCaps.slice(0, 3).map(cap => (
                        <span key={cap} className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">{cap}</span>
                      ))}
                      {activeCaps.length > 3 && <span className="text-[10px] text-slate-400">+{activeCaps.length - 3}</span>}
                    </div>
                  )}
                  {locStr && (
                    <p className="text-xs text-slate-400 mt-0.5">📦 {locStr}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg font-bold ${qtyColor(qty)}`}>{qty}</div>
                  <div className="text-xs text-slate-400">unid.</div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DesktopView({ items, filtered, query, setQuery, activeCategory, setActiveCategory }: ViewProps) {
  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {categories.map(cat => {
          const isActive = cat === 'Todos' ? activeCategory === null : activeCategory === cat
          const label = cat === 'Todos' ? `Todos (${items.length})` : cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat === 'Todos' ? null : cat)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {label}
            </button>
          )
        })}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} componentes</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">Sin resultados para &quot;{query}&quot;</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-slate-50 text-left px-4 py-2.5 border-b border-slate-100 w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100">Componente</th>
                <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100 whitespace-nowrap">Categoría</th>
                <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100 whitespace-nowrap">Plataforma</th>
                <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100 whitespace-nowrap">Conectividad</th>
                <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100">Ubicación</th>
                <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100">Stock</th>
                <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const cat = item.component?.category ?? ''
                const colors = categoryColors[cat] ?? { bg: 'bg-slate-100', icon: 'text-slate-500' }
                const tagClass = categoryTagColors[cat] ?? 'bg-slate-100 text-slate-600'
                const locStr = getLocStr(item) ?? null
                const qty = item.quantity ?? 0
                const platform = item.component?.platform_family ?? ''
                const caps = item.component?.connectivity_caps ?? {}
                const activeCaps = Object.entries(caps).filter(([, v]) => v).map(([k]) => k)

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <span className={colors.icon}><SmallChipIcon /></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.component?.name ?? 'Desconocido'}</p>
                          <p className="text-xs text-slate-400">{item.component?.sku ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      {cat ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tagClass}`}>{cat}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      {platform ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{platform}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      {activeCaps.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {activeCaps.map(cap => (
                            <span key={cap} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">{cap}</span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-xs text-slate-600">
                      {locStr ? `📦 ${locStr}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <span className={`text-sm font-bold ${qtyColor(qty)}`}>{qty}</span>
                      <span className="text-xs text-slate-400 ml-1">unid.</span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <div className="flex gap-1">
                        <a href={`/inventory/${item.id}`} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Editar">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </a>
                        <button className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 flex items-center justify-center transition-colors" title="Eliminar">
                          <svg className="w-3.5 h-3.5 text-slate-500 hover:text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
