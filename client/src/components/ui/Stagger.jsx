import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { staggerContainer, staggerItem, reduceVariants } from '../../lib/motion'

// Contenedor que escalona a sus hijas. Usar SOLO donde hay una lista/grid real.
// Modo:
//  - "view" (default): dispara al entrar en viewport, una vez. Usa useInView con
//    un ref explícito para un disparo fiable al hacer scroll.
//  - "mount": dispara al montar (para el hero / momento focal).
export default function Stagger({
  as = 'div',
  className,
  children,
  trigger = 'view',
  ...rest
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const reduced = useReducedMotion()
  const MotionTag = motion[as] || motion.div
  const variants = reduceVariants(staggerContainer, reduced)

  const animate =
    trigger === 'mount' ? 'show' : inView ? 'show' : 'hidden'

  return (
    <MotionTag
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={animate}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

function Item({ as = 'div', className, children, ...rest }) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as] || motion.div
  const variants = reduceVariants(staggerItem, reduced)

  return (
    <MotionTag className={className} variants={variants} {...rest}>
      {children}
    </MotionTag>
  )
}

Stagger.Item = Item
