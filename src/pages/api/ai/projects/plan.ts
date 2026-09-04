import type { APIRoute } from 'astro'
import { generateText } from 'ai'
import {
  getMoonshotModel,
  jsonError,
  jsonResponse,
  parseAiJson,
  verifyBearerToken,
} from '../../../../lib/server/ai'
import { buildPlanPrompt, parsePlanBody, toPlanResponse } from '../../../../lib/server/aiProjects'

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
  const planReq = parsePlanBody(body)
  if (!planReq) return jsonError(422, 'Invalid request body')

  let text: string
  try {
    const result = await generateText({
      model,
      maxOutputTokens: 2048,
      messages: [{ role: 'user', content: buildPlanPrompt(planReq) }],
    })
    text = result.text
  } catch (err) {
    console.error('plan provider error: %s', err)
    return jsonError(502, 'AI provider error')
  }

  try {
    return jsonResponse(toPlanResponse(parseAiJson(text)))
  } catch (err) {
    console.error('plan parse error: %s | raw (first 500 chars): %s', err, text.slice(0, 500))
    return jsonError(422, `AI response parse error: ${err}`)
  }
}
