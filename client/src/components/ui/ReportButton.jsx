import { useState } from 'react'
import { Radio } from 'lucide-react'
import ReportModal from './ReportModal.jsx'

export default function ReportButton({ section }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-3 bg-[#00C2FF] text-[#0D1117] font-bold text-sm rounded-xl hover:bg-[#33CFFF] active:scale-95 transition-all min-h-[48px]"
      >
        <Radio size={16} />
        Reportar ahora
      </button>
      <ReportModal open={open} onClose={() => setOpen(false)} section={section} />
    </>
  )
}
