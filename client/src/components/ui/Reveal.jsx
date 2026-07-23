import { motion, useReducedMotion } from 'framer-motion'
import { fadeRise, reduceVariants } from '../../lib/motion'

// Revela un grupo de contenido real (sección, tarjeta, bloque) una sola vez
// al entrar en viewport. No usar por cada elemento: uno por grupo genuino.
export default function Reveal({ as = 'div', className, children, delay = 0, ...rest }) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as] || motion.div
  const variants = reduceVariants(fadeRise, reduced)

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      transition={delay ? { delay } : undefined}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
