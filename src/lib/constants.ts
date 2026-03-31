// ─── Difficulty ──────────────────────────────────────────────────────────────

export const DIFFICULTY = {
  beginner: {
    label: 'Principiante',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  intermediate: {
    label: 'Intermedio',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  advanced: {
    label: 'Avanzado',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
} as const

export type DifficultyKey = keyof typeof DIFFICULTY

// ─── Project Status ───────────────────────────────────────────────────────────

export const PROJECT_STATUS = {
  saved: {
    label: 'Guardado',
    badge: 'bg-slate-100 text-slate-600',
  },
  in_progress: {
    label: 'En progreso',
    badge: 'bg-brand-50 text-brand-700',
  },
  paused: {
    label: 'Pausado',
    badge: 'bg-amber-50 text-amber-700',
  },
  completed: {
    label: 'Completado',
    badge: 'bg-green-50 text-green-700',
  },
  abandoned: {
    label: 'Abandonado',
    badge: 'bg-red-50 text-red-600',
  },
} as const

export type ProjectStatusKey = keyof typeof PROJECT_STATUS

// ─── Category Colors ──────────────────────────────────────────────────────────

export const categoryColors: Record<string, { bg: string; icon: string }> = {
  'Microcontrolador': { bg: 'bg-brand-50',  icon: 'text-brand-600'  },
  'Sensor':           { bg: 'bg-amber-50',  icon: 'text-amber-600'  },
  'Actuador':         { bg: 'bg-violet-50', icon: 'text-violet-600' },
  'Alimentación':     { bg: 'bg-green-50',  icon: 'text-green-600'  },
  'Módulo':           { bg: 'bg-violet-50', icon: 'text-violet-600' },
  'Pasivo':           { bg: 'bg-slate-100', icon: 'text-slate-600'  },
}
