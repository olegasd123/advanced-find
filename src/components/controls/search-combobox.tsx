'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import * as React from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export { ComboboxOption, ComboboxLabel } from '@/components/catalyst/combobox'

type BaseSearchComboboxProps<T> = {
  options: T[]
  isLoading?: boolean
  searchDelay: number
  minCharacters?: number
  className?: string
  placeholder?: string
  autoFocus?: boolean
  'aria-label'?: string
  anchor?: 'top' | 'bottom'
  displayValue: (value: T) => string | undefined
  displayInputValue?: (values: T[]) => string
  onSearch: (query: string) => void
  children: (value: NonNullable<T>) => React.ReactElement
  onClose?: () => void
}

type SingleSearchComboboxProps<T> = BaseSearchComboboxProps<T> &
  Omit<Headless.ComboboxProps<T, false>, 'as' | 'children' | 'multiple' | 'virtual' | 'onClose'> & {
    multiple?: false
  }

type MultiSearchComboboxProps<T> = BaseSearchComboboxProps<T> &
  Omit<Headless.ComboboxProps<T, true>, 'as' | 'children' | 'multiple' | 'virtual' | 'onClose'> & {
    multiple: true
  }

type SearchComboboxProps<T> = SingleSearchComboboxProps<T> | MultiSearchComboboxProps<T>

const inputClassName = clsx([
  'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
  'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
  'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white',
  'border border-zinc-950/10 data-hover:border-zinc-950/20 dark:border-white/10 dark:data-hover:border-white/20',
  'bg-transparent dark:bg-white/5',
  'focus:outline-hidden',
  'data-invalid:border-red-500 data-invalid:data-hover:border-red-500 dark:data-invalid:border-red-500 dark:data-invalid:data-hover:border-red-500',
  'data-disabled:border-zinc-950/20 dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5 dark:data-hover:data-disabled:border-white/15',
  'dark:scheme-dark',
])

const controlClassName = clsx([
  'relative block w-full',
  'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
  'dark:before:hidden',
  'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500',
  'has-data-disabled:opacity-50 has-data-disabled:before:bg-zinc-950/5 has-data-disabled:before:shadow-none',
  'has-data-invalid:before:shadow-red-500/10',
])

const optionsClassName = clsx(
  '[--anchor-gap:--spacing(2)] [--anchor-padding:--spacing(4)] sm:data-[anchor~=start]:[--anchor-offset:-4px]',
  'isolate min-w-[calc(var(--input-width)+8px)] scroll-py-1 rounded-xl p-1 select-none',
  'outline outline-transparent focus:outline-hidden',
  'overflow-y-scroll overscroll-contain',
  'bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75',
  'shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset',
  'transition-opacity duration-100 ease-in data-closed:data-leave:opacity-0 data-transition:pointer-events-none'
)

const statusMessageClassName = clsx(
  'px-3.5 py-2.5 sm:px-3 sm:py-1.5',
  'text-base/6 text-zinc-500 sm:text-sm/6'
)

const tagContainerClassName = clsx('flex flex-wrap gap-1 mt-1.5')

const tagClassName = clsx(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
  'text-xs/5 font-medium',
  'bg-zinc-950/5 text-zinc-700',
  'dark:bg-white/10 dark:text-zinc-300'
)

const tagRemoveButtonClassName = clsx(
  'inline-flex items-center justify-center rounded-full size-3.5',
  'text-zinc-400 hover:text-zinc-600',
  'dark:text-zinc-400 dark:hover:text-zinc-200',
  'cursor-pointer focus:outline-hidden'
)

const RemoveIcon = () => (
  <svg className="size-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
)

const ChevronIcon = () => (
  <svg
    className="size-5 stroke-zinc-500 group-data-disabled:stroke-zinc-600 group-data-hover:stroke-zinc-700 sm:size-4 dark:stroke-zinc-400 dark:group-data-hover:stroke-zinc-300 forced-colors:stroke-[CanvasText]"
    viewBox="0 0 16 16"
    aria-hidden="true"
    fill="none"
  >
    <path
      d="M5.75 10.75L8 13L10.25 10.75"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.25 5.25L8 3L5.75 5.25"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const getStatusMessage = (
  showHint: boolean,
  hintMessage: string,
  showLoading: boolean,
  showNoResults: boolean
): string | undefined => {
  if (showHint) return hintMessage
  if (showLoading) return 'Searching...'
  if (showNoResults) return 'No results found'
  return undefined
}

