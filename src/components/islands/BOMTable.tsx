interface BOMItem {
  id?: string
  component_name: string
  quantity_required: number
  notes?: string | null
  component?: { name?: string; sku?: string } | null
}

type BOMState = 'available' | 'partial' | 'missing' | 'incompatible'

const STATE_BADGES: Record<BOMState, { label: string; class: string }> = {
  available:    { label: 'Disponible',  class: 'bg-emerald-100 text-emerald-700' },
  partial:      { label: 'Parcial',     class: 'bg-amber-100 text-amber-700' },
  missing:      { label: 'Faltante',    class: 'bg-red-100 text-red-700' },
  incompatible: { label: 'Incompatible',class: 'bg-orange-100 text-orange-700' },
}

interface Props {
  items: (BOMItem & { state?: BOMState; available_quantity?: number })[]
}

export default function BOMTable({ items }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="divide-y divide-slate-50">
        {items.map((item, i) => {
          const state = item.state
          const badge = state ? STATE_BADGES[state] : null
          return (
            <div key={item.id ?? i} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {item.component?.name ?? item.component_name}
                </div>
                {item.notes && <div className="text-xs text-slate-400 mt-0.5">{item.notes}</div>}
              </div>
              <div className="text-xs text-slate-500 flex-shrink-0">×{item.quantity_required}</div>
              {badge && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${badge.class}`}>
                  {badge.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
