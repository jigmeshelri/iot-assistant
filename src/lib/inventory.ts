import { createSupabaseBrowserClient } from './supabase'
import { COMPONENT_IMAGES_BUCKET } from './componentImage'

export type AddComponentError =
  | { type: 'auth';         message: string }
  | { type: 'sku_conflict'; message: string }
  | { type: 'unknown';      message: string }

function classifyError(err: { code?: string; message?: string } | null | undefined): AddComponentError {
  const message = err?.message ?? 'Unknown error'
  if (err?.code === '23505' || message.includes('duplicate key')) {
    return { type: 'sku_conflict', message }
  }
  return { type: 'unknown', message }
}

export interface AddComponentInput {
  sku: string
  name: string
  category: string
  platform_family: string | null
  technical_specs: Record<string, string>
  datasheet_url: string | null
  connectivity_caps: Record<string, boolean>
  quantity: number
  notes: string | null
  location_id: string | null
  imageFile?: File | null
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

function extensionFor(file: File): string {
  const dot = file.name.lastIndexOf('.')
  if (dot > 0 && dot < file.name.length - 1) {
    return file.name.slice(dot + 1).toLowerCase()
  }
  return MIME_EXTENSIONS[file.type] ?? 'bin'
}


export async function addComponentToStock(
  input: AddComponentInput,
): Promise<{ componentId: string | null; error: AddComponentError | null }> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { componentId: null, error: { type: 'auth', message: 'Not authenticated' } }

  const { data: component, error: compErr } = await supabase
    .from('components')
    .upsert({
      sku: input.sku,
      name: input.name,
      category: input.category,
      platform_family: input.platform_family,
      technical_specs: input.technical_specs,
      datasheet_url: input.datasheet_url,
      connectivity_caps: input.connectivity_caps,
    }, { onConflict: 'sku' })
    .select()
    .single()
  if (compErr) return { componentId: null, error: classifyError(compErr) }

  if (input.imageFile) {
    const ext = extensionFor(input.imageFile)
    const path = `${user.id}/${component.id}/${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from(COMPONENT_IMAGES_BUCKET)
      .upload(path, input.imageFile, { upsert: false, contentType: input.imageFile.type || undefined })
    if (uploadErr) {
      // Upsert may have created a brand-new component row with no image and no
      // stock. The next retry of the same SKU is idempotent (upsert), so the
      // orphan is recoverable, but we surface the error to the user.
      return { componentId: null, error: classifyError(uploadErr) }
    }

    const { error: imgErr } = await supabase
      .from('components')
      .update({ image_url: path })
      .eq('id', component.id)
    if (imgErr) return { componentId: null, error: classifyError(imgErr) }
  }

  const { error: stockErr } = await supabase
    .from('stock')
    .insert({
      user_id: user.id,
      component_id: component.id,
      quantity: input.quantity,
      notes: input.notes,
      location_id: input.location_id,
    })
  if (stockErr) return { componentId: null, error: classifyError(stockErr) }

  return { componentId: component.id, error: null }
}

export interface UpdateComponentInput {
  name: string
  category: string
  platform_family: string | null
  connectivity_caps: Record<string, boolean>
  technical_specs: Record<string, string>
  datasheet_url: string | null
}

export interface UpdateStockInput {
  location_id: string | null
  notes: string | null
}

export async function updateInventoryItem(
  componentId: string,
  stockId: string,
  component: UpdateComponentInput,
  stock: UpdateStockInput,
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error: compErr } = await supabase
    .from('components')
    .update({
      name: component.name,
      category: component.category,
      platform_family: component.platform_family,
      connectivity_caps: component.connectivity_caps,
      technical_specs: component.technical_specs,
      datasheet_url: component.datasheet_url,
    })
    .eq('id', componentId)
  if (compErr) return { error: compErr.message }

  const { error: stockErr } = await supabase
    .from('stock')
    .update({
      location_id: stock.location_id,
      notes: stock.notes,
    })
    .eq('id', stockId)
  if (stockErr) return { error: stockErr.message }

  return { error: null }
}

export async function deleteStockItem(
  stockId: string,
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('stock').delete().eq('id', stockId)
  return { error: error?.message ?? null }
}
