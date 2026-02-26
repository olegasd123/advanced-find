import * as React from 'react'
import clsx from 'clsx'

export const ComboboxOptionCategory = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) => {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'group/option grid w-full cursor-default grid-cols-[1fr_--spacing(5)] items-baseline text-base/6 font-bold gap-x-2 py-2.5 px-2 sm:grid-cols-[1fr_--spacing(4)] sm:py-1.5 sm:px-2 sm:text-sm/6 rounded-md outline-hidden data-disabled:opacity-50'
      )}
    >
      {children}
    </div>
  )
}
