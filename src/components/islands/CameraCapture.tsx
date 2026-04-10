import { useState, useRef } from 'react'
import { recognizeComponent } from '../../lib/api'
import { getCurrentSession } from '../../lib/auth'
import { categoryPrefix, nextAvailableSku } from '../../lib/skuUtils'
import { funErrorMessage, logError } from '../../lib/errorLog'
import ComponentForm from './ComponentForm'
import Spinner from './Spinner'

export default function CameraCapture() {
  const [prefill, setPrefill] = useState<Record<string, unknown> | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setError('')
    setPreview(URL.createObjectURL(file))
    setCapturedFile(file)
    try {
      const session = await getCurrentSession()
      if (!session) throw new Error('Not authenticated')
      const result = await recognizeComponent(file, session.access_token)
      const prefix = categoryPrefix(result.category)
      const autoSku = await nextAvailableSku(prefix).catch(() => '')
      setPrefill({ ...result, sku: autoSku })
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err)
      setError(funErrorMessage(raw))
      logError('ai_recognize', err, { filename: file.name, size: file.size })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center cursor-pointer hover:border-teal-400 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-32 h-32 object-contain mx-auto rounded-xl" />
        ) : (
          <>
            <div className="text-4xl mb-2">📸</div>
            <p className="text-sm font-medium text-slate-700">Fotografiar componente</p>
            <p className="text-xs text-slate-400 mt-1">La IA identificará el componente automáticamente</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {loading && (
        <div className="bg-teal-50 rounded-2xl p-4 text-center">
          <Spinner className="w-6 h-6 border-teal-500 mb-2" />
          <p className="text-sm text-teal-700">Reconociendo componente...</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      {prefill && !loading && (
        <div className="bg-teal-50 rounded-2xl p-3 text-xs text-teal-700">
          ✨ Componente identificado: <strong>{String(prefill.name)}</strong>
          {' '}(confianza: {Math.round(Number(prefill.confidence) * 100)}%)
        </div>
      )}

      {prefill && !loading && Number(prefill.confidence) < 0.7 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-700">
          ⚠️ La IA no está segura de esta identificación. Revisá los datos antes de guardar.
        </div>
      )}

      <ComponentForm prefill={prefill ?? undefined} imageFile={capturedFile} />
    </div>
  )
}
