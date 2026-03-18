import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
}

interface Props {
  projectId: string
}

export default function CommentThread({ projectId }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))

    supabase.from('project_comments').select('*').eq('project_id', projectId).order('created_at')
      .then(({ data }) => { setComments(data ?? []); setLoading(false) })

    // Realtime
    const channel = supabase.channel(`comments:${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_comments', filter: `project_id=eq.${projectId}` },
        payload => setComments(prev => [...prev, payload.new as Comment]))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !userId) return
    setPosting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.from('project_comments').insert({ project_id: projectId, user_id: userId, content })
      setContent('')
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <div className="py-4 text-center text-sm text-slate-400">Cargando comentarios...</div>

  return (
    <div className="space-y-3">
      {comments.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-4">Sin comentarios aún. ¡Sé el primero!</p>
      )}
      {comments.map(c => (
        <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
          <p className="text-xs text-slate-400 mt-2">
            {new Date(c.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      ))}

      {userId ? (
        <form onSubmit={postComment} className="flex gap-2">
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escribe un comentario..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button type="submit" disabled={posting || !content.trim()}
            className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
            {posting ? '...' : 'Enviar'}
          </button>
        </form>
      ) : (
        <p className="text-center text-xs text-slate-400">
          <a href="/login" className="text-teal-600 hover:underline">Inicia sesión</a> para comentar
        </p>
      )}
    </div>
  )
}
