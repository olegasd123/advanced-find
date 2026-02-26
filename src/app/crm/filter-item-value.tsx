import * as React from 'react'
import { ComboboxLabel, ComboboxOption } from '../../../vendor/catalyst-ui-kit/typescript/combobox'
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

const sanitizePicklistValues = (
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
  const [picklistOptions, setPicklistOptions] = React.useState<ConditionValueOption[]>([])
  const [isPicklistLoading, setIsPicklistLoading] = React.useState(false)

  const crmRepository = useCrmRepository()
  const picklistRequestId = React.useRef(0)

  const selectedAttributeType = filterOption?.AttributeType
  const picklistSelection = filterOption?.Selection
  const picklistMinItems = Math.max(0, picklistSelection?.MinItems ?? 0)
  const picklistMaxItems =
    picklistSelection?.MaxItems && picklistSelection.MaxItems > 0
      ? picklistSelection.MaxItems
      : undefined
  const isMultiPicklistSelection =
    selectedAttributeType === 'Picklist' && picklistSelection?.Multiple

  const loadPicklistOptions = React.useCallback(
    async (
      targetFilterOption: FilterOptionConfig | undefined,
      condition: string | null | undefined,
      defaultValues: ConditionValue[]
    ): Promise<void> => {
      const requestId = ++picklistRequestId.current

      if (
        targetFilterOption?.AttributeType !== 'Picklist' ||
        !targetFilterOption?.EntityName ||
        !targetFilterOption?.AttributeName
      ) {
        setPicklistOptions([])
        setIsPicklistLoading(false)
        return
      }

      setIsPicklistLoading(true)
      try {
        const metadata = await crmRepository?.getPicklistAttributeMetadata(
          targetFilterOption.EntityName,
          targetFilterOption.AttributeName
        )
        const options =
          metadata?.OptionSet?.Options?.map((option) => {
            const value = option.Value
            const displayName = option.Label.UserLocalizedLabel?.Label ?? value.toString()
            return { value, displayName }
          }) ?? []

        if (requestId !== picklistRequestId.current) {
          return
        }

        setPicklistOptions(options)

        const targetSelection = targetFilterOption?.Selection
        const targetMaxItems =
          targetSelection?.MaxItems && targetSelection.MaxItems > 0
            ? targetSelection.MaxItems
            : undefined
        const isTargetMultiPicklist =
          targetFilterOption?.AttributeType === 'Picklist' && targetSelection?.Multiple
        const sanitizedDefaultValues = sanitizePicklistValues(
          defaultValues,
          options,
          targetMaxItems
        )

        if (isNoValueCondition(condition)) {
          setConditionValues([])
          return
        }

        if (isTargetMultiPicklist) {
          setConditionValues(sanitizedDefaultValues)
          return
        }

        setConditionValues(sanitizedDefaultValues.slice(0, 1))
      } catch (error) {
        if (requestId !== picklistRequestId.current) {
          return
        }
        logger.error(`Failed to load picklist values: ${error}`)
        setPicklistOptions([])
      } finally {
        if (requestId === picklistRequestId.current) {
          setIsPicklistLoading(false)
        }
      }
    },
    [crmRepository]
  )

  React.useEffect(() => {
    if (!filterOption) {
      setConditionValues([])
      setPicklistOptions([])
      setIsPicklistLoading(false)
      return
    }

    const defaultValues = filterOption.Default?.Values ?? []
    setConditionValues(defaultValues)
    void loadPicklistOptions(filterOption, filterOption.Default?.Condition, defaultValues)
  }, [filterOption, loadPicklistOptions])

  React.useEffect(() => {
    if (isNoValueCondition(selectedFilterCondition)) {
      setConditionValues((previousValues) => (previousValues.length === 0 ? previousValues : []))
      return
    }

    if (selectedAttributeType !== 'Picklist') {
      return
    }

    setConditionValues((previousValues) => {
      const sanitizedValues = sanitizePicklistValues(
        previousValues,
        picklistOptions,
        picklistMaxItems
      )
      const nextValues = isMultiPicklistSelection ? sanitizedValues : sanitizedValues.slice(0, 1)
      return areSameValues(previousValues, nextValues) ? previousValues : nextValues
    })
  }, [
    isMultiPicklistSelection,
    picklistMaxItems,
    picklistOptions,
    selectedAttributeType,
    selectedFilterCondition,
  ])

  const handleConditionValueChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setConditionValues([event.target.value])
  }

  const handlePicklistValueChanged = (value: ConditionValueOption['value'] | null): void => {
    if (value === null) {
      setConditionValues([])
      return
    }

    setConditionValues([value])
  }

  const handleMultiPicklistValueChanged = (values: ConditionValueOption[]): void => {
    const nextValues = values.map((value) => value.value)

    if (picklistMaxItems && nextValues.length > picklistMaxItems) {
      return
    }

    if (nextValues.length < picklistMinItems) {
      return
    }

    setConditionValues(nextValues)
  }

  const selectedConditionValue = conditionValues.at(0) ?? ''
  const selectedPicklistValues = picklistOptions.filter((option) =>
    conditionValues.includes(option.value)
  )

  if (isNoValueCondition(selectedFilterCondition)) {
    return <span>&nbsp;</span>
  }

  if (selectedAttributeType === 'Picklist') {
    if (isPicklistLoading) {
      return (
        <Input
          disabled
          type="text"
          value="Loading values..."
          onChange={handleConditionValueChanged}
        />
      )
    }

    if (picklistOptions.length > 0) {
      if (isMultiPicklistSelection) {
        return (
          <div>
            <MultiCombobox
              options={picklistOptions}
              placeholder="Select values"
              displayValue={(option) => option.displayName}
              displayInputValue={(values) => values.map((option) => option.displayName).join(', ')}
              value={selectedPicklistValues}
              disabled={isDisabled}
              onChange={handleMultiPicklistValueChanged}
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

      if (selectedFilterCondition === 'in') {
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
          onChange={handlePicklistValueChanged}
        >
          {picklistOptions.map((option) => {
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
        onChange={handlePicklistValueChanged}
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
