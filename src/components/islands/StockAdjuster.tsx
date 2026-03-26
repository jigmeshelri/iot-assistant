import { useState } from 'react'
import { updateStockQuantity } from '../../lib/supabase'

interface Props {
  stockId: string
  initialQuantity: number
}

export default function StockAdjuster({ stockId, initialQuantity }: Props) {
  const [quantity, setQuantity] = useState(initialQuantity)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function update(newQty: number) {
    if (newQty < 0) return
    const previousQty = quantity
    setQuantity(newQty)
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const errorMessage = await updateStockQuantity(stockId, newQty)
      if (errorMessage) {
        setQuantity(previousQty)
        setError(errorMessage)
        setTimeout(() => setError(null), 3000)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Cantidad en stock</span>
        {saving && <span className="text-xs text-slate-400">Guardando...</span>}
        {saved && <span className="text-xs text-teal-600">✓ Guardado</span>}
        {error && <span className="text-xs text-red-600">Error: {error}</span>}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => update(quantity - 1)}
          disabled={quantity <= 0}
          className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors text-xl"
        >
          −
        </button>
        <span className="text-3xl font-bold text-slate-900 min-w-[3ch] text-center">{quantity}</span>
        <button
          onClick={() => update(quantity + 1)}
          className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors text-xl"
        >
          +
        </button>
      </div>
    </div>
  )
}