export function SearchCombobox<T>(props: SingleSearchComboboxProps<T>): React.ReactElement
export function SearchCombobox<T>(props: MultiSearchComboboxProps<T>): React.ReactElement
export function SearchCombobox<T>(props: SearchComboboxProps<T>) {
  const [query, setQuery] = React.useState('')
  const inputId = React.useId()
  const inputName = `search-combobox-${inputId}`
  const {
    options,
    isLoading,
    searchDelay,
    minCharacters,
    displayValue,
    displayInputValue,
    onSearch,
    anchor = 'bottom',
    className,
    placeholder,
    autoFocus,
    onClose,
    multiple,
    'aria-label': ariaLabel,
    children,
    ...headlessProps
  } = props
  const effectiveMinChars = minCharacters ?? 1
  const debouncedQuery = useDebounce(query, searchDelay)
  const onSearchRef = React.useRef(onSearch)
  onSearchRef.current = onSearch

  React.useEffect(() => {
    if (debouncedQuery.trim().length >= effectiveMinChars) {
      onSearchRef.current(debouncedQuery)
    }
  }, [debouncedQuery, effectiveMinChars])

  const handleInputClick = React.useCallback((event: React.MouseEvent<HTMLInputElement>) => {
    if (
      document.activeElement === event.currentTarget &&
      event.currentTarget.getAttribute('aria-expanded') !== 'true'
    ) {
      const input = event.currentTarget
      input.blur()
      requestAnimationFrame(() => input.focus())
    }
  }, [])

  const showHint = query.trim().length < effectiveMinChars
  const showLoading = !showHint && Boolean(isLoading)
  const showNoResults = !showHint && !isLoading && options.length === 0
  const hintMessage = `Type at least ${effectiveMinChars} character${effectiveMinChars > 1 ? 's' : ''} to search`
  const statusMessage = getStatusMessage(showHint, hintMessage, Boolean(showLoading), showNoResults)

  if (props.multiple) {
    const selectedValues = props.value
    const onSelectionChange = props.onChange

    const handleRemoveTag = (event: React.MouseEvent, itemToRemove: T) => {
      event.preventDefault()
      event.stopPropagation()
      if (onSelectionChange && selectedValues) {
        onSelectionChange(
          selectedValues.filter((item) => item !== itemToRemove) as typeof selectedValues
        )
      }
    }

    return (
      <Headless.Combobox
        {...headlessProps}
        value={selectedValues}
        onChange={onSelectionChange}
        multiple={props.multiple}
        immediate
        onClose={() => {
          setQuery('')
          onClose?.()
        }}
      >
        <span data-slot="control" className={clsx(className, controlClassName)}>
          <Headless.ComboboxInput
            autoFocus={autoFocus}
            data-slot="control"
            aria-label={ariaLabel}
            name={inputName}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            displayValue={(values: T[] | undefined) => displayInputValue?.(values ?? []) ?? ''}
            onChange={(event) => setQuery(event.target.value)}
            onClick={handleInputClick}
            placeholder={placeholder}
            className={clsx(className, inputClassName)}
          />
          <Headless.ComboboxButton className="group absolute inset-y-0 right-0 flex items-center px-2">
            <ChevronIcon />
          </Headless.ComboboxButton>
        </span>
        {selectedValues && selectedValues.length > 0 && (
          <div className={tagContainerClassName}>
            {selectedValues.map((item, index) => (
              <span key={index} className={tagClassName}>
                <span className="truncate max-w-48">{displayValue(item) ?? ''}</span>
                <button
                  type="button"
                  className={tagRemoveButtonClassName}
                  onClick={(event) => handleRemoveTag(event, item)}
                  aria-label={`Remove ${displayValue(item) ?? ''}`}
                >
                  <RemoveIcon />
                </button>
              </span>
            ))}
          </div>
        )}
        <Headless.ComboboxOptions transition anchor={anchor} className={optionsClassName}>
          {statusMessage && <div className={statusMessageClassName}>{statusMessage}</div>}
          {!statusMessage &&
            options.map((option, index) => (
              <React.Fragment key={index}>{children(option as NonNullable<T>)}</React.Fragment>
            ))}
        </Headless.ComboboxOptions>
      </Headless.Combobox>
    )
  }

  return (
    <Headless.Combobox
      {...headlessProps}
      multiple={Boolean(multiple)}
      immediate
      onClose={() => {
        setQuery('')
        onClose?.()
      }}
    >
      <span data-slot="control" className={clsx(className, controlClassName)}>
        <Headless.ComboboxInput
          autoFocus={autoFocus}
          data-slot="control"
          aria-label={ariaLabel}
          name={inputName}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          displayValue={(option: T | null) => (option ? (displayValue(option) ?? '') : '')}
          onChange={(event) => setQuery(event.target.value)}
          onClick={handleInputClick}
          placeholder={placeholder}
          className={clsx(className, inputClassName)}
        />
        <Headless.ComboboxButton className="group absolute inset-y-0 right-0 flex items-center px-2">
          <ChevronIcon />
        </Headless.ComboboxButton>
      </span>
      <Headless.ComboboxOptions transition anchor={anchor} className={optionsClassName}>
        {statusMessage && <div className={statusMessageClassName}>{statusMessage}</div>}
        {!statusMessage &&
          options.map((option, index) => (
            <React.Fragment key={index}>{children(option as NonNullable<T>)}</React.Fragment>
          ))}
      </Headless.ComboboxOptions>
    </Headless.Combobox>
  )
}
