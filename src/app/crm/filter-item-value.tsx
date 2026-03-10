import * as React from 'react'
import { Combobox, ComboboxLabel, ComboboxOption } from '@/components/catalyst/combobox'
import { SearchCombobox } from '@/components/controls/search-combobox'
import { Listbox, ListboxLabel, ListboxOption } from '@/components/catalyst/listbox'
import { Input } from '@/components/catalyst/input'
import { FilterOptionConfig } from '@/libs/types/app-config.types'
import { useCrmRepository } from '@/hooks/use-crm-repository'
import { createErrorReporter } from '@/libs/utils/error-reporter'
import { buildLookupSearchFilter } from '@/libs/utils/crm/odata-lookup-search'
import { ConditionValue } from '@/libs/types/filter.types'

interface ConditionValueOption {
  value: string | number
  displayName: string
}

const errorReporter = createErrorReporter('FilterItemValue')

const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])

const numberAttributeTypes = new Set(['Number', 'Integer', 'BigInt', 'Decimal', 'Double', 'Money'])

const dateAttributeTypes = new Set(['DateTime'])

const isNoValueCondition = (condition: string | null | undefined): boolean => {
  if (!condition) {
    return false
  }

  return noValueConditions.has(condition)
}

const sanitizeSelectableValues = (
  values: ConditionValue[],
  options: ConditionValueOption[],
  maxItems?: number
): ConditionValue[] => {
  const optionValueByKey = new Map<string, ConditionValue>()
  for (const option of options) {
    const key = String(option.value)
    if (!optionValueByKey.has(key)) {
      optionValueByKey.set(key, option.value)
    }
  }

  const uniqueValues: ConditionValue[] = []
  for (const value of values) {
    const normalizedValue = optionValueByKey.get(String(value))
    if (normalizedValue !== undefined && !uniqueValues.includes(normalizedValue)) {
      uniqueValues.push(normalizedValue)
    }
  }

  const safeMaxItems = maxItems && maxItems > 0 ? maxItems : undefined
  if (safeMaxItems && uniqueValues.length > safeMaxItems) {
    uniqueValues.length = safeMaxItems
  }

  return uniqueValues
}

const formatLookupDisplayValue = (
  item: Record<string, unknown>,
  attributeNames: string[],
  format: string | undefined,
  fallbackValue: string
): string => {
  const values = attributeNames.map((attributeName) => {
    const value = item[attributeName]
    return value === undefined || value === null ? '' : String(value).trim()
  })

  if (format) {
    const formattedValue = format.replace(/\{(\d+)\}/g, (_, indexValue: string) => {
      const index = Number(indexValue)
      if (!Number.isFinite(index)) {
        return ''
      }
      return values[index] ?? ''
    })

    const trimmedFormattedValue = formattedValue.replace(/\s+/g, ' ').trim()
    if (trimmedFormattedValue.length > 0) {
      return trimmedFormattedValue
    }
  }

  const joinedValue = values.filter((value) => value.length > 0).join(' ')
  return joinedValue.length > 0 ? joinedValue : fallbackValue
}

const normalizeEntityItems = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[]
  }

  if (
    data &&
    typeof data === 'object' &&
    'value' in data &&
    Array.isArray((data as { value?: unknown }).value)
  ) {
    return (data as { value: Record<string, unknown>[] }).value
  }

  return []
}

