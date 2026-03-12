import * as React from 'react'
import { Combobox, ComboboxLabel, ComboboxOption } from '@/components/catalyst/combobox'
import { SearchCombobox } from '@/components/controls/search-combobox'
import { Listbox, ListboxLabel, ListboxOption } from '@/components/catalyst/listbox'
import { Input } from '@/components/catalyst/input'
import { FilterOptionConfig } from '@/libs/types/app-config.types'
import { ConditionValue } from '@/libs/types/filter.types'
import {
  ConditionValueOption,
  areSameValues,
  dateAttributeTypes,
  isNoValueCondition,
  mergeCachedAndFetchedOptions,
  numberAttributeTypes,
  sanitizeSelectableValues,
} from './filter-item-value.helpers'
import { useSelectableOptions } from './use-selectable-options'

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
  }, [selectableOptions, isOnDemandSearch])

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
  }, [selectedSelectionValues, isOnDemandSearch])
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
      if (isMultiSelection) {
        return (
          <div>
            <SearchCombobox
              multiple
              options={onDemandSearchOptions}
              isLoading={isSelectableOptionsLoading}
              searchDelay={selection!.SearchDelay!}
              minCharacters={selection?.MinCharacters}
              placeholder="Search values"
              displayValue={(option) => option.displayName}
              value={selectedSelectionValues}
              disabled={isDisabled}
              onSearch={handleLookupSearch}
              onChange={handleMultiSelectionValueChanged}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>{option.displayName}</ComboboxLabel>
                </ComboboxOption>
              )}
            </SearchCombobox>
          </div>
        )
      }

      return (
        <SearchCombobox
          options={onDemandSearchOptions}
          isLoading={isSelectableOptionsLoading}
          searchDelay={selection!.SearchDelay!}
          minCharacters={selection?.MinCharacters}
          placeholder="Search value"
          displayValue={(option) => option?.displayName}
          value={selectedSingleLookupValue}
          disabled={isDisabled}
          onSearch={handleLookupSearch}
          onChange={handleSingleLookupValueChanged}
        >
          {(option) => (
            <ComboboxOption value={option}>
              <ComboboxLabel>{option.displayName}</ComboboxLabel>
            </ComboboxOption>
          )}
        </SearchCombobox>
      )
    }

    if (isSelectableOptionsLoading) {
      return (
        <Input
          disabled
          type="text"
          value="Loading values..."
          onChange={handleConditionValueChanged}
        />
      )
    }

    if (selectableOptionsErrorMessage) {
      return (
        <Input
          disabled
          type="text"
          value={selectableOptionsErrorMessage}
          onChange={handleConditionValueChanged}
        />
      )
    }

    if (selectableOptions.length > 0) {
      if (isMultiSelection) {
        return (
          <div>
            <Combobox
              multiple
              options={selectableOptions}
              placeholder="Select values"
              displayValue={(option) => option.displayName}
              displayInputValue={(values) => values.map((option) => option.displayName).join(', ')}
              value={selectedSelectionValues}
              disabled={isDisabled}
              onChange={handleMultiSelectionValueChanged}
            >
              {(option) => (
                <ComboboxOption value={option}>
                  <ComboboxLabel>{option.displayName}</ComboboxLabel>
                </ComboboxOption>
              )}
            </Combobox>
          </div>
        )
      }

      if (isLookupAttribute) {
        return (
          <Combobox
            options={selectableOptions}
            placeholder="Select value"
            displayValue={(option) => option?.displayName}
            value={selectedSingleLookupValue}
            disabled={isDisabled}
            onChange={handleSingleLookupValueChanged}
          >
            {(option) => (
              <ComboboxOption value={option}>
                <ComboboxLabel>{option.displayName}</ComboboxLabel>
              </ComboboxOption>
            )}
          </Combobox>
        )
      }

      if (
        isPicklistAttribute &&
        (normalizedSelectedFilterCondition === 'in' ||
          normalizedSelectedFilterCondition === 'not-in')
      ) {
        return (
          <Input
            type="text"
            placeholder="Use comma separated values"
            value={selectedConditionValue.toString()}
            disabled={isDisabled}
            onChange={handleConditionValueChanged}
          />
        )
      }

      return (
        <Listbox
          placeholder="Select value"
          value={selectedConditionValue === '' ? null : selectedConditionValue}
          disabled={isDisabled}
          onChange={handleSelectionValueChanged}
        >
          {selectableOptions.map((option) => {
            return (
              <ListboxOption key={option.value} value={option.value}>
                <ListboxLabel>{option.displayName}</ListboxLabel>
              </ListboxOption>
            )
          })}
        </Listbox>
      )
    }
  }

  if (selectedAttributeType === 'Boolean') {
    return (
      <Listbox
        value={selectedConditionValue === '' ? null : selectedConditionValue}
        disabled={isDisabled}
        onChange={handleSelectionValueChanged}
      >
        <ListboxOption value="true">
          <ListboxLabel>True</ListboxLabel>
        </ListboxOption>
        <ListboxOption value="false">
          <ListboxLabel>False</ListboxLabel>
        </ListboxOption>
      </Listbox>
    )
  }

  if (
    numberAttributeTypes.has(selectedAttributeType ?? '') &&
    normalizedSelectedFilterCondition !== 'in' &&
    normalizedSelectedFilterCondition !== 'not-in'
  ) {
    return (
      <Input
        type="number"
        value={selectedConditionValue.toString()}
        disabled={isDisabled}
        onChange={handleConditionValueChanged}
      />
    )
  }

  if (dateAttributeTypes.has(selectedAttributeType ?? '')) {
    return (
      <Input
        type="date"
        disabled={isDisabled}
        value={selectedConditionValue.toString()}
        onChange={handleConditionValueChanged}
      />
    )
  }

  return (
    <Input
      type="text"
      placeholder={
        normalizedSelectedFilterCondition === 'in' || normalizedSelectedFilterCondition === 'not-in'
          ? 'Use comma separated values'
          : 'Value'
      }
      value={selectedConditionValue.toString()}
      disabled={isDisabled}
      onChange={handleConditionValueChanged}
    />
  )
}
