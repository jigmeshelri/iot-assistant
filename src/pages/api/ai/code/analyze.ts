import type { APIRoute } from 'astro'
import { generateText } from 'ai'
import {
  buildAnalyzePrompt,
  getMoonshotModel,
  jsonError,
  jsonResponse,
  parseAiJson,
  parseAnalyzeBody,
  toAnalyzeResponse,
  verifyBearerToken,
} from '../../../../lib/server/ai'

export const POST: APIRoute = async ({ request }) => {
  const auth = await verifyBearerToken(request)
  if ('error' in auth) return auth.error

  const model = getMoonshotModel()
  if (!model) return jsonError(503, 'AI provider not configured')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(422, 'Invalid JSON body')
  }
  const analyzeReq = parseAnalyzeBody(body)
  if (!analyzeReq) return jsonError(422, 'Invalid request body')

  let text: string
  try {
    const result = await generateText({
      model,
      maxOutputTokens: 8192,
      messages: [{ role: 'user', content: buildAnalyzePrompt(analyzeReq) }],
    })
    text = result.text
  } catch (err) {
    console.error('analyze provider error: %s', err)
    return jsonError(502, 'AI provider error')
  }

  try {
    return jsonResponse(toAnalyzeResponse(parseAiJson(text)))
  } catch (err) {
    console.error('analyze parse error: %s | raw (first 500 chars): %s', err, text.slice(0, 500))
    return jsonError(422, `AI response parse error: ${err}`)
  }
}