const areSameValues = (left: ConditionValue[], right: ConditionValue[]): boolean => {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

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
  const [selectableOptions, setSelectableOptions] = React.useState<ConditionValueOption[]>([])
  const [isSelectableOptionsLoading, setIsSelectableOptionsLoading] = React.useState(false)
  const [selectableOptionsErrorMessage, setSelectableOptionsErrorMessage] = React.useState<
    string | undefined
  >()

  const crmRepository = useCrmRepository()
  const selectableOptionsRequestId = React.useRef(0)
  const valuesRef = React.useRef<ConditionValue[] | undefined>(values)

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

  const lookupMetadataRef = React.useRef<{
    entityCollectionName: string
    idAttributeName: string
    lookupAttributeNames: string[]
    allAttributeNames: string[]
  } | null>(null)
  const selectedOptionsCacheRef = React.useRef<Map<string, ConditionValueOption>>(new Map())

  React.useEffect(() => {
    valuesRef.current = values
  }, [values])

  const loadSelectableOptions = React.useCallback(
    async (
      targetFilterOption: FilterOptionConfig | undefined,
      condition: string | null | undefined,
      defaultValues: ConditionValue[]
    ): Promise<void> => {
      const requestId = ++selectableOptionsRequestId.current

      if (
        (targetFilterOption?.AttributeType !== 'Picklist' &&
          targetFilterOption?.AttributeType !== 'Lookup') ||
        !targetFilterOption?.EntityName ||
        !targetFilterOption?.AttributeName
      ) {
        setSelectableOptions([])
        setIsSelectableOptionsLoading(false)
        setSelectableOptionsErrorMessage(undefined)
        return
      }

      setIsSelectableOptionsLoading(true)
      setSelectableOptionsErrorMessage(undefined)
      try {
        let options: ConditionValueOption[] = []

        if (targetFilterOption.AttributeType === 'Picklist') {
          const metadata = await crmRepository?.getPicklistAttributeMetadata(
            targetFilterOption.EntityName,
            targetFilterOption.AttributeName
          )
          options =
            metadata?.OptionSet?.Options?.map((option) => {
              const value = option.Value
              const displayName = option.Label.UserLocalizedLabel?.Label ?? value.toString()
              return { value, displayName }
            }) ?? []
        }

        if (
          targetFilterOption.AttributeType === 'Lookup' &&
          targetFilterOption.Selection?.SearchDelay !== undefined &&
          targetFilterOption.Selection.SearchDelay > 0
        ) {
          if (requestId !== selectableOptionsRequestId.current) {
            return
          }
          setSelectableOptions([])
          setIsSelectableOptionsLoading(false)
          setSelectableOptionsErrorMessage(undefined)
          return
        }

        if (targetFilterOption.AttributeType === 'Lookup') {
          const lookupMetadata = await crmRepository?.getLookupAttributeMetadata(
            targetFilterOption.EntityName,
            targetFilterOption.AttributeName
          )
          const targetEntityLogicalName = lookupMetadata?.Targets?.at(0)

          if (targetEntityLogicalName) {
            const entitiesMetadata = await crmRepository?.getEntitiesMetadata([
              targetEntityLogicalName,
            ])
            const entityMetadata = entitiesMetadata?.at(0)
            const entityCollectionName =
              entityMetadata?.EntitySetName ?? entityMetadata?.LogicalCollectionName

            if (entityCollectionName) {
              const idAttributeName = `${targetEntityLogicalName}id`
              const lookupAttributeNames = targetFilterOption.Lookup?.AttributeNames ?? []
              const attributeNames = [...new Set([idAttributeName, ...lookupAttributeNames])]
              const entitiesResponse = await crmRepository?.getEntities(
                entityCollectionName,
                attributeNames
              )
              const entities = normalizeEntityItems(entitiesResponse)
              options = entities
                .map((item): ConditionValueOption | null => {
                  const rawId = item[idAttributeName]
                  if (rawId === undefined || rawId === null) {
                    return null
                  }
                  const value = String(rawId)
                  const displayName = formatLookupDisplayValue(
                    item,
                    lookupAttributeNames,
                    targetFilterOption.Lookup?.AttributeFormat,
                    value
                  )
                  return { value, displayName }
                })
                .filter((option): option is ConditionValueOption => option !== null)
            }
          }
        }

        if (requestId !== selectableOptionsRequestId.current) {
          return
        }

        setSelectableOptions(options)

        const targetSelection = targetFilterOption?.Selection
        const targetMaxItems =
          targetSelection?.MaxItems && targetSelection.MaxItems > 0
            ? targetSelection.MaxItems
            : undefined
        const isTargetMultiSelection = Boolean(targetSelection?.Multiple)
        const sanitizedDefaultValues = sanitizeSelectableValues(
          defaultValues,
          options,
          targetMaxItems
        )

        if (isNoValueCondition(condition)) {
          setConditionValues([])
          return
        }

        if (isTargetMultiSelection) {
          setConditionValues(sanitizedDefaultValues)
          return
        }

        setConditionValues(sanitizedDefaultValues.slice(0, 1))
      } catch (error) {
        if (requestId !== selectableOptionsRequestId.current) {
          return
        }
        const userMessage = errorReporter.reportAsyncError({
          location: 'load selectable values',
          error,
          userMessage: 'Failed to load selectable values.',
          context: {
            entityName: targetFilterOption.EntityName,
            attributeName: targetFilterOption.AttributeName,
          },
        })
        setSelectableOptionsErrorMessage(userMessage)
        setSelectableOptions([])
      } finally {
        if (requestId === selectableOptionsRequestId.current) {
          setIsSelectableOptionsLoading(false)
        }
      }
    },
    [crmRepository]
  )

  React.useEffect(() => {
    if (!filterOption) {
      setConditionValues([])
      setSelectableOptions([])
      setIsSelectableOptionsLoading(false)
      setSelectableOptionsErrorMessage(undefined)
      return
    }

    const defaultValues = valuesRef.current ?? filterOption.Default?.Values ?? []
    setConditionValues(defaultValues)
    void loadSelectableOptions(filterOption, filterOption.Default?.Condition, defaultValues)
  }, [filterOption, loadSelectableOptions])

  const handleLookupSearch = React.useCallback(
    async (query: string): Promise<void> => {
      if (!filterOption || filterOption.AttributeType !== 'Lookup') {
        return
      }

      const requestId = ++selectableOptionsRequestId.current
      setIsSelectableOptionsLoading(true)
      setSelectableOptionsErrorMessage(undefined)

      try {
        let meta = lookupMetadataRef.current
        if (!meta) {
          const lookupMd = await crmRepository?.getLookupAttributeMetadata(
            filterOption.EntityName!,
            filterOption.AttributeName!
          )
          const targetEntity = lookupMd?.Targets?.at(0)
          if (!targetEntity) {
            throw new Error('No lookup target entity')
          }

          const entitiesMd = await crmRepository?.getEntitiesMetadata([targetEntity])
          const entityMd = entitiesMd?.at(0)
          const collectionName = entityMd?.EntitySetName ?? entityMd?.LogicalCollectionName
          if (!collectionName) {
            throw new Error('No entity collection name')
          }

          const idAttr = `${targetEntity}id`
          const lookupAttrs = filterOption.Lookup?.AttributeNames ?? []

          meta = {
            entityCollectionName: collectionName,
            idAttributeName: idAttr,
            lookupAttributeNames: lookupAttrs,
            allAttributeNames: [...new Set([idAttr, ...lookupAttrs])],
          }
          lookupMetadataRef.current = meta
        }

        const odataFilter = buildLookupSearchFilter(meta.lookupAttributeNames, query)
        const response = await crmRepository?.getEntities(
          meta.entityCollectionName,
          meta.allAttributeNames,
          odataFilter ? { filter: odataFilter } : undefined
        )

        if (requestId !== selectableOptionsRequestId.current) {
          return
        }

        const entities = normalizeEntityItems(response)
        const options = entities
          .map((item): ConditionValueOption | null => {
            const rawId = item[meta!.idAttributeName]
            if (rawId === undefined || rawId === null) {
              return null
            }
            const value = String(rawId)
            const displayName = formatLookupDisplayValue(
              item,
              meta!.lookupAttributeNames,
              filterOption.Lookup?.AttributeFormat,
              value
            )
            return { value, displayName }
          })
          .filter((option): option is ConditionValueOption => option !== null)

        setSelectableOptions(options)
      } catch (error) {
        if (requestId !== selectableOptionsRequestId.current) {
          return
        }
        const userMessage = errorReporter.reportAsyncError({
          location: 'lookup on-demand search',
          error,
          userMessage: 'Failed to search values.',
          context: {
            entityName: filterOption.EntityName,
            attributeName: filterOption.AttributeName,
            query,
          },
        })
        setSelectableOptionsErrorMessage(userMessage)
        setSelectableOptions([])
      } finally {
        if (requestId === selectableOptionsRequestId.current) {
          setIsSelectableOptionsLoading(false)
        }
      }
    },
    [crmRepository, filterOption]
  )

  React.useEffect(() => {
    if (isNoValueCondition(normalizedSelectedFilterCondition)) {
      setConditionValues((previousValues) => (previousValues.length === 0 ? previousValues : []))
      return
    }

    if (!isSelectableAttribute) {
      return
    }

    setConditionValues((previousValues) => {
      const sanitizedValues = sanitizeSelectableValues(
        previousValues,
        selectableOptions,
        selectionMaxItems
      )
      const nextValues = isMultiSelection ? sanitizedValues : sanitizedValues.slice(0, 1)
      return areSameValues(previousValues, nextValues) ? previousValues : nextValues
    })
  }, [
    isMultiSelection,
    isSelectableAttribute,
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

    const merged = new Map<string, ConditionValueOption>()
    for (const [key, option] of selectedOptionsCacheRef.current) {
      merged.set(key, option)
    }
    for (const option of selectableOptions) {
      merged.set(String(option.value), option)
    }
    return Array.from(merged.values())
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

    if (isPicklistAttribute && normalizedSelectedFilterCondition === 'in') {
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

      if (isPicklistAttribute && normalizedSelectedFilterCondition === 'in') {
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
    normalizedSelectedFilterCondition !== 'in'
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
        normalizedSelectedFilterCondition === 'in' ? 'Use comma separated values' : 'Value'
      }
      value={selectedConditionValue.toString()}
      disabled={isDisabled}
      onChange={handleConditionValueChanged}
    />
  )
}
