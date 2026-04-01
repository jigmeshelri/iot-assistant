import { useState } from 'react'
import { forkProject } from '../../lib/projects'

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
    const { error } = await forkProject(projectId)
    setLoading(false)
    if (error === 'Not authenticated') { window.location.href = '/login'; return }
    if (!error) {
      setCount(c => c + 1)
      setForked(true)
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
