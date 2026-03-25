import { useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

interface BOMItem {
  id?: string
  component_id?: string
  component_name: string
  quantity_required: number
  state?: BOMState
  available_quantity?: number
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
  items: BOMItem[]
  projectId?: string
  editable?: boolean
}

export default function BOMTable({ items, projectId, editable = false }: Props) {
  const [bomItems, setBomItems] = useState<BOMItem[]>(items)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState(1)
  const editInputRef = useRef<HTMLInputElement>(null)

  async function handleAdd() {
    if (!newName.trim() || !projectId) return
    const supabase = createSupabaseBrowserClient()
    const row = { project_id: projectId, component_name: newName.trim(), quantity_required: newQty }
    const { data, error } = await supabase.from('project_bom').insert(row).select().single()
    if (!error && data) {
      setBomItems(prev => [...prev, data])
    }
    setNewName('')
    setNewQty(1)
    setAdding(false)
  }

  async function handleUpdateQty(item: BOMItem) {
    if (!item.id || editQty === item.quantity_required) {
      setEditingId(null)
      return
    }
    const supabase = createSupabaseBrowserClient()
    setBomItems(prev => prev.map(b => b.id === item.id ? { ...b, quantity_required: editQty } : b))
    setEditingId(null)
    await supabase.from('project_bom').update({ quantity_required: editQty }).eq('id', item.id)
  }

  async function handleDelete(item: BOMItem) {
    if (!item.id || !window.confirm('¿Eliminar este componente del BOM?')) return
    const supabase = createSupabaseBrowserClient()
    setBomItems(prev => prev.filter(b => b.id !== item.id))
    await supabase.from('project_bom').delete().eq('id', item.id)
  }

  function startEditing(item: BOMItem) {
    if (!editable || !item.id) return
    setEditingId(item.id)
    setEditQty(item.quantity_required)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="divide-y divide-slate-50">
        {bomItems.map((item, i) => {
          const state = item.state
          const badge = state ? STATE_BADGES[state] : null
          const isEditing = editingId === item.id
          return (
            <div key={item.id ?? i} className={`flex items-center gap-3 p-3 ${editable ? 'group' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {item.component?.name ?? item.component_name}
                </div>
                {item.notes && <div className="text-xs text-slate-400 mt-0.5">{item.notes}</div>}
              </div>

              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="number"
                  min={1}
                  className="w-14 text-xs text-center border border-slate-300 rounded px-1 py-0.5"
                  value={editQty}
                  onChange={e => setEditQty(Number(e.target.value) || 1)}
                  onBlur={() => handleUpdateQty(item)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUpdateQty(item) }}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className={`text-xs text-slate-500 flex-shrink-0 ${editable ? 'cursor-pointer hover:text-slate-800 hover:bg-slate-100 rounded px-1.5 py-0.5' : ''}`}
                  onClick={() => startEditing(item)}
                  disabled={!editable}
                >
                  ×{item.quantity_required}
                </button>
              )}

              {badge && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${badge.class}`}>
                  {badge.label}
                </span>
              )}

              {editable && item.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-sm leading-none"
                  aria-label="Eliminar"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}

        {editable && adding && (
          <div className="flex items-center gap-2 p-3">
            <input
              type="text"
              placeholder="Nombre del componente"
              className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              autoFocus
            />
            <input
              type="number"
              min={1}
              className="w-14 text-sm text-center border border-slate-300 rounded-lg px-1 py-1"
              value={newQty}
              onChange={e => setNewQty(Number(e.target.value) || 1)}
            />
            <button
              type="button"
              onClick={handleAdd}
              className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewName(''); setNewQty(1) }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {editable && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full text-center text-xs font-medium text-indigo-600 hover:bg-indigo-50 py-2.5 transition-colors"
        >
          + Añadir componente
        </button>
      )}
    </div>
  )
}
