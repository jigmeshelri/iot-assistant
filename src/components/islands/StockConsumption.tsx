import { useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

interface BOMItem {
  id: string
  component_name: string
  quantity_required: number
  component_id?: string
}

interface StockMatch {
  stockId: string
  componentName: string
  available: number
}

interface ConsumedItem {
  id: string
  stock_id: string
  quantity_consumed: number
}

interface Props {
  projectId: string
  bomItems: BOMItem[]
  userStock: Array<{
    id: string
    quantity: number
    component: { id: string; name: string } | null
  }>
  consumed: ConsumedItem[]
}

type RowStatus =
  | { kind: 'used'; consumed: ConsumedItem }
  | { kind: 'available'; match: StockMatch }
  | { kind: 'partial'; match: StockMatch }
  | { kind: 'missing' }

export default function StockConsumption({ projectId, bomItems, userStock, consumed }: Props) {
  const [busy, setBusy] = useState<string | null>(null)

  const stockByName = useMemo(() => {
    const map = new Map<string, StockMatch>()
    for (const s of userStock) {
      if (!s.component) continue
      const key = s.component.name.toLowerCase()
      const existing = map.get(key)
      if (!existing || s.quantity > existing.available) {
        map.set(key, { stockId: s.id, componentName: s.component.name, available: s.quantity })
      }
    }
    return map
  }, [userStock])

  const consumedByStock = useMemo(() => {
    const map = new Map<string, ConsumedItem>()
    for (const c of consumed) {
      map.set(c.stock_id, c)
    }
    return map
  }, [consumed])

  function getStatus(bom: BOMItem): RowStatus {
    const match = stockByName.get(bom.component_name.toLowerCase())
    if (!match) return { kind: 'missing' }

    const c = consumedByStock.get(match.stockId)
    if (c && c.quantity_consumed >= bom.quantity_required) {
      return { kind: 'used', consumed: c }
    }

    if (match.available >= bom.quantity_required) {
      return { kind: 'available', match }
    }

    if (match.available > 0) {
      return { kind: 'partial', match }
    }

    return { kind: 'missing' }
  }

  const rows = bomItems.map(b => ({ bom: b, status: getStatus(b) }))
  const usedCount = rows.filter(r => r.status.kind === 'used').length

  async function consumeItem(bomItem: BOMItem, match: StockMatch) {
    setBusy(bomItem.id)
    try {
      const qty = Math.min(bomItem.quantity_required, match.available)
      const supabase = createSupabaseBrowserClient()
      await supabase.from('project_consumed_stock').insert({
        project_id: projectId,
        stock_id: match.stockId,
        quantity_consumed: qty,
      })
      await supabase
        .from('stock')
        .update({ quantity: match.available - qty })
        .eq('id', match.stockId)
      window.location.reload()
    } finally {
      setBusy(null)
    }
  }

  async function undoConsumption(consumedItem: ConsumedItem) {
    setBusy(consumedItem.id)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: stock } = await supabase
        .from('stock')
        .select('quantity')
        .eq('id', consumedItem.stock_id)
        .single()
      if (stock) {
        await supabase
          .from('stock')
          .update({ quantity: stock.quantity + consumedItem.quantity_consumed })
          .eq('id', consumedItem.stock_id)
      }
      await supabase.from('project_consumed_stock').delete().eq('id', consumedItem.id)
      window.location.reload()
    } finally {
      setBusy(null)
    }
  }

  if (bomItems.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Consumo de Stock</h2>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>{usedCount} de {bomItems.length} componentes utilizados</span>
          <span>{Math.round((usedCount / bomItems.length) * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${(usedCount / bomItems.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Rows */}
      <div>
        {rows.map(({ bom, status }) => (
          <div key={bom.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-700">{bom.component_name}</span>
              <span className="text-xs text-slate-400 ml-1">&times;{bom.quantity_required} requerido</span>
            </div>

            {status.kind === 'used' && (
              <div className="flex items-center gap-2">
                <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-xs">
                  Usado
                </span>
                <button
                  className="text-xs text-slate-400 hover:text-slate-600"
                  disabled={busy !== null}
                  onClick={() => undoConsumption(status.consumed)}
                >
                  &crarr; Deshacer
                </button>
              </div>
            )}

            {status.kind === 'available' && (
              <button
                className="bg-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50"
                disabled={busy !== null}
                onClick={() => consumeItem(bom, status.match)}
              >
                Usar
              </button>
            )}

            {status.kind === 'partial' && (
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-xs">
                  Parcial
                </span>
                <button
                  className="bg-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => consumeItem(bom, status.match)}
                >
                  Usar {status.match.available} disponibles
                </button>
              </div>
            )}

            {status.kind === 'missing' && (
              <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full text-xs">
                Falta
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
