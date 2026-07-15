import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Modal from './Modal.jsx'
import { REPORT_OPTIONS } from '../../lib/constants.js'
import { usePostReport } from '../../hooks/useReports.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Ban, CheckCircle2, Gauge, Radio } from 'lucide-react'

const OPTION_DESIGN = {
  free: { icon: CheckCircle2, active: 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-50', iconClass: 'bg-emerald-100 text-emerald-700', title: 'Fluido', detail: 'Paso continuo o espera menor a 15 minutos' },
  moderate: { icon: Gauge, active: 'border-amber-500 bg-amber-50 ring-4 ring-amber-50', iconClass: 'bg-amber-100 text-amber-700', title: 'Con carga', detail: 'Avance lento o espera aproximada de 15 a 45 minutos' },
  congested: { icon: AlertTriangle, active: 'border-red-500 bg-red-50 ring-4 ring-red-50', iconClass: 'bg-red-100 text-red-700', title: 'Saturado', detail: 'Fila extensa o espera mayor a 45 minutos' },
  closed: { icon: Ban, active: 'border-slate-500 bg-slate-100 ring-4 ring-slate-100', iconClass: 'bg-slate-200 text-slate-700', title: 'Sin paso', detail: 'Acceso cerrado o circulación detenida' },
}

export default function ReportModal({ open, onClose, section }) {
  const [selectedStatus, setSelectedStatus] = useState(null)
  const [comment, setComment] = useState('')
  const { mutateAsync, isPending } = usePostReport()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  useEffect(() => { if (!open) { setSelectedStatus(null); setComment('') } }, [open])

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
      <div className="space-y-5">
        <div className="rounded-2xl bg-[#082f35] p-4 text-white"><div className="flex items-center gap-2 text-teal-200"><Radio size={15}/><p className="text-[10px] font-black uppercase tracking-[.16em]">Actualización comunitaria</p></div><p className="mt-2 text-sm leading-5 text-teal-50/75">¿Cómo está esta zona justo ahora? Selecciona la opción que puedas confirmar.</p></div>

        <div className="grid gap-2 sm:grid-cols-2">
          {REPORT_OPTIONS.map(opt => {
            const design = OPTION_DESIGN[opt.status]
            const Icon = design.icon
            return (
            <button
              key={opt.status}
              onClick={() => setSelectedStatus(opt.status)}
              aria-pressed={selectedStatus === opt.status}
              className={`min-h-32 w-full rounded-2xl border p-4 text-left transition-all ${
                selectedStatus === opt.status
                  ? design.active
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lg'
              }`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${design.iconClass}`}><Icon size={17}/></span>
              <div className="mt-3 text-sm font-black text-[#081f2c]">{design.title}</div>
              <div className="mt-1 text-[10px] leading-4 text-slate-500">{design.detail}</div>
            </button>
          )})}
        </div>

        <div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 140))}
            placeholder="Comentario opcional (máx. 140 caracteres)…"
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50"
          />
          <div className="mt-1 text-right text-xs text-slate-400">{comment.length}/140</div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || !selectedStatus}
          className="port-glow-button min-h-[52px] w-full rounded-xl bg-[#0d5b55] py-4 text-sm font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Enviando…' : 'Enviar reporte'}
        </button>

        {!user && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            Debes <button onClick={() => navigate('/login?returnTo=/pulso-portuario')} className="font-black underline">iniciar sesión</button> para reportar
          </p>
        )}
      </div>
    </Modal>
  )
}
