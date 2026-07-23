import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { fadeRise, reduceVariants } from '../../lib/motion'

// Revela un grupo de contenido real (sección, tarjeta, bloque) una sola vez
// al entrar en viewport. Usa useInView con un ref explícito para un disparo
// fiable al hacer scroll (evita que se dispare todo al montar).
export default function Reveal({ as = 'div', className, children, ...rest }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const reduced = useReducedMotion()
  const MotionTag = motion[as] || motion.div
  const variants = reduceVariants(fadeRise, reduced)

  return (
    <MotionTag
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
