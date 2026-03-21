import { createSupabaseBrowserClient } from './supabase'

// ── Fun error messages ────────────────────────────────────────────────────────

const FUN_ERRORS: { match: RegExp; emoji: string; msg: string }[] = [
  { match: /422|validation|missing|required/i,
    emoji: '📋',
    msg:   'El formulario llegó incompleto al servidor — como mandar un ESP32 sin firmware.' },
  { match: /401|403|authenticated|auth/i,
    emoji: '🔐',
    msg:   'Tu sesión expiró más rápido que una batería de 9V barata.' },
  { match: /timeout|ETIMEDOUT|timed out/i,
    emoji: '⏳',
    msg:   'La IA se quedó dormida esperando respuesta. ¡Hasta los chips necesitan un break!' },
  { match: /rate.?limit|429|too many/i,
    emoji: '🚦',
    msg:   'Demasiadas consultas en poco tiempo. La IA necesita enfriar sus transistores.' },
  { match: /network|fetch|ECONNREFUSED|Failed to fetch/i,
    emoji: '📡',
    msg:   'Señal perdida en la ionosfera. Comprueba tu conexión y vuelve a intentarlo.' },
  { match: /500|internal server/i,
    emoji: '💥',
    msg:   '¡Kaboom! El servidor tuvo un cortocircuito digital. Intentémoslo de nuevo.' },
  { match: /recognize|vision|image/i,
    emoji: '🔭',
    msg:   'La IA no pudo identificar el componente. ¿Intentas con mejor iluminación?' },
  { match: /discover|suggest/i,
    emoji: '🛸',
    msg:   'El generador de proyectos se perdió en el espacio. Inténtalo de nuevo.' },
  { match: /plan|bom|inventory/i,
    emoji: '🗺️',
    msg:   'El planificador de proyectos encontró un bug más grande que un condensador electrolítico.' },
]

const DEFAULT_FUN = { emoji: '🤖', msg: 'Algo salió mal en el laboratorio. ¡El robot pide disculpas!' }

export function funErrorMessage(rawError: string): string {
  const match = FUN_ERRORS.find(f => f.match.test(rawError))
  const { emoji, msg } = match ?? DEFAULT_FUN
  return `${emoji} ${msg}`
}

// ── Log to Supabase (fire-and-forget, falls back to console) ──────────────────

export async function logError(
  context: string,
  error: unknown,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const payload = {
    context,
    message,
    detail: {
      ...detail,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    },
  }

  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert({ ...payload, user_id: user?.id ?? null })

    if (dbError) throw dbError
  } catch (logErr) {
    // DB not available — log to console
    console.error('[errorLog] Could not persist to DB, logging locally:', logErr)
    console.error('[errorLog]', payload)
  }
}
