import { STATUS_CONFIG } from '../../lib/constants.js'

const SIZE = {
  sm: { pill: 'text-xs px-2 py-0.5 gap-1',   dot: 'w-1.5 h-1.5' },
  md: { pill: 'text-sm px-3 py-1   gap-1.5',  dot: 'w-2 h-2'     },
  lg: { pill: 'text-sm px-4 py-1.5 gap-2',    dot: 'w-2.5 h-2.5' },
}

export default function StatusBadge({ status, size = 'md' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  const s = SIZE[size]
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${s.pill}`}
      style={{
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}44`,
        color: cfg.color,
      }}>
      <span className={`rounded-full shrink-0 ${s.dot}`}
        style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}88` }} />
      {cfg.label}
    </span>
  )
}
