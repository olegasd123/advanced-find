'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import * as React from 'react'

export function MultiCombobox<T>({
  options,
  displayValue,
  displayInputValue,
  filter,
  anchor = 'bottom',
  className,
  placeholder,
  autoFocus,
  onClose,
  'aria-label': ariaLabel,
  children,
  ...props
}: {
  options: T[]
  displayValue: (value: T) => string | undefined
  displayInputValue?: (values: T[]) => string
  filter?: (value: T, query: string) => boolean
  className?: string
  placeholder?: string
  autoFocus?: boolean
  'aria-label'?: string
  children: (value: NonNullable<T>) => React.ReactElement
} & Omit<Headless.ComboboxProps<T, true>, 'as' | 'children' | 'multiple' | 'virtual' | 'onClose'> & {
  anchor?: 'top' | 'bottom'
  onClose?: () => void
}) {
  const [ query, setQuery ] = React.useState('')

  const filteredOptions = query === ''
    ? options
    : options.filter((option) =>
      filter ? filter(option, query) : displayValue(option)?.toLowerCase().includes(query.toLowerCase())
    )

  return (
    <Headless.Combobox
      {...props}
      multiple
      virtual={{ options: filteredOptions }}
      onClose={() => {
        setQuery('')
        onClose?.()
      }}>
      <span
        data-slot="control"
        className={clsx([
          className,
          'relative block w-full',
          'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
          'dark:before:hidden',
          'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500',
          'has-data-disabled:opacity-50 has-data-disabled:before:bg-zinc-950/5 has-data-disabled:before:shadow-none',
          'has-data-invalid:before:shadow-red-500/10',
        ])}
      >
        <Headless.ComboboxInput
          autoFocus={autoFocus}
          data-slot="control"
          aria-label={ariaLabel}
          displayValue={(values: T[]) => {
            if (displayInputValue) {
              return displayInputValue(values)
            }

            return values
              .map(option => displayValue(option) ?? '')
              .filter(option => option.length > 0)
              .join(', ')
          }}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className={clsx([
            className,
            'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
            'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
            'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white',
            'border border-zinc-950/10 data-hover:border-zinc-950/20 dark:border-white/10 dark:data-hover:border-white/20',
            'bg-transparent dark:bg-white/5',
            'focus:outline-hidden',
            'data-invalid:border-red-500 data-invalid:data-hover:border-red-500 dark:data-invalid:border-red-500 dark:data-invalid:data-hover:border-red-500',
            'data-disabled:border-zinc-950/20 dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5 dark:data-hover:data-disabled:border-white/15',
            'dark:scheme-dark',
          ])}
        />
        <Headless.ComboboxButton className="group absolute inset-y-0 right-0 flex items-center px-2">
          <svg
            className="size-5 stroke-zinc-500 group-data-disabled:stroke-zinc-600 group-data-hover:stroke-zinc-700 sm:size-4 dark:stroke-zinc-400 dark:group-data-hover:stroke-zinc-300 forced-colors:stroke-[CanvasText]"
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
          >
            <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Headless.ComboboxButton>
      </span>
      <Headless.ComboboxOptions
        transition
        anchor={anchor}
        className={clsx(
          '[--anchor-gap:--spacing(2)] [--anchor-padding:--spacing(4)] sm:data-[anchor~=start]:[--anchor-offset:-4px]',
          'isolate min-w-[calc(var(--input-width)+8px)] scroll-py-1 rounded-xl p-1 select-none empty:invisible',
          'outline outline-transparent focus:outline-hidden',
          'overflow-y-scroll overscroll-contain',
          'bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75',
          'shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset',
          'transition-opacity duration-100 ease-in data-closed:data-leave:opacity-0 data-transition:pointer-events-none'
        )}
      >
        {({ option }) => children(option)}
      </Headless.ComboboxOptions>
    </Headless.Combobox>
  )
}
