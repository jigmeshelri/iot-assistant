interface Props {
  id: string
  title: string
  description?: string | null
  status: string
  project_type: string
  difficulty?: string | null
  tags?: string[]
  direct_fork_count?: number
  href?: string
}

const STATUS_CLASS: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-teal-100 text-teal-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  abandoned: 'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<string, string> = {
  saved: 'Guardado', in_progress: 'En progreso', paused: 'Pausado',
  completed: 'Completado', abandoned: 'Abandonado',
}

export default function ProjectCard({ id, title, description, status, project_type, difficulty, tags = [], direct_fork_count = 0, href }: Props) {
  return (
    <a href={href ?? `/projects/${id}`} className="block bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-900 leading-tight">{title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_CLASS[status] ?? STATUS_CLASS.saved}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
      {description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{description}</p>}
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{tag}</span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>{project_type}</span>
        {difficulty && <span>{difficulty}</span>}
        {direct_fork_count > 0 && <span>🍴 {direct_fork_count}</span>}
      </div>
    </a>
  )
}
