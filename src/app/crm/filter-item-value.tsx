import * as React from 'react'
import {
  Combobox,
  ComboboxLabel,
  ComboboxOption,
} from '../../../vendor/catalyst-ui-kit/typescript/combobox'
import {
  Listbox,
  ListboxLabel,
  ListboxOption,
} from '../../../vendor/catalyst-ui-kit/typescript/listbox'
import { Input } from '../../../vendor/catalyst-ui-kit/typescript/input'
import { MultiCombobox } from '../../components/controls/multi-combobox'
import { FilterOptionConfig } from '../../libs/config/app-config'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { createLogger } from '../../libs/utils/logger'

interface ConditionValueOption {
  value: string | number
  displayName: string
}

type ConditionValue = string | number

const logger = createLogger('FilterItemValue')

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
  isDisabled,
}: {
  filterOption?: FilterOptionConfig
  selectedFilterCondition?: string | null
  isDisabled?: boolean
}) => {
  const [conditionValues, setConditionValues] = React.useState<ConditionValue[]>([])
  const [selectableOptions, setSelectableOptions] = React.useState<ConditionValueOption[]>([])
  const [isSelectableOptionsLoading, setIsSelectableOptionsLoading] = React.useState(false)

  const crmRepository = useCrmRepository()
  const selectableOptionsRequestId = React.useRef(0)

  const selectedAttributeType = filterOption?.AttributeType
  const selection = filterOption?.Selection
  const selectionMinItems = Math.max(0, selection?.MinItems ?? 0)
  const selectionMaxItems =
    selection?.MaxItems && selection.MaxItems > 0 ? selection.MaxItems : undefined
  const isPicklistAttribute = selectedAttributeType === 'Picklist'
  const isLookupAttribute = selectedAttributeType === 'Lookup'
  const isSelectableAttribute = isPicklistAttribute || isLookupAttribute
  const isMultiSelection = isSelectableAttribute && Boolean(selection?.Multiple)

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
        return
      }

      setIsSelectableOptionsLoading(true)
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
              const relatedAttributeNames =
                targetFilterOption.Selection?.RelatedEntityAttributeNames ?? []
              const attributeNames = [...new Set([idAttributeName, ...relatedAttributeNames])]
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
                    relatedAttributeNames,
                    targetFilterOption.Selection?.RelatedEntityAttributeFormat,
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
        logger.error(`Failed to load selectable values: ${error}`)
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
      return
    }

    const defaultValues = filterOption.Default?.Values ?? []
    setConditionValues(defaultValues)
    void loadSelectableOptions(filterOption, filterOption.Default?.Condition, defaultValues)
  }, [filterOption, loadSelectableOptions])

  React.useEffect(() => {
    if (isNoValueCondition(selectedFilterCondition)) {
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
    selectedFilterCondition,
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

    if (selectionMaxItems && nextValues.length > selectionMaxItems) {
      return
    }

    if (nextValues.length < selectionMinItems) {
      return
    }

    setConditionValues(nextValues)
  }

  const selectedConditionValue = conditionValues.at(0) ?? ''
  const selectedSelectionValues = selectableOptions.filter((option) =>
    conditionValues.includes(option.value)
  )
  const selectedSingleLookupValue = selectedSelectionValues.at(0) ?? null

  if (isNoValueCondition(selectedFilterCondition)) {
    return <span>&nbsp;</span>
  }

  if (isSelectableAttribute) {
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

    if (selectableOptions.length > 0) {
      if (isMultiSelection) {
        return (
          <div>
            <MultiCombobox
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
            </MultiCombobox>
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

      if (isPicklistAttribute && selectedFilterCondition === 'in') {
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

  if (numberAttributeTypes.has(selectedAttributeType ?? '') && selectedFilterCondition !== 'in') {
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
      placeholder={selectedFilterCondition === 'in' ? 'Use comma separated values' : 'Value'}
      value={selectedConditionValue.toString()}
      disabled={isDisabled}
      onChange={handleConditionValueChanged}
    />
  )
}
