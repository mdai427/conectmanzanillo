export default function Logo({ size = 'md' }) {
  const sizes = { sm: 'h-8', md: 'h-10', lg: 'h-14' }
  return (
    <div className={`flex items-center gap-3 ${sizes[size]}`}>
      {/* Ícono */}
      <div className="relative flex-shrink-0">
        <svg viewBox="0 0 48 48" className={size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'} fill="none">
          {/* Círculo de fondo */}
          <circle cx="24" cy="24" r="23" fill="#0F2547" stroke="#0099E6" strokeWidth="1.5"/>
          {/* Velero/pez estilizado */}
          <path d="M24 8 L36 28 L24 24 L12 28 Z" fill="#0099E6" opacity="0.9"/>
          <path d="M24 24 L36 28 L24 38 L12 28 Z" fill="#00C2FF" opacity="0.6"/>
          {/* Ola */}
          <path d="M10 34 Q14 30 18 34 Q22 38 26 34 Q30 30 34 34 Q38 38 40 35"
                stroke="#00C2FF" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          {/* Camión pequeño */}
          <rect x="15" y="29" width="8" height="5" rx="1" fill="white" opacity="0.9"/>
          <rect x="23" y="30" width="4" height="4" rx="0.5" fill="#0099E6"/>
          <circle cx="17" cy="34.5" r="1" fill="#0A1628"/>
          <circle cx="24" cy="34.5" r="1" fill="#0A1628"/>
        </svg>
      </div>
      {/* Texto */}
      <div className="flex flex-col leading-none">
        <span className={`font-black text-white tracking-tight ${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base'}`}>
          CONECT
        </span>
        <span className={`font-black tracking-tight ${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base'}`}
              style={{ color: '#0099E6' }}>
          MANZANILLO
        </span>
      </div>
    </div>
  )
}
