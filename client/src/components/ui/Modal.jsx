import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#03151c]/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[26px] border border-white/20 bg-white shadow-[0_35px_100px_rgba(1,17,23,.4)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 p-5 backdrop-blur-xl">
          <h2 className="pr-4 text-lg font-black tracking-tight text-[#081f2c]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
