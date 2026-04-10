import { useState, useEffect } from 'react'
import type React from 'react'
import { categoryPrefix, nextAvailableSku } from '../../../lib/skuUtils'
import { CATEGORIES } from '../../../lib/constants'
import { addComponentToStock } from '../../../lib/inventory'

export interface ComponentFormPrefill {
  sku?:               string
  name?:              string
  category?:          string
  platform_family?:   string
  technical_specs?:   Record<string, unknown>
  datasheet_url?:     string
  connectivity_caps?: Record<string, boolean>
  location_id?:       string
}

export interface UseComponentFormInput {
  prefill?: ComponentFormPrefill
  imageFile?: File | null
}

export interface UseComponentFormResult {
  fields: {
    name: string
    sku: string
    skuPlaceholder: string
    skuConflict: string
    category: string
    platform: string
    quantity: number
    caps: Record<string, boolean>
    specs: Record<string, string>
    locationId: string | null
    datasheetUrl: string
    notes: string
  }
  setName: (v: string) => void
  setSku: (v: string) => void
  setSkuConflict: (v: string) => void
  setCategory: (v: string) => void
  setPlatform: (v: string) => void
  setQuantity: (v: number) => void
  setCaps: (v: Record<string, boolean>) => void
  setSpecs: (v: Record<string, string>) => void
  setLocationId: (v: string | null) => void
  setDatasheetUrl: (v: string) => void
  setNotes: (v: string) => void
  loading: boolean
  success: boolean
  error: string
  handleSubmit: (e: React.FormEvent) => Promise<void>
}

export function useComponentForm({ prefill, imageFile }: UseComponentFormInput = {}): UseComponentFormResult {
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

  return {
    fields: { name, sku, skuPlaceholder, skuConflict, category, platform, quantity, caps, specs, locationId, datasheetUrl, notes },
    setName, setSku, setSkuConflict, setCategory, setPlatform, setQuantity, setCaps, setSpecs, setLocationId, setDatasheetUrl, setNotes,
    loading, success, error,
    handleSubmit,
  }
}
