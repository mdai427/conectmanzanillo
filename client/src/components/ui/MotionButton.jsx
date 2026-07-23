import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { tapScale, hoverLift, SPRING } from '../../lib/motion'

// Feedback táctil sobrio para CTAs. El hover solo aplica en dispositivos con
// puntero real (framer respeta whileHover; el tap no dispara hover en móvil).

export function MotionButton({ className, children, ...rest }) {
  return (
    <motion.button
      className={className}
      whileTap={tapScale}
      whileHover={hoverLift}
      transition={SPRING}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

const MotionRouterLink = motion(Link)

export function MotionLink({ className, children, ...rest }) {
  return (
    <MotionRouterLink
      className={className}
      whileTap={tapScale}
      whileHover={hoverLift}
      transition={SPRING}
      {...rest}
    >
      {children}
    </MotionRouterLink>
  )
}
