import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'
import { categoryPrefix, nextAvailableSku } from '../../lib/skuUtils'
import { CATEGORIES, PLATFORMS } from '../../lib/constants'
import { addComponentToStock } from '../../lib/inventory'
import ConnectivityEditor from './ConnectivityEditor'
import SpecsEditor from './SpecsEditor'
import LocationPicker from './LocationPicker'

interface ComponentFormProps {
  prefill?: {
    sku?:              string
    name?:             string
    category?:         string
    platform_family?:  string
    technical_specs?:  Record<string, unknown>
    datasheet_url?:    string
    connectivity_caps?: Record<string, boolean>
    location_id?: string
  }
  imageFile?: File | null
}

export default function ComponentForm({ prefill, imageFile }: ComponentFormProps) {
  const [name, setName] = useState(prefill?.name ?? '')
  const [sku, setSku] = useState(prefill?.sku ?? '')
  const [skuPlaceholder, setSkuPlaceholder] = useState('MCU-001')
  const [skuConflict, setSkuConflict] = useState('')
  const [category, setCategory] = useState(prefill?.category ?? CATEGORIES[0])
  const [platform, setPlatform] = useState(prefill?.platform_family ?? '')
  const [quantity, setQuantity] = useState(1)
  const [caps, setCaps] = useState<Record<string, boolean>>(prefill?.connectivity_caps ?? {})
  const [specs, setSpecs] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(prefill?.technical_specs ?? {}).map(([k, v]) => [k, String(v)])
    )
  )
  const [locationId, setLocationId] = useState<string | null>(prefill?.location_id ?? null)
  const [datasheetUrl, setDatasheetUrl] = useState(prefill?.datasheet_url ?? '')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (prefill?.name)            setName(prefill.name)
    if (prefill?.category)        setCategory(prefill.category)
    if (prefill?.platform_family) setPlatform(prefill.platform_family)
    if (prefill?.sku)             setSku(prefill.sku)
    if (prefill?.connectivity_caps) setCaps(prefill.connectivity_caps)
    if (prefill?.technical_specs) setSpecs(
      Object.fromEntries(Object.entries(prefill.technical_specs).map(([k, v]) => [k, String(v)]))
    )
    if (prefill?.datasheet_url)   setDatasheetUrl(prefill.datasheet_url)
    if (prefill?.location_id)     setLocationId(prefill.location_id)
  }, [prefill])

  useEffect(() => {
    const prefix = categoryPrefix(category)
    nextAvailableSku(prefix).then(setSkuPlaceholder).catch(() => {})
  }, [category])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSkuConflict('')
    const effectiveSku = sku.trim() || skuPlaceholder
    const { error: err } = await addComponentToStock({
      sku: effectiveSku,
      name,
      category,
      platform_family: platform || null,
      technical_specs: specs,
      datasheet_url: datasheetUrl || null,
      connectivity_caps: caps,
      quantity,
      notes: notes || null,
      location_id: locationId,
      imageFile: imageFile ?? null,
    })
    setLoading(false)
    if (err) {
      if (err.type === 'sku_conflict') {
        nextAvailableSku(categoryPrefix(category))
          .then(suggestion => setSkuConflict(`Este código ya está en uso, sugerencia: ${suggestion}`))
          .catch(() => {})
      }
      setError(err.message)
      return
    }
    setSuccess(true)
    setTimeout(() => { window.location.href = '/inventory' }, 1200)
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-emerald-700 font-medium">¡Componente añadido!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Datos del componente</h2>

      <div>
        <label htmlFor="sku" className="block text-xs font-medium text-slate-600 mb-0.5">Código interno</label>
        <p className="text-xs text-slate-400 mb-1">Auto-generado si se deja vacío</p>
        <input
          id="sku"
          value={sku}
          onChange={e => { setSku(e.target.value); setSkuConflict('') }}
          placeholder={skuPlaceholder}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        {skuConflict && (
          <p className="text-xs text-amber-600 mt-1">{skuConflict}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="ESP32-C6 XIAO"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Categoría *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Plataforma</label>
        <select value={platform} onChange={e => setPlatform(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">-- Sin especificar --</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <ConnectivityEditor value={caps} onChange={setCaps} />

      <SpecsEditor value={specs} onChange={setSpecs} />

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Datasheet URL</label>
        <input
          value={datasheetUrl}
          onChange={e => setDatasheetUrl(e.target.value)}
          placeholder="https://..."
          type="url"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad *</label>
        <input type="number" min={1} value={quantity} onChange={e => setQuantity(+e.target.value)} required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación</label>
        <LocationPicker value={locationId} onChange={setLocationId} />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones opcionales..."
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium text-sm hover:bg-teal-600 active:scale-95 transition-all disabled:opacity-50">
        {loading ? 'Guardando...' : 'Guardar componente'}
      </button>
    </form>
  )
}
