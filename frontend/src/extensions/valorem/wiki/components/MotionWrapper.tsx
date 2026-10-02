import React from 'react'

export interface MotionWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  className?: string
  initial?: any
  animate?: any
  transition?: any
  as?: React.ElementType
}

export function MotionWrapper({
  children,
  className,
  as: Component = 'div',
  initial: _initial,
  animate: _animate,
  transition: _transition,
  ...rest
}: MotionWrapperProps) {
  const Comp = Component as any
  return (
    <Comp className={className} {...rest}>
      {children}
    </Comp>
  )
}
