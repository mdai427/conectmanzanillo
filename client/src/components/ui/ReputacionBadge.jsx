// Niveles de reputación del sistema
export const NIVELES = {
  nuevo:       { label: 'Nuevo',          color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', emoji: '🌱', min: 0    },
  colaborador: { label: 'Colaborador',    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', emoji: '🤝', min: 100  },
  experto:     { label: 'Experto',        color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', emoji: '⭐', min: 500  },
  premium:     { label: 'Premium',        color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '💎', min: 1000 },
  embajador:   { label: 'Embajador',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca', emoji: '🏆', min: 2500 },
  elite:       { label: 'Operador Elite', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', emoji: '🚀', min: 5000 },
}

export function getNivel(puntos = 0) {
  if (puntos >= 5000) return 'elite'
  if (puntos >= 2500) return 'embajador'
  if (puntos >= 1000) return 'premium'
  if (puntos >= 500)  return 'experto'
  if (puntos >= 100)  return 'colaborador'
  return 'nuevo'
}

export function getNextNivel(puntos = 0) {
  const nivelesList = ['nuevo','colaborador','experto','premium','embajador','elite']
  const current = getNivel(puntos)
  const idx = nivelesList.indexOf(current)
  return nivelesList[idx + 1] || null
}

export function getProgreso(puntos = 0) {
  const current = getNivel(puntos)
  const next = getNextNivel(puntos)
  if (!next) return 100
  const currentMin = NIVELES[current].min
  const nextMin = NIVELES[next].min
  return Math.round(((puntos - currentMin) / (nextMin - currentMin)) * 100)
}

export default function ReputacionBadge({ puntos = 0, nivel, size = 'md', showLabel = true }) {
  const key = nivel || getNivel(puntos)
  const cfg = NIVELES[key] || NIVELES.nuevo

  const sizes = {
    xs:  { px: 'px-1.5 py-0.5', text: 'text-[9px]', emoji: 'text-[10px]' },
    sm:  { px: 'px-2 py-0.5',   text: 'text-[10px]', emoji: 'text-xs'    },
    md:  { px: 'px-2.5 py-1',   text: 'text-xs',     emoji: 'text-sm'    },
    lg:  { px: 'px-3 py-1.5',   text: 'text-sm',     emoji: 'text-base'  },
  }
  const s = sizes[size] || sizes.md

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap ${s.px}`}
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <span className={s.emoji}>{cfg.emoji}</span>
      {showLabel && <span className={s.text}>{cfg.label}</span>}
    </span>
  )
}
