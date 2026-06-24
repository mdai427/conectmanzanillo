import { STATUS_CONFIG } from '../../lib/constants.js'

export default function StatusBadge({ status, size = 'md' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${cfg.tw} ${sizes[size]}`}>
      <span>{cfg.emoji}</span>
      {cfg.label}
    </span>
  )
}
