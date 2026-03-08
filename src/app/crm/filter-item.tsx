import * as React from 'react'
import { Button } from '@/components/catalyst/button'
import { Bars3Icon, TrashIcon } from '@heroicons/react/16/solid'
import { Combobox, ComboboxLabel, ComboboxOption } from '@/components/catalyst/combobox'
import { Listbox, ListboxLabel, ListboxOption } from '@/components/catalyst/listbox'
import { ComboboxOptionCategory } from '@/components/controls/combobox-option-category'
import { FilterOption } from './filter-grid.helpers'
import { FilterItemValue } from './filter-item-value'
import { useAppConfig } from '@/hooks/use-app-config'
import { FilterCategoryConfig, FilterOptionConfig } from '@/libs/types/app-config.types'
import { AppliedFilterCondition, ConditionValue } from '@/libs/types/filter.types'
import clsx from 'clsx'

const EMPTY_FILTER_OPTION: FilterOption = {}

interface CrmFilterConditionOption {
  value: string
  displayName: string
  isMultiSelection?: boolean
}

const getCrmFilterConditionsOptions = (
  type: string | undefined,
  localizationInfo?: Record<string, string>,
  isMultiSelection?: boolean
): CrmFilterConditionOption[] => {
  const normalizedType = type?.toLowerCase()

  const filters: string[] = []

  filters.push(...['eq', 'ne', 'null', 'not-null'])

  if (
    normalizedType === 'string' ||
    normalizedType === 'memo' ||
    normalizedType === 'uniqueidentifier'
  ) {
    filters.push(
      ...['in', 'begins-with', 'not-begin-with', 'ends-with', 'not-end-with', 'like', 'not-like']
    )
  } else if ((normalizedType === 'picklist' || normalizedType === 'lookup') && isMultiSelection) {
    filters.push(...['in'])
  } else if (
    normalizedType === 'number' ||
    normalizedType === 'integer' ||
    normalizedType === 'bigint' ||
    normalizedType === 'decimal' ||
    normalizedType === 'double' ||
    normalizedType === 'money'
  ) {
    filters.push(...['in', 'ge', 'gt', 'le', 'lt'])
  } else if (normalizedType === 'datetime') {
    filters.push(...['ge', 'gt', 'le', 'lt', 'today', 'tomorrow', 'yesterday'])
  }

  return filters.map((i) => {
    return { value: i, displayName: localizationInfo?.[i] ?? i }
  })
}

interface FilterOptionCategoryEntry {
  kind: 'category'
  categoryId: string
  displayName: string
}

interface FilterOptionValueEntry {
  kind: 'option'
  option: FilterOption
}

type FilterOptionEntry = FilterOptionCategoryEntry | FilterOptionValueEntry

