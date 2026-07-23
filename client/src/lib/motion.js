// Fuente única de motion para todo el sitio (sobrio y profesional).
// Filosofía: propósito antes que decoración, easing fuerte, <300ms,
// solo transform/opacity, cohesión (mismos valores en todas las páginas).

// Curvas de easing
export const EASE_OUT = [0.23, 1, 0.32, 1] // entradas rutinarias
export const EASE_ARRIVAL = [0.16, 1, 0.3, 1] // llegadas autoradas (hero, rutas)

// Muelle sobrio para feedback táctil
export const SPRING = { type: 'spring', stiffness: 100, damping: 20 }

// Duraciones (segundos, para framer)
export const DUR_FAST = 0.2
export const DUR_BASE = 0.5
export const DUR_SLOW = 0.6

// Distancia de entrada (px). Suficiente para percibirse sin sentirse brusco.
export const RISE = 26

// Entrada base: aparece y sube. Nunca desde scale(0).
export const fadeRise = {
  hidden: { opacity: 0, y: RISE },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR_BASE, ease: EASE_OUT },
  },
}

// Contenedor de listas/grids reales: escalona a las hijas.
export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.06,
    },
  },
}

// Hija de un stagger.
export const staggerItem = {
  hidden: { opacity: 0, y: RISE },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR_BASE, ease: EASE_OUT },
  },
}

// Feedback táctil: nunca scale(0), sobrio.
export const tapScale = { scale: 0.97 }
export const hoverLift = { y: -2 }

// Colapsa el desplazamiento a 0 cuando el usuario pide menos movimiento,
// conservando el fundido de opacidad. Recibe el bool de useReducedMotion().
export function reduceVariants(variants, reduced) {
  if (!reduced) return variants
  const clone = {}
  for (const key of Object.keys(variants)) {
    const state = variants[key]
    clone[key] = { ...state }
    if ('y' in clone[key]) clone[key].y = 0
    if ('x' in clone[key]) clone[key].x = 0
    if ('scale' in clone[key]) clone[key].scale = 1
  }
  return clone
}
