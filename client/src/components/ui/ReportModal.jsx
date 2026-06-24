import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal.jsx'
import { REPORT_OPTIONS } from '../../lib/constants.js'
import { usePostReport } from '../../hooks/useReports.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useNavigate } from 'react-router-dom'

export default function ReportModal({ open, onClose, section }) {
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [comment, setComment] = useState('')
  const { mutateAsync, isPending } = usePostReport()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!user) { navigate('/login'); return }
    if (!selectedStatus) { toast.error('Selecciona el estado de la zona'); return }

    try {
      await mutateAsync({
        section_id: section.id,
        status: selectedStatus,
        comment: comment.trim() || undefined,
      })
      toast.success('¡Reporte enviado! Gracias por contribuir')
      setSelectedStatus(null)
      setComment('')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Reportar · ${section?.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-[#8B949E]">¿Cómo está la zona en este momento?</p>

        <div className="space-y-2">
          {REPORT_OPTIONS.map(opt => (
            <button
              key={opt.status}
              onClick={() => setSelectedStatus(opt.status)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedStatus === opt.status
                  ? 'border-[#00C2FF] bg-[#00C2FF]/10'
                  : 'border-[#30363D] bg-[#0D1117] hover:border-[#4B5563]'
              }`}
            >
              <div className="font-semibold text-white text-sm">{opt.label}</div>
              <div className="text-xs text-[#8B949E] mt-0.5">{opt.sub}</div>
            </button>
          ))}
        </div>

        <div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 140))}
            placeholder="Comentario opcional (máx. 140 caracteres)…"
            rows={2}
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4B5563] resize-none focus:outline-none focus:border-[#00C2FF] transition-colors"
          />
          <div className="text-right text-xs text-[#4B5563] mt-1">{comment.length}/140</div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || !selectedStatus}
          className="w-full py-4 rounded-xl bg-[#00C2FF] text-[#0D1117] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
        >
          {isPending ? 'Enviando…' : 'Enviar reporte'}
        </button>

        {!user && (
          <p className="text-center text-xs text-[#8B949E]">
            Debes <button onClick={() => navigate('/login')} className="text-[#00C2FF] underline">iniciar sesión</button> para reportar
          </p>
        )}
      </div>
    </Modal>
  )
}
