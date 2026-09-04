import type { APIRoute } from 'astro'
import { generateText } from 'ai'
import {
  getMoonshotModel,
  jsonError,
  jsonResponse,
  parseAiJson,
  RECOGNIZE_PROMPT,
  toRecognizeResponse,
  verifyBearerToken,
} from '../../../lib/server/ai'

export const POST: APIRoute = async ({ request }) => {
  const auth = await verifyBearerToken(request)
  if ('error' in auth) return auth.error

  const model = getMoonshotModel()
  if (!model) return jsonError(503, 'AI provider not configured')

  let file: File | null
  try {
    const form = await request.formData()
    const field = form.get('file')
    // FormDataEntryValue is File | string; avoid instanceof (cross-realm File in tests)
    file = field !== null && typeof field !== 'string' ? field : null
  } catch {
    return jsonError(422, 'Invalid multipart body')
  }
  if (!file) return jsonError(422, 'Missing file field')

  const imageBytes = new Uint8Array(await file.arrayBuffer())
  const mediaType = file.type || 'image/jpeg'

  let text: string
  try {
    const result = await generateText({
      model,
      maxOutputTokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', image: imageBytes, mediaType },
            { type: 'text', text: RECOGNIZE_PROMPT },
          ],
        },
      ],
    })
    text = result.text
  } catch (err) {
    console.error('recognize provider error: %s', err)
    return jsonError(502, 'AI provider error')
  }

  try {
    const data = parseAiJson(text)
    return jsonResponse(toRecognizeResponse(data))
  } catch (err) {
    console.error('recognize parse error: %s | raw (first 500 chars): %s', err, text.slice(0, 500))
    return jsonError(422, `AI response parse error: ${err}`)
  }
}
