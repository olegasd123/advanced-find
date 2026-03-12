import * as React from 'react'
import { FilterOptionConfig } from '@/libs/types/app-config.types'
import { ConditionValue } from '@/libs/types/filter.types'
import {
  ConditionValueOption,
  areSameValues,
  isNoValueCondition,
  mergeCachedAndFetchedOptions,
  sanitizeSelectableValues,
} from './filter-item-value.helpers'
import { useSelectableOptions } from './use-selectable-options'
import { OnDemandSearchValue, SelectableValue, ScalarValue } from './filter-item-value-inputs'

export const FilterItemValue = ({
  filterOption,
  selectedFilterCondition,
  values,
  isDisabled,
  onConditionValuesChanged,
}: {
  filterOption?: FilterOptionConfig
  selectedFilterCondition?: string | null
  values?: ConditionValue[]
  isDisabled?: boolean
  onConditionValuesChanged?: (values: ConditionValue[], displayValues?: string[]) => void
}) => {
  const [conditionValues, setConditionValues] = React.useState<ConditionValue[]>([])

  const selectedAttributeType = filterOption?.AttributeType
  const normalizedSelectedFilterCondition = selectedFilterCondition ?? null
  const selection = filterOption?.Selection
  const selectionMinItems = Math.max(0, selection?.MinItems ?? 0)
  const selectionMaxItems =
    selection?.MaxItems && selection.MaxItems > 0 ? selection.MaxItems : undefined
  const isPicklistAttribute = selectedAttributeType === 'Picklist'
  const isLookupAttribute = selectedAttributeType === 'Lookup'
  const isSelectableAttribute = isPicklistAttribute || isLookupAttribute
  const isMultiSelection = isSelectableAttribute && Boolean(selection?.Multiple)
  const isOnDemandSearch =
    isLookupAttribute && selection?.SearchDelay !== undefined && selection.SearchDelay > 0

  const {
    selectableOptions,
    isSelectableOptionsLoading,
    selectableOptionsErrorMessage,
    selectedOptionsCacheRef,
    handleLookupSearch,
  } = useSelectableOptions(filterOption, values, setConditionValues)

  React.useEffect(() => {
    if (isNoValueCondition(normalizedSelectedFilterCondition)) {
      setConditionValues((previousValues) => (previousValues.length === 0 ? previousValues : []))
      return
    }

    if (!isSelectableAttribute) {
      return
    }

    const optionsForSanitization = isOnDemandSearch
      ? mergeCachedAndFetchedOptions(selectedOptionsCacheRef.current, selectableOptions)
      : selectableOptions

    setConditionValues((previousValues) => {
      const sanitizedValues = sanitizeSelectableValues(
        previousValues,
        optionsForSanitization,
        selectionMaxItems
      )
      const nextValues = isMultiSelection ? sanitizedValues : sanitizedValues.slice(0, 1)
      return areSameValues(previousValues, nextValues) ? previousValues : nextValues
    })
  }, [
    isMultiSelection,
    isSelectableAttribute,
    isOnDemandSearch,
    selectableOptions,
    selectionMaxItems,
    selectedOptionsCacheRef,
    normalizedSelectedFilterCondition,
  ])

  const handleConditionValueChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setConditionValues([event.target.value])
  }

  const handleSelectionValueChanged = (value: ConditionValueOption['value'] | null): void => {
    if (value === null) {
      setConditionValues([])
      return
    }

    setConditionValues([value])
  }

  const handleSingleLookupValueChanged = (value: ConditionValueOption | null): void => {
    if (!value) {
      setConditionValues([])
      return
    }

    setConditionValues([value.value])
  }

  const handleMultiSelectionValueChanged = (values: ConditionValueOption[]): void => {
    const nextValues = values.map((value) => value.value)

    setConditionValues((previousValues) => {
      if (nextValues.length < selectionMinItems) {
        return previousValues
      }

      if (!selectionMaxItems || nextValues.length <= selectionMaxItems) {
        return nextValues
      }

      const previousValuesSet = new Set(previousValues)
      const addedValues = nextValues.filter((value) => !previousValuesSet.has(value))

      if (addedValues.length === 0) {
        return nextValues.slice(nextValues.length - selectionMaxItems)
      }

      const nextLimitedValues = [...previousValues]
      const nextValuesSet = new Set(nextValues)

      for (const addedValue of addedValues) {
        while (nextLimitedValues.length >= selectionMaxItems) {
          nextLimitedValues.shift()
        }
        if (!nextLimitedValues.includes(addedValue) && nextValuesSet.has(addedValue)) {
          nextLimitedValues.push(addedValue)
        }
      }

      return nextLimitedValues.filter((value) => nextValuesSet.has(value))
    })
  }

  const selectedConditionValue = conditionValues.at(0) ?? ''

  const onDemandSearchOptions = React.useMemo((): ConditionValueOption[] => {
    if (!isOnDemandSearch) {
      return selectableOptions
    }

    return mergeCachedAndFetchedOptions(selectedOptionsCacheRef.current, selectableOptions)
  }, [selectableOptions, isOnDemandSearch, selectedOptionsCacheRef])

  const effectiveOptions = isOnDemandSearch ? onDemandSearchOptions : selectableOptions

  const selectedSelectionValues = effectiveOptions.filter((option) =>
    conditionValues.includes(option.value)
  )
  const selectedSingleLookupValue = selectedSelectionValues.at(0) ?? null

  React.useEffect(() => {
    if (!isOnDemandSearch) {
      return
    }
    for (const option of selectedSelectionValues) {
      selectedOptionsCacheRef.current.set(String(option.value), option)
    }
  }, [selectedSelectionValues, isOnDemandSearch, selectedOptionsCacheRef])
  const conditionDisplayValues = React.useMemo((): string[] | undefined => {
    if (conditionValues.length === 0) {
      return undefined
    }

    if (selectedAttributeType === 'Boolean') {
      return conditionValues.map((value) => {
        const normalizedValue = String(value).trim().toLowerCase()
        if (normalizedValue === 'true' || normalizedValue === '1') {
          return 'True'
        }
        if (normalizedValue === 'false' || normalizedValue === '0') {
          return 'False'
        }
        return String(value)
      })
    }

    if (!isSelectableAttribute) {
      return undefined
    }

    if (
      isPicklistAttribute &&
      (normalizedSelectedFilterCondition === 'in' || normalizedSelectedFilterCondition === 'not-in')
    ) {
      return undefined
    }

    const displayNameByValue = new Map(
      effectiveOptions.map((option) => [String(option.value), option.displayName])
    )

    return conditionValues.map((value) => displayNameByValue.get(String(value)) ?? String(value))
  }, [
    conditionValues,
    isPicklistAttribute,
    isSelectableAttribute,
    normalizedSelectedFilterCondition,
    effectiveOptions,
    selectedAttributeType,
  ])

  React.useEffect(() => {
    onConditionValuesChanged?.(conditionValues, conditionDisplayValues)
  }, [conditionDisplayValues, conditionValues, onConditionValuesChanged])

  if (isNoValueCondition(normalizedSelectedFilterCondition)) {
    return <span>&nbsp;</span>
  }

  if (isSelectableAttribute) {
    if (isOnDemandSearch) {
      return (
        <OnDemandSearchValue
          options={onDemandSearchOptions}
          isLoading={isSelectableOptionsLoading}
          searchDelay={selection!.SearchDelay!}
          minCharacters={selection?.MinCharacters}
          isMultiSelection={isMultiSelection}
          selectedValues={selectedSelectionValues}
          selectedSingleValue={selectedSingleLookupValue}
          isDisabled={isDisabled}
          onSearch={handleLookupSearch}
          onMultiChange={handleMultiSelectionValueChanged}
          onSingleChange={handleSingleLookupValueChanged}
        />
      )
    }

    if (
      isSelectableOptionsLoading ||
      selectableOptionsErrorMessage ||
      selectableOptions.length > 0
    ) {
      return (
        <SelectableValue
          options={selectableOptions}
          isLoading={isSelectableOptionsLoading}
          errorMessage={selectableOptionsErrorMessage}
          isMultiSelection={isMultiSelection}
          isLookupAttribute={isLookupAttribute}
          isPicklistAttribute={isPicklistAttribute}
          condition={normalizedSelectedFilterCondition}
          selectedValues={selectedSelectionValues}
          selectedSingleValue={selectedSingleLookupValue}
          selectedConditionValue={selectedConditionValue}
          isDisabled={isDisabled}
          onMultiChange={handleMultiSelectionValueChanged}
          onSingleChange={handleSingleLookupValueChanged}
          onSelectionChange={handleSelectionValueChanged}
          onInputChange={handleConditionValueChanged}
        />
      )
    }
  }

  return (
    <ScalarValue
      attributeType={selectedAttributeType}
      condition={normalizedSelectedFilterCondition}
      value={selectedConditionValue}
      isDisabled={isDisabled}
      onInputChange={handleConditionValueChanged}
      onSelectionChange={handleSelectionValueChanged}
    />
  )
}