export const FilterItem = ({
  optionId,
  options,
  categories,
  selectedFilterOptions,
  currentOption,
  currentCondition,
  isGroupable = true,
  groupPosition = 'none',
  isDropTarget,
  onDeleteCondition,
  onPointerDragStart,
  onPointerEnter,
  onPointerLeave,
  onDragOver,
  onDragLeave,
  onDrop,
  onConditionChanged,
}: {
  optionId: number
  options: FilterOption[]
  categories: FilterCategoryConfig[]
  selectedFilterOptions: ReadonlySet<FilterOptionConfig>
  currentOption?: FilterOption
  currentCondition?: AppliedFilterCondition
  isGroupable?: boolean
  groupPosition?: 'none' | 'first' | 'middle' | 'last' | 'only'
  isDropTarget?: boolean
  onDeleteCondition?: () => void
  onPointerDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void
  onDragLeave?: () => void
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void
  onConditionChanged?: (optionId: number, condition: AppliedFilterCondition) => void
}) => {
  const initialSelectedFilterOption =
    currentCondition?.filterOption ?? currentOption?.FilterOptionConfig
  const [selectedAttribute, setSelectedAttribute] = React.useState<FilterOption>(
    currentOption ?? EMPTY_FILTER_OPTION
  )
  const [filterConditions, setFilterConditions] = React.useState<
    CrmFilterConditionOption[] | undefined
  >()
  const [selectedFilterCondition, setSelectedFilterCondition] = React.useState<string | null>(null)
  const [cannotBeRemoved, setCannotBeRemoved] = React.useState<boolean>(true)
  const [isAttributeDisabled, setIsAttributeDisabled] = React.useState<boolean>(false)
  const [isDisabled, setIsDisabled] = React.useState<boolean>(false)
  const [selectedConditionValues, setSelectedConditionValues] = React.useState<ConditionValue[]>(
    () => [...(currentCondition?.values ?? initialSelectedFilterOption?.Default?.Values ?? [])]
  )
  const [selectedConditionDisplayValues, setSelectedConditionDisplayValues] = React.useState<
    string[] | undefined
  >(currentCondition?.displayValues)
  const lastConditionRef = React.useRef<AppliedFilterCondition | undefined>(undefined)
  const currentConditionRef = React.useRef<AppliedFilterCondition | undefined>(currentCondition)
  const hasInsetGroupDivider = groupPosition === 'first' || groupPosition === 'middle'

  const localization = useAppConfig().appConfig?.SearchSchema?.Localization
  const selectedFilterOption = selectedAttribute?.FilterOptionConfig
  const normalizeCategoryId = React.useCallback((value: string | undefined): string | undefined => {
    const normalized = value?.trim()
    return normalized ? normalized.toLowerCase() : undefined
  }, [])
  const categoryDisplayNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories) {
      const categoryId = normalizeCategoryId(category.Id)
      const displayName = category.DisplayName?.trim()
      if (categoryId && displayName && !map.has(categoryId)) {
        map.set(categoryId, displayName)
      }
    }
    return map
  }, [categories, normalizeCategoryId])
  const visibleOptions = React.useMemo(() => {
    const next: FilterOptionEntry[] = []
    const shownCategoryIds = new Set<string>()

    for (const option of options) {
      const config = option.FilterOptionConfig

      if (
        !config ||
        (selectedFilterOptions.has(config) && config !== selectedAttribute?.FilterOptionConfig)
      ) {
        continue
      }

      const categoryId = normalizeCategoryId(config.CategoryId)
      const categoryDisplayName = categoryId ? categoryDisplayNameById.get(categoryId) : undefined
      if (categoryId && categoryDisplayName && !shownCategoryIds.has(categoryId)) {
        next.push({
          kind: 'category',
          categoryId,
          displayName: categoryDisplayName,
        })
        shownCategoryIds.add(categoryId)
      }

      next.push({
        kind: 'option',
        option,
      })
    }

    return next
  }, [
    categoryDisplayNameById,
    normalizeCategoryId,
    options,
    selectedAttribute?.FilterOptionConfig,
    selectedFilterOptions,
  ])

  const compareFilterOption = React.useCallback(
    (left: FilterOptionEntry, right: FilterOptionEntry): boolean => {
      if (left.kind !== 'option' || right.kind !== 'option') {
        return false
      }

      return (
        left.option.FilterOptionConfig === right.option.FilterOptionConfig &&
        left.option.sourceIndex === right.option.sourceIndex
      )
    },
    []
  )
  const selectedAttributeEntry = React.useMemo<FilterOptionEntry>(() => {
    return {
      kind: 'option',
      option: selectedAttribute,
    }
  }, [selectedAttribute])

  React.useEffect(() => {
    currentConditionRef.current = currentCondition
  }, [currentCondition])

  React.useEffect(() => {
    const persistedCondition = currentConditionRef.current
    const selectedFilterOptionFromState =
      persistedCondition?.filterOption ?? currentOption?.FilterOptionConfig
    const selectedOptionFromList = options.find(
      (option) => option.FilterOptionConfig === selectedFilterOptionFromState
    )
    setSelectedAttribute(
      selectedOptionFromList ??
        (selectedFilterOptionFromState
          ? { FilterOptionConfig: selectedFilterOptionFromState }
          : EMPTY_FILTER_OPTION)
    )

    // Apply default values from config to the condition only for initialization,
    // after that the condition values will be controlled by user actions and config default values will be ignored
    setCannotBeRemoved(
      Boolean(
        selectedFilterOptionFromState?.Default?.IsDisabled ||
        selectedFilterOptionFromState?.Default?.CannotBeRemoved
      )
    )
    setIsAttributeDisabled(Boolean(selectedFilterOptionFromState?.Default?.IsAttributeDisabled))
    setIsDisabled(
      Boolean(persistedCondition?.isDisabled ?? selectedFilterOptionFromState?.Default?.IsDisabled)
    )

    const nextFilterConditions = getCrmFilterConditionsOptions(
      selectedFilterOptionFromState?.AttributeType,
      localization?.FilterConditionLabels,
      selectedFilterOptionFromState?.Selection?.Multiple
    )
    setFilterConditions(nextFilterConditions)

    const defaultCondition =
      persistedCondition?.condition ??
      selectedFilterOptionFromState?.Default?.Condition ??
      nextFilterConditions?.at(0)?.value ??
      'eq'
    setSelectedFilterCondition(defaultCondition)
    setSelectedConditionValues([
      ...(persistedCondition?.values ?? selectedFilterOptionFromState?.Default?.Values ?? []),
    ])
    setSelectedConditionDisplayValues(
      persistedCondition?.displayValues ? [...persistedCondition.displayValues] : undefined
    )
  }, [currentOption, localization?.FilterConditionLabels, options])

  const handleAttributeChanged = (value: FilterOptionEntry | null): void => {
    if (!value || value.kind !== 'option') {
      return
    }

    const filterOption = value.option?.FilterOptionConfig
    setSelectedAttribute(value.option ?? EMPTY_FILTER_OPTION)

    const options = getCrmFilterConditionsOptions(
      filterOption?.AttributeType,
      localization?.FilterConditionLabels,
      filterOption?.Selection?.Multiple
    )
    setFilterConditions(options)

    const defaultCondition = filterOption?.Default?.Condition ?? options?.at(0)?.value ?? 'eq'
    setSelectedFilterCondition(defaultCondition)
    setSelectedConditionValues(filterOption?.Default?.Values ?? [])
    setSelectedConditionDisplayValues(undefined)
  }

  const handleConditionOptionChanged = (value: string | null): void => {
    setSelectedFilterCondition(value)
    setSelectedConditionDisplayValues(undefined)
  }

  React.useEffect(() => {
    const nextCondition: AppliedFilterCondition = {
      filterOption: selectedAttribute?.FilterOptionConfig,
      condition: selectedFilterCondition,
      values: selectedConditionValues,
      displayValues: selectedConditionDisplayValues,
      isDisabled,
    }

    const previousCondition = lastConditionRef.current
    const previousDisplayValues = previousCondition?.displayValues ?? []
    const nextDisplayValues = nextCondition.displayValues ?? []
    if (
      previousCondition?.filterOption === nextCondition.filterOption &&
      previousCondition?.condition === nextCondition.condition &&
      previousCondition?.isDisabled === nextCondition.isDisabled &&
      previousCondition?.values.length === nextCondition.values.length &&
      previousCondition?.values.every((value, index) => value === nextCondition.values[index]) &&
      previousDisplayValues.length === nextDisplayValues.length &&
      previousDisplayValues.every((value, index) => value === nextDisplayValues[index])
    ) {
      return
    }

    lastConditionRef.current = nextCondition
    onConditionChanged?.(optionId, nextCondition)
  }, [
    isDisabled,
    optionId,
    onConditionChanged,
    selectedAttribute,
    selectedConditionDisplayValues,
    selectedConditionValues,
    selectedFilterCondition,
  ])

  return (
    <div
      className={clsx(
        'flex flex-row gap-4 py-4',
        groupPosition === 'none'
          ? 'border-b border-b-gray-300 rounded-sm'
          : 'border-x border-zinc-300 px-3',
        hasInsetGroupDivider
          ? 'relative after:absolute after:bottom-0 after:left-3 after:right-3 after:border-b after:border-zinc-300'
          : '',
        groupPosition === 'last' || groupPosition === 'only'
          ? 'border-b border-zinc-300 rounded-b-lg'
          : '',
        isDropTarget ? 'bg-teal-50' : ''
      )}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        onDrop?.(event)
      }}
    >
      <div className="w-8 grow-0">
        <div
          className={clsx(
            'flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-500 touch-none',
            isGroupable
              ? 'cursor-grab active:cursor-grabbing'
              : 'cursor-not-allowed !text-zinc-400 bg-zinc-100 !border-zinc-200'
          )}
          draggable={false}
          onPointerDown={(event) => {
            if (!isGroupable) {
              return
            }
            if (event.button !== 0) {
              return
            }
            event.preventDefault()
            onPointerDragStart?.(event)
          }}
          aria-label="Drag condition"
          title={
            isGroupable
              ? 'Drag condition to create or move group'
              : 'Grouping is disabled for this condition'
          }
          aria-disabled={!isGroupable}
        >
          <Bars3Icon className="size-4" />
        </div>
      </div>
      <div className="w-8 grow-0">
        <Button
          outline
          onClick={onDeleteCondition}
          aria-label="Delete condition"
          title="Delete condition"
          disabled={cannotBeRemoved}
        >
          <TrashIcon />
        </Button>
      </div>
      <div className="w-36 grow-3">
        <Combobox
          options={visibleOptions}
          by={compareFilterOption}
          displayValue={(option: FilterOptionEntry) =>
            option.kind === 'option' ? option.option?.FilterOptionConfig?.DisplayName : undefined
          }
          value={selectedAttributeEntry}
          disabled={isDisabled || isAttributeDisabled}
          onChange={handleAttributeChanged}
        >
          {(option) => {
            return option.kind === 'category' ? (
              <ComboboxOptionCategory className="bg-zinc-200/60 dark:text-white">
                {option.displayName}
              </ComboboxOptionCategory>
            ) : (
              <ComboboxOption value={option}>
                <ComboboxLabel>{option.option?.FilterOptionConfig?.DisplayName}</ComboboxLabel>
              </ComboboxOption>
            )
          }}
        </Combobox>
      </div>
      <div className="w-24 grow-2">
        {filterConditions && (
          <Listbox
            value={selectedFilterCondition}
            disabled={isDisabled}
            onChange={handleConditionOptionChanged}
          >
            {filterConditions.map((condition) => {
              return (
                <ListboxOption key={condition.value} value={condition.value}>
                  <ListboxLabel>{condition.displayName}</ListboxLabel>
                </ListboxOption>
              )
            })}
          </Listbox>
        )}
      </div>
      <div className="w-64 grow-8">
        <FilterItemValue
          filterOption={selectedFilterOption}
          selectedFilterCondition={selectedFilterCondition}
          values={selectedConditionValues}
          isDisabled={isDisabled}
          onConditionValuesChanged={(values, displayValues) => {
            setSelectedConditionValues(values)
            setSelectedConditionDisplayValues(displayValues)
          }}
        />
      </div>
    </div>
  )
}
