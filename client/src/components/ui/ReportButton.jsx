import { useState } from 'react'
import { Radio } from 'lucide-react'
import ReportModal from './ReportModal.jsx'

export default function ReportButton({ section }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="port-glow-button flex min-h-[48px] items-center gap-2 rounded-xl bg-[#0d5b55] px-5 py-3 text-sm font-black text-white"
      >
        <Radio size={16} />
        Reportar ahora
      </button>
      <ReportModal open={open} onClose={() => setOpen(false)} section={section} />
    </>
  )
}
