import { useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'
import ConnectivityEditor from './ConnectivityEditor'
import SpecsEditor from './SpecsEditor'
import LocationPicker from './LocationPicker'

interface Props {
  stockId: string
  componentId: string
  name: string
  sku: string
  category: string
  platformFamily: string | null
  imageUrl: string | null
  connectivityCaps: Record<string, boolean>
  technicalSpecs: Record<string, unknown>
  datasheetUrl: string | null
  quantity: number
  notes: string | null
  locationId: string | null
  locationName: string | null
  locationQrCode: string | null
}

const CATEGORIES = ['Microcontrolador','Sensor','Alimentación','Actuador','Módulo','Pasivo'] as const
const PLATFORMS = ['ESP32','ESP8266','RP2040','STM32','AVR','nRF52','SAMD','Other'] as const

const categoryColors: Record<string, { bg: string; icon: string }> = {
  'Microcontrolador': { bg: 'bg-brand-50',  icon: 'text-brand-400'  },
  'Sensor':           { bg: 'bg-amber-50',  icon: 'text-amber-400'  },
  'Actuador':         { bg: 'bg-violet-50', icon: 'text-violet-400' },
  'Alimentación':     { bg: 'bg-green-50',  icon: 'text-green-400'  },
  'Módulo':           { bg: 'bg-violet-50', icon: 'text-violet-400' },
  'Pasivo':           { bg: 'bg-slate-100', icon: 'text-slate-400'  },
}

const capBadgeColors: Record<string, string> = {
  wifi:     'bg-sky-50 text-sky-700 border-sky-200',
  ble:      'bg-blue-50 text-blue-700 border-blue-200',
  lora:     'bg-purple-50 text-purple-700 border-purple-200',
  zigbee:   'bg-teal-50 text-teal-700 border-teal-200',
  thread:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  ethernet: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export default function InventoryDetail({
  stockId,
  componentId,
  name,
  sku,
  category,
  platformFamily,
  imageUrl,
  connectivityCaps,
  technicalSpecs,
  datasheetUrl,
  notes,
  locationId,
  locationName,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editName, setEditName] = useState(name)
  const [editCategory, setEditCategory] = useState(category)
  const [editPlatform, setEditPlatform] = useState(platformFamily ?? '')
  const [editCaps, setEditCaps] = useState<Record<string, boolean>>(connectivityCaps)
  const [editSpecs, setEditSpecs] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(technicalSpecs).map(([k, v]) => [k, String(v)]))
  )
  const [editLocationId, setEditLocationId] = useState<string | null>(locationId)
  const [editDatasheet, setEditDatasheet] = useState(datasheetUrl ?? '')
  const [editNotes, setEditNotes] = useState(notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const colors = categoryColors[category] ?? { bg: 'bg-slate-100', icon: 'text-slate-400' }
  const activeCaps = Object.entries(connectivityCaps).filter(([, v]) => Boolean(v))
  const specEntries = Object.entries(technicalSpecs)

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const supabase = createSupabaseBrowserClient()

      const { error: compErr } = await supabase
        .from('components')
        .update({
          name: editName,
          category: editCategory,
          platform_family: editPlatform || null,
          connectivity_caps: editCaps,
          technical_specs: editSpecs,
          datasheet_url: editDatasheet || null,
        })
        .eq('id', componentId)
      if (compErr) throw compErr

      const { error: stockErr } = await supabase
        .from('stock')
        .update({
          location_id: editLocationId,
          notes: editNotes || null,
        })
        .eq('id', stockId)
      if (stockErr) throw stockErr

      window.location.reload()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este componente de tu inventario? El componente seguirá en el catálogo.')) return
    setDeleting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.from('stock').delete().eq('id', stockId)
      window.location.href = '/inventory'
    } catch {
      setDeleting(false)
      setError('Error al eliminar')
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Editar componente</h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
            <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Plataforma</label>
            <select value={editPlatform} onChange={e => setEditPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">-- Sin especificar --</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <ConnectivityEditor value={editCaps} onChange={setEditCaps} />
          <SpecsEditor value={editSpecs} onChange={setEditSpecs} />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación</label>
            <LocationPicker value={editLocationId} onChange={setEditLocationId} locationName={locationName ?? undefined} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Datasheet URL</label>
            <input value={editDatasheet} onChange={e => setEditDatasheet(e.target.value)} type="url" placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          {saveError && <p className="text-xs text-red-500">{saveError}</p>}

          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className={`w-20 h-20 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-16 h-16 object-contain rounded-lg" />
            ) : (
              <svg className={`w-10 h-10 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-mono mb-1">{sku}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                  {category}
                </span>
              )}
              {platformFamily && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {platformFamily}
                </span>
              )}
            </div>
            {activeCaps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeCaps.map(([cap]) => {
                  const cls = capBadgeColors[cap] ?? 'bg-slate-50 text-slate-700 border-slate-200'
                  return (
                    <div key={cap} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${cls}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                      <span className="uppercase tracking-wide font-semibold">{cap}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {locationName && (
              <p className="text-xs text-slate-500 mt-2">
                {locationId ? (
                  <a href={`/locations/${locationId}`} className="hover:text-brand-600 transition-colors">
                    📍 {locationName}
                  </a>
                ) : (
                  <>📍 {locationName}</>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {specEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Especificaciones</h3>
          <div className="space-y-2">
            {specEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-xs text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-xs font-medium text-slate-800 font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {datasheetUrl && (
        <a
          href={datasheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-brand-200 hover:shadow-md transition-all group mb-4"
        >
          <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-brand-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">Datasheet</p>
            <p className="text-xs text-slate-400 truncate">{datasheetUrl}</p>
          </div>
          <svg className="w-4 h-4 text-slate-300 group-hover:text-brand-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center mb-2">{error}</p>
      )}

      <button
        onClick={() => setEditing(true)}
        className="w-full py-3 bg-brand-600 text-white rounded-2xl text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        Editar componente
      </button>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full py-3 border border-red-200 text-red-600 rounded-2xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 mt-4"
      >
        {deleting ? 'Eliminando...' : 'Eliminar del inventario'}
      </button>
    </div>
  )
}
