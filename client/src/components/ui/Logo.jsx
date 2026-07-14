export default function Logo({ size = 'md', dark = false, showDescriptor = false }) {
  const iconSizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14', xl: 'w-20 h-20' }
  const titleSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' }
  const subtitleSizes = { sm: 'text-[7px]', md: 'text-[8px]', lg: 'text-[9px]', xl: 'text-[10px]' }
  return (
    <div className="flex items-center gap-3 shrink-0" aria-label="Faro Portuario">
      <div className="relative flex-shrink-0">
        <svg viewBox="0 0 56 56" className={iconSizes[size]} fill="none" aria-hidden="true">
          <rect x="1" y="1" width="54" height="54" rx="17" fill="#082F35" stroke="#2DD4BF" strokeWidth="2"/>
          <path d="M28 10L36 39H20L28 10Z" fill="#F8FAFC"/>
          <path d="M25 22H31M23.5 28H32.5M22 34H34" stroke="#082F35" strokeWidth="2" strokeLinecap="round"/>
          <path d="M11 18C15 14 19 12 23 12" stroke="#F6B73C" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M45 18C41 14 37 12 33 12" stroke="#F6B73C" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M9 43C14 39.5 18 46.5 23 43C28 39.5 32 46.5 37 43C41 40.2 44 44 47 43" stroke="#2DD4BF" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="28" cy="14" r="3" fill="#F6B73C"/>
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-black tracking-[-0.04em] ${titleSizes[size]} ${dark ? 'text-white' : 'text-slate-900'}`}>
          FARO <span className="text-teal-500">PORTUARIO</span>
        </span>
        <span className={`mt-1 font-bold uppercase tracking-[0.2em] ${subtitleSizes[size]} ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          {showDescriptor ? 'Talento · Empresas · Actualidad' : 'Manzanillo · Colima'}
        </span>
      </div>
    </div>
  )
}
