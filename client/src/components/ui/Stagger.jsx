import { motion, useReducedMotion } from 'framer-motion'
import { staggerContainer, staggerItem, reduceVariants } from '../../lib/motion'

// Contenedor que escalona a sus hijas. Usar SOLO donde hay una lista/grid real.
// Modo:
//  - "view" (default): dispara al entrar en viewport, una vez.
//  - "mount": dispara al montar (para el hero / momento focal).
export default function Stagger({
  as = 'div',
  className,
  children,
  trigger = 'view',
  ...rest
}) {
  const reduced = useReducedMotion()
  const MotionTag = motion[as] || motion.div
  const variants = reduceVariants(staggerContainer, reduced)

  const triggerProps =
    trigger === 'mount'
      ? { initial: 'hidden', animate: 'show' }
      : {
          initial: 'hidden',
          whileInView: 'show',
          viewport: { once: true, margin: '-80px' },
        }

  return (
    <MotionTag className={className} variants={variants} {...triggerProps} {...rest}>
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
