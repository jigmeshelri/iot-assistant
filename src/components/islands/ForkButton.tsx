import { useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

interface Props {
  projectId: string
  forkCount: number
}

export default function ForkButton({ projectId, forkCount }: Props) {
  const [count, setCount] = useState(forkCount)
  const [loading, setLoading] = useState(false)
  const [forked, setForked] = useState(false)

  async function handleFork() {
    if (forked || loading) return
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Get original project data
      const { data: original } = await supabase
        .from('projects')
        .select('title, description, project_type, difficulty, tags')
        .eq('id', projectId)
        .single()
      if (!original) throw new Error('Project not found')

      await supabase.from('projects').insert({
        user_id: user.id,
        parent_project_id: projectId,
        title: `${original.title} (fork)`,
        description: original.description,
        project_type: original.project_type,
        difficulty: original.difficulty,
        tags: original.tags,
        source: 'fork',
      })

      setCount(c => c + 1)
      setForked(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleFork}
      disabled={loading || forked}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
        forked
          ? 'bg-teal-100 text-teal-700 border-teal-200'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
      } disabled:opacity-60`}
    >
      🍴 {forked ? 'Forkeado' : 'Fork'} · {count}
    </button>
  )
}
