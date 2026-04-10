import { CATEGORIES, PLATFORMS } from '../../lib/constants'
import { useComponentForm, type ComponentFormPrefill } from './hooks/useComponentForm'
import ConnectivityEditor from './ConnectivityEditor'
import SpecsEditor from './SpecsEditor'
import LocationPicker from './LocationPicker'

interface ComponentFormProps {
  prefill?: ComponentFormPrefill
  imageFile?: File | null
}

export default function ComponentForm({ prefill, imageFile }: ComponentFormProps) {
  const form = useComponentForm({ prefill, imageFile })
  const { fields } = form

  if (form.success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-emerald-700 font-medium">¡Componente añadido!</p>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">Datos del componente</h2>

      <div>
        <label htmlFor="sku" className="block text-xs font-medium text-slate-600 mb-0.5">Código interno</label>
        <p className="text-xs text-slate-400 mb-1">Auto-generado si se deja vacío</p>
        <input
          id="sku"
          value={fields.sku}
          onChange={e => { form.setSku(e.target.value); form.setSkuConflict('') }}
          placeholder={fields.skuPlaceholder}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        {fields.skuConflict && (
          <p className="text-xs text-amber-600 mt-1">{fields.skuConflict}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
        <input value={fields.name} onChange={e => form.setName(e.target.value)} required placeholder="ESP32-C6 XIAO"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Categoría *</label>
        <select value={fields.category} onChange={e => form.setCategory(e.target.value)} required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Plataforma</label>
        <select value={fields.platform} onChange={e => form.setPlatform(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">-- Sin especificar --</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <ConnectivityEditor value={fields.caps} onChange={form.setCaps} />

      <SpecsEditor value={fields.specs} onChange={form.setSpecs} />

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Datasheet URL</label>
        <input
          value={fields.datasheetUrl}
          onChange={e => form.setDatasheetUrl(e.target.value)}
          placeholder="https://..."
          type="url"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad *</label>
        <input type="number" min={1} value={fields.quantity} onChange={e => form.setQuantity(+e.target.value)} required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación</label>
        <LocationPicker value={fields.locationId} onChange={form.setLocationId} />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
        <textarea value={fields.notes} onChange={e => form.setNotes(e.target.value)} rows={2} placeholder="Observaciones opcionales..."
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
      </div>

      {form.error && <p className="text-xs text-red-500">{form.error}</p>}

      <button type="submit" disabled={form.loading}
        className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium text-sm hover:bg-teal-600 active:scale-95 transition-all disabled:opacity-50">
        {form.loading ? 'Guardando...' : 'Guardar componente'}
      </button>
    </form>
  )
}
