import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'
import { categoryPrefix, nextAvailableSku } from '../../lib/skuUtils'

const CATEGORIES = ['Microcontrolador','Sensor','Alimentación','Actuador','Módulo','Pasivo'] as const
const PLATFORMS = ['ESP32','ESP8266','RP2040','STM32','AVR','nRF52','SAMD','Other'] as const

interface ComponentFormProps {
  prefill?: {
    sku?:              string
    name?:             string
    category?:         string
    platform_family?:  string
    technical_specs?:  Record<string, unknown>
    datasheet_url?:    string
    connectivity_caps?: Record<string, boolean>
  }
}

export default function ComponentForm({ prefill }: ComponentFormProps) {
  const [name, setName] = useState(prefill?.name ?? '')
  const [sku, setSku] = useState(prefill?.sku ?? '')
  const [skuPlaceholder, setSkuPlaceholder] = useState('MCU-001')
  const [skuConflict, setSkuConflict] = useState('')
  const [category, setCategory] = useState(prefill?.category ?? CATEGORIES[0])
  const [platform, setPlatform] = useState(prefill?.platform_family ?? '')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (prefill?.name)            setName(prefill.name)
    if (prefill?.category)        setCategory(prefill.category)
    if (prefill?.platform_family) setPlatform(prefill.platform_family)
    if (prefill?.sku)             setSku(prefill.sku)
  }, [prefill])

  useEffect(() => {
    const prefix = categoryPrefix(category)
    const supabase = createSupabaseBrowserClient()
    nextAvailableSku(prefix, supabase).then(setSkuPlaceholder).catch(() => {})
  }, [category])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSkuConflict('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const effectiveSku = sku.trim() || skuPlaceholder

      // Upsert component to shared catalog
      const { data: component, error: compErr } = await supabase
        .from('components')
        .upsert({ sku: effectiveSku, name, category, platform_family: platform || null, technical_specs: prefill?.technical_specs ?? {}, datasheet_url: prefill?.datasheet_url ?? null, connectivity_caps: prefill?.connectivity_caps ?? {} }, { onConflict: 'sku' })
        .select()
        .single()
      if (compErr) throw compErr

      // Add to user stock
      const { error: stockErr } = await supabase
        .from('stock')
        .insert({ user_id: user.id, component_id: component.id, quantity, notes: notes || null })
      if (stockErr) throw stockErr

      setSuccess(true)
      setTimeout(() => { window.location.href = '/inventory' }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error desconocido'
      if (msg.includes('23505') || msg.includes('duplicate key')) {
        nextAvailableSku(categoryPrefix(category), createSupabaseBrowserClient())
          .then(suggestion => setSkuConflict(`Este código ya está en uso, sugerencia: ${suggestion}`))
          .catch(() => {})
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
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

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad *</label>
        <input type="number" min={1} value={quantity} onChange={e => setQuantity(+e.target.value)} required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
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
