import { ThumbsUp, ThumbsDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePostReaction } from '../../hooks/useReports.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useNavigate } from 'react-router-dom'

export default function ConfirmReaction({ report }) {
  const { mutateAsync, isPending } = usePostReaction()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const react = async (reaction) => {
    if (!user) { navigate('/login'); return }
    try {
      await mutateAsync({ report_id: report.id, reaction })
      toast.success(reaction === 'confirm' ? 'Confirmado' : 'Contradicho')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={() => react('confirm')}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 disabled:opacity-40 transition-colors min-h-[36px] px-2"
      >
        <ThumbsUp size={13} />
        <span>{report.confirmations}</span>
      </button>
      <button
        onClick={() => react('contradict')}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors min-h-[36px] px-2"
      >
        <ThumbsDown size={13} />
        <span>{report.contradictions}</span>
      </button>
    </div>
  )
}
