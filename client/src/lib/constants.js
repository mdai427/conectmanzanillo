export const STATUS_CONFIG = {
  free:      { label: 'Libre',     emoji: '🟢', color: '#22C55E', tw: 'text-green-400 bg-green-950/60 border-green-800/40' },
  moderate:  { label: 'Moderado',  emoji: '🟡', color: '#F59E0B', tw: 'text-amber-400 bg-amber-950/60 border-amber-800/40' },
  congested: { label: 'Saturado',  emoji: '🔴', color: '#EF4444', tw: 'text-red-400   bg-red-950/60   border-red-800/40'   },
  closed:    { label: 'Cerrado',   emoji: '⚫', color: '#6B7280', tw: 'text-gray-400  bg-gray-900/60  border-gray-700/40'  },
  unknown:   { label: 'Sin datos', emoji: '❓', color: '#4B5563', tw: 'text-gray-500  bg-gray-900/40  border-gray-800/40'  },
}

export const REPORT_OPTIONS = [
  { status: 'free',      label: '🟢 Libre / Sin fila',       sub: 'Paso fluido, menos de 10 min'   },
  { status: 'moderate',  label: '🟡 Fila moderada',          sub: 'Espera aproximada 30-60 min'    },
  { status: 'congested', label: '🔴 Saturado / Fila larga',  sub: 'Más de 1 hora de espera'        },
  { status: 'closed',    label: '⚫ Cerrado / Sin acceso',    sub: 'No hay paso por esta zona'      },
]
