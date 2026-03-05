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
} from '../../libs/utils/crm/filter'
import { AppliedFilterCondition, ConditionValue } from '../../libs/utils/crm/crm-search'
import { FilterOptionConfig } from '../../libs/config/app-config'
import clsx from 'clsx'

const EMPTY_FILTER_OPTION: FilterOption = {}

export const FilterItem = ({
  optionId,
  options,
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
  const initialSelectedFilterOption = getTargetFilterOption(
    currentCondition?.filterOption ?? currentOption?.FilterOptionConfig
  )
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

  const localization = useAppConfiguration().appConfig?.SearchScheme?.Localization
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
        left.FilterOptionConfig === right.FilterOptionConfig &&
        left.sourceIndex === right.sourceIndex
      )
    },
    []
  )

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

    const targetFilterOption = getTargetFilterOption(selectedFilterOptionFromState)
    // Apply default values from config to the condition only for initialization,
    // after that the condition values will be controlled by user actions and config default values will be ignored
    setCannotBeRemoved(
      Boolean(
        targetFilterOption?.Default?.IsDisabled || targetFilterOption?.Default?.CannotBeRemoved
      )
    )
    setIsAttributeDisabled(Boolean(targetFilterOption?.Default?.IsAttributeDisabled))
    setIsDisabled(
      Boolean(persistedCondition?.isDisabled ?? targetFilterOption?.Default?.IsDisabled)
    )

    const nextFilterConditions = getCrmFilterConditionsOptions(
      targetFilterOption?.AttributeType,
      localization?.CrmFilterConditions,
      targetFilterOption?.Selection?.Multiple
    )
    setFilterConditions(nextFilterConditions)

    const defaultCondition =
      persistedCondition?.condition ??
      targetFilterOption?.Default?.Condition ??
      nextFilterConditions?.at(0)?.value ??
      'eq'
    setSelectedFilterCondition(defaultCondition)
    setSelectedConditionValues([
      ...(persistedCondition?.values ?? targetFilterOption?.Default?.Values ?? []),
    ])
    setSelectedConditionDisplayValues(
      persistedCondition?.displayValues ? [...persistedCondition.displayValues] : undefined
    )
  }, [currentOption, localization?.CrmFilterConditions, options])

  const handleAttributeChanged = (value: FilterOption | null): void => {
    const targetFilterOptionValue = getTargetFilterOption(value?.FilterOptionConfig)
    setSelectedAttribute(value ?? EMPTY_FILTER_OPTION)

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
          displayValue={(option: FilterOption) =>
            getTargetFilterOption(option?.FilterOptionConfig)?.DisplayName
          }
          value={selectedAttribute}
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
