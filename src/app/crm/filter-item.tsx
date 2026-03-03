import * as React from 'react'
import { Button } from '../../../vendor/catalyst-ui-kit/typescript/button'
import { Bars3Icon, TrashIcon } from '@heroicons/react/16/solid'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/controls/combobox'
import {
  Listbox,
  ListboxLabel,
  ListboxOption,
} from '../../../vendor/catalyst-ui-kit/typescript/listbox'
import { ComboboxOptionCategory } from '../../components/controls/combobox-option-category'
import { FilterOption } from './filter-grid'
import { FilterItemValue } from './filter-item-value'
import { useAppConfiguration } from '../../hooks/use-app-config'
import {
  CrmFilterConditionOption,
  getCrmFilterConditionsOptions,
  getTargetFilterOption,
} from '../../libs/utils/filter'
import { AppliedFilterCondition, ConditionValue } from '../../libs/utils/crm-search'
import { FilterOptionConfig } from '../../libs/config/app-config'
import clsx from 'clsx'

export const FilterItem = ({
  optionId,
  options,
  selectedFilterOptions,
  currentOption,
  groupPosition = 'none',
  isDropTarget,
  onDeleteCondition,
  onPointerDragStart,
  onPointerEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onConditionChanged,
}: {
  optionId: number
  options: FilterOption[]
  selectedFilterOptions: ReadonlySet<FilterOptionConfig>
  currentOption?: FilterOption
  groupPosition?: 'none' | 'first' | 'middle' | 'last' | 'only'
  isDropTarget?: boolean
  onDeleteCondition?: () => void
  onPointerDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerEnter?: () => void
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void
  onDragLeave?: () => void
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void
  onConditionChanged?: (optionId: number, condition: AppliedFilterCondition) => void
}) => {
  const [selectedAttribute, setSelectedAttribute] = React.useState<FilterOption | undefined>(
    currentOption
  )
  const [filterConditions, setFilterConditions] = React.useState<
    CrmFilterConditionOption[] | undefined
  >()
  const [selectedFilterCondition, setSelectedFilterCondition] = React.useState<string | null>(null)
  const [cannotBeRemoved, setCannotBeRemoved] = React.useState<boolean | undefined>(true)
  const [isAttributeDisabled, setIsAttributeDisabled] = React.useState<boolean | undefined>(false)
  const [isDisabled, setIsDisabled] = React.useState<boolean | undefined>(false)
  const [selectedConditionValues, setSelectedConditionValues] = React.useState<ConditionValue[]>([])
  const lastConditionRef = React.useRef<AppliedFilterCondition | undefined>(undefined)

  const localization = useAppConfiguration()?.SearchScheme?.Localization
  const selectedFilterOption = getTargetFilterOption(selectedAttribute?.FilterOptionConfig)
  const visibleOptions = React.useMemo(() => {
    const next: FilterOption[] = []
    let pendingCategory: FilterOption | undefined

    for (const option of options) {
      const config = option.FilterOptionConfig
      const categoryDisplayName = config?.CategoryDisplayName?.trim()
      const isCategory = typeof config?.CategoryDisplayName === 'string'

      if (isCategory) {
        pendingCategory = categoryDisplayName ? option : undefined
        continue
      }

      if (
        !config ||
        (selectedFilterOptions.has(config) && config !== selectedAttribute?.FilterOptionConfig)
      ) {
        continue
      }

      if (pendingCategory) {
        next.push(pendingCategory)
        pendingCategory = undefined
      }

      next.push(option)
    }

    return next
  }, [options, selectedAttribute?.FilterOptionConfig, selectedFilterOptions])

  const compareFilterOption = React.useCallback(
    (left: FilterOption, right: FilterOption): boolean => {
      return (
        left.FilterOptionConfig === right.FilterOptionConfig && left.sourceIndex === right.sourceIndex
      )
    },
    []
  )

  React.useEffect(() => {
    setSelectedAttribute(currentOption ?? undefined)

    const targetFilterOption = getTargetFilterOption(currentOption?.FilterOptionConfig)
    // Apply default values from config to the condition only for initialization,
    // after that the condition values will be controlled by user actions and config default values will be ignored
    setCannotBeRemoved(
      targetFilterOption?.Default?.IsDisabled || targetFilterOption?.Default?.CannotBeRemoved
    )
    setIsAttributeDisabled(targetFilterOption?.Default?.IsAttributeDisabled)
    setIsDisabled(targetFilterOption?.Default?.IsDisabled)

    const options = getCrmFilterConditionsOptions(
      targetFilterOption?.AttributeType,
      localization?.CrmFilterConditions,
      targetFilterOption?.Selection?.Multiple
    )
    setFilterConditions(options)

    const defaultCondition = targetFilterOption?.Default?.Condition ?? options?.at(0)?.value ?? 'eq'
    setSelectedFilterCondition(defaultCondition)
    setSelectedConditionValues(targetFilterOption?.Default?.Values ?? [])
  }, [currentOption, localization?.CrmFilterConditions])

  const handleAttributeChanged = (value: FilterOption | null): void => {
    const targetFilterOptionValue = getTargetFilterOption(value?.FilterOptionConfig)
    setSelectedAttribute(value ?? undefined)

    const options = getCrmFilterConditionsOptions(
      targetFilterOptionValue?.AttributeType,
      localization?.CrmFilterConditions,
      targetFilterOptionValue?.Selection?.Multiple
    )
    setFilterConditions(options)

    const defaultCondition =
      targetFilterOptionValue?.Default?.Condition ?? options?.at(0)?.value ?? 'eq'
    setSelectedFilterCondition(defaultCondition)
    setSelectedConditionValues(targetFilterOptionValue?.Default?.Values ?? [])
  }

  const handleConditionOptionChanged = (value: string | null): void => {
    setSelectedFilterCondition(value)
  }

  React.useEffect(() => {
    const nextCondition: AppliedFilterCondition = {
      filterOption: selectedAttribute?.FilterOptionConfig,
      condition: selectedFilterCondition,
      values: selectedConditionValues,
      isDisabled,
    }

    const previousCondition = lastConditionRef.current
    if (
      previousCondition?.filterOption === nextCondition.filterOption &&
      previousCondition?.condition === nextCondition.condition &&
      previousCondition?.isDisabled === nextCondition.isDisabled &&
      previousCondition?.values.length === nextCondition.values.length &&
      previousCondition?.values.every((value, index) => value === nextCondition.values[index])
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
    selectedConditionValues,
    selectedFilterCondition,
  ])

  return (
    <div
      className={clsx(
        'flex flex-row gap-4 py-4 border-b border-b-gray-300',
        groupPosition === 'none' ? 'rounded-sm' : 'border-x border-zinc-300 px-3',
        groupPosition === 'last' || groupPosition === 'only' ? 'rounded-b-lg' : '',
        isDropTarget ? 'bg-teal-50' : ''
      )}
      onPointerEnter={onPointerEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        onDrop?.(event)
      }}
    >
      <div className="w-8 grow-0">
        <div
          className="flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-500 cursor-grab active:cursor-grabbing touch-none"
          draggable={false}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return
            }
            event.preventDefault()
            onPointerDragStart?.(event)
          }}
          aria-label="Drag condition"
          title="Drag condition to create or move group"
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
          displayValue={(option: FilterOption) =>
            getTargetFilterOption(option?.FilterOptionConfig)?.DisplayName
          }
          value={selectedAttribute ?? undefined}
          disabled={isDisabled || isAttributeDisabled}
          onChange={handleAttributeChanged}
        >
          {(option) => {
            const categoryDisplayName = option?.FilterOptionConfig?.CategoryDisplayName?.trim()

            return categoryDisplayName ? (
              <ComboboxOptionCategory className="bg-zinc-200/60 dark:text-white">
                {categoryDisplayName}
              </ComboboxOptionCategory>
            ) : (
              <ComboboxOption value={option}>
                <ComboboxLabel>
                  {getTargetFilterOption(option?.FilterOptionConfig)?.DisplayName}
                </ComboboxLabel>
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
          isDisabled={isDisabled}
          onConditionValuesChanged={setSelectedConditionValues}
        />
      </div>
    </div>
  )
}
