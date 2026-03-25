import { useState, useEffect } from 'react'

interface Props {
  value: Record<string, string>
  onChange: (specs: Record<string, string>) => void
}

const SUGGESTIONS = ['voltaje', 'corriente', 'interfaz', 'encapsulado', 'frecuencia', 'memoria']

interface Pair {
  key: string
  value: string
}

function toRecord(pairs: Pair[]): Record<string, string> {
  const rec: Record<string, string> = {}
  for (const p of pairs) {
    const k = p.key.trim()
    if (k) rec[k] = p.value
  }
  return rec
}

export default function SpecsEditor({ value, onChange }: Props) {
  const [pairs, setPairs] = useState<Pair[]>(() => {
    const entries = Object.entries(value)
    return entries.length > 0 ? entries.map(([k, v]) => ({ key: k, value: v })) : []
  })

  useEffect(() => {
    const entries = Object.entries(value)
    const incoming = entries.length > 0 ? entries.map(([k, v]) => ({ key: k, value: v })) : []
    const current = toRecord(pairs)
    const next = toRecord(incoming)
    if (JSON.stringify(current) !== JSON.stringify(next)) {
      setPairs(incoming)
    }
  }, [value])

  function emit(updated: Pair[]) {
    setPairs(updated)
    onChange(toRecord(updated))
  }

  function updateKey(index: number, newKey: string) {
    const updated = pairs.map((p, i) => (i === index ? { ...p, key: newKey } : p))
    emit(updated)
  }

  function updateValue(index: number, newVal: string) {
    const updated = pairs.map((p, i) => (i === index ? { ...p, value: newVal } : p))
    emit(updated)
  }

  function remove(index: number) {
    const updated = pairs.filter((_, i) => i !== index)
    emit(updated)
  }

  function add() {
    const used = new Set(pairs.map((p) => p.key.trim()))
    const suggestion = SUGGESTIONS.find((s) => !used.has(s)) ?? ''
    emit([...pairs, { key: suggestion, value: '' }])
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">Especificaciones técnicas</p>
      {pairs.map((pair, i) => (
        <div key={i} className="flex gap-2 items-center mb-2">
          <input
            type="text"
            value={pair.key}
            onChange={(e) => updateKey(i, e.target.value)}
            placeholder="voltaje"
            list="spec-key-suggestions"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
          />
          <input
            type="text"
            value={pair.value}
            onChange={(e) => updateValue(i, e.target.value)}
            placeholder="3.3V"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            &times;
          </button>
        </div>
      ))}
      <datalist id="spec-key-suggestions">
        {SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={add}
        className="text-xs text-teal-600 font-medium hover:text-teal-700 transition-colors"
      >
        + Añadir especificación
      </button>
    </div>
  )
}
