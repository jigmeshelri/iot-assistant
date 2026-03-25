import { useState } from 'react'

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  project_type: string | null
  difficulty: string | null
  progress: number
  updated_at: string
  source: string | null
}

interface Props {
  projects: Project[]
}

const TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'completed', label: 'Completados' },
  { key: 'archived', label: 'Archivados' },
] as const

type TabKey = (typeof TABS)[number]['key']

const statusLabel: Record<string, string> = {
  saved: 'Guardado',
  in_progress: 'En curso',
  paused: 'Pausado',
  completed: 'Completado',
  abandoned: 'Abandonado',
}

const statusBadge: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-brand-50 text-brand-700',
  paused: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  abandoned: 'bg-red-50 text-red-600',
}

const progressBarColor: Record<string, string> = {
  in_progress: 'bg-brand-500',
  paused: 'bg-violet-400',
  completed: 'bg-green-500',
  saved: 'bg-slate-300',
  abandoned: 'bg-slate-200',
}

const iconColors = [
  { bg: 'bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-violet-100', text: 'text-violet-600' },
  { bg: 'bg-green-100', text: 'text-green-600' },
  { bg: 'bg-brand-100', text: 'text-brand-600' },
  { bg: 'bg-rose-100', text: 'text-rose-600' },
]

function filterProjects(projects: Project[], tab: TabKey): Project[] {
  switch (tab) {
    case 'active':
      return projects.filter(p => p.status === 'in_progress')
    case 'completed':
      return projects.filter(p => p.status === 'completed')
    case 'archived':
      return projects.filter(p => ['paused', 'abandoned', 'saved'].includes(p.status))
    default:
      return projects
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function ProjectFilters({ projects }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const filtered = filterProjects(projects, activeTab)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1 opacity-70">
                {filterProjects(projects, tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            No hay proyectos en esta categoria
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((p, i) => {
              const c = iconColors[i % iconColors.length]
              const pct = p.progress ?? 0
              const barColor = progressBarColor[p.status] ?? 'bg-slate-300'
              return (
                <a
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                    <svg className={`w-5 h-5 ${c.text}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{p.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">{pct}%</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            No hay proyectos en esta categoria
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100">Proyecto</th>
                  <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100 whitespace-nowrap">Estado</th>
                  <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100 whitespace-nowrap">Progreso</th>
                  <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100 whitespace-nowrap">Actualizado</th>
                  <th className="bg-slate-50 font-semibold text-slate-500 text-xs text-left px-4 py-2.5 border-b border-slate-100">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const c = iconColors[i % iconColors.length]
                  const pct = p.progress ?? 0
                  const barColor = progressBarColor[p.status] ?? 'bg-slate-300'
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 border-b border-slate-100">
                        <a href={`/projects/${p.id}`} className="flex items-center gap-2.5 group">
                          <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                            <svg className={`w-3.5 h-3.5 ${c.text}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 group-hover:text-brand-600 transition-colors truncate">{p.title}</p>
                            {p.description && <p className="text-xs text-slate-400 truncate max-w-xs">{p.description}</p>}
                          </div>
                        </a>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {statusLabel[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-1.5">
                            <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100 text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(p.updated_at)}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100">
                        <a href={`/projects/${p.id}`} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Ver proyecto">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
