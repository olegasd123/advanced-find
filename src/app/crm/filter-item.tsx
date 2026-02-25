import * as React from "react";
import { Button } from "../../../vendor/catalyst-ui-kit/typescript/button";
import { TrashIcon } from "@heroicons/react/16/solid";
import { Combobox, ComboboxLabel, ComboboxOption } from "../../../vendor/catalyst-ui-kit/typescript/combobox";
import { Listbox, ListboxLabel, ListboxOption } from "../../../vendor/catalyst-ui-kit/typescript/listbox";
import { Input } from "../../../vendor/catalyst-ui-kit/typescript/input";
import { ComboboxOptionCategory } from "../../components/controls/combobox-option-category";
import { MultiCombobox } from "../../components/controls/multi-combobox";
import { FilterOption } from "./filter-grid";
import { useAppConfiguration } from "../../hooks/use-app-config";
import { useCrmRepository } from "../../hooks/use-crm-repository";
import { CrmFilterConditionOption, getCrmFilterConditionsOptions, getTargetFilterOption } from "../../libs/utils/filter";
import { createLogger } from "../../libs/utils/logger";

interface ConditionValueOption {
  value: string | number,
  displayName: string
}

const logger = createLogger("FilterItem")

const noValueConditions = new Set([ "null", "not-null", "today", "tomorrow", "yesterday" ])

const numberAttributeTypes = new Set([ "Number", "Integer", "BigInt", "Decimal", "Double", "Money" ])

const dateAttributeTypes = new Set([ "DateTime" ])

type ConditionValue = string | number

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

export const FilterItem = ({
  options,
  currentOption
}: {
  options: FilterOption[],
  currentOption?: FilterOption
}) => {
  const [ selectedAttribute, setSelectedAttribute ] = React.useState<FilterOption | undefined>(currentOption)
  const [ filterConditions, setFilterConditions ] = React.useState<CrmFilterConditionOption[] | undefined>()
  const [ selectedFilterCondition, setSelectedFilterCondition ] = React.useState<string | null>()
  const [ conditionValues, setConditionValues ] = React.useState<ConditionValue[]>([])
  const [ picklistOptions, setPicklistOptions ] = React.useState<ConditionValueOption[]>([])
  const [ isPicklistLoading, setIsPicklistLoading ] = React.useState(false)

  const [ cannotBeRemoved, setCannotBeRemoved ] = React.useState<boolean | undefined>(true)

  const localization = useAppConfiguration()?.SearchScheme?.Localization
  const crmRepository = useCrmRepository()
  const picklistRequestId = React.useRef(0)

  const selectedFilterOption = getTargetFilterOption(selectedAttribute?.FilterOptionConfig)
  const selectedAttributeType = selectedFilterOption?.AttributeType
  const picklistSelection = selectedFilterOption?.Selection
  const picklistMinItems = Math.max(0, picklistSelection?.MinItems ?? 0)
  const picklistMaxItems = picklistSelection?.MaxItems && picklistSelection.MaxItems > 0
    ? picklistSelection.MaxItems
    : undefined
  const isMultiPicklistSelection = selectedAttributeType === "Picklist" && picklistSelection?.Multi

  const loadPicklistOptions = React.useCallback(async (
    targetFilterOption: ReturnType<typeof getTargetFilterOption>,
    defaultCondition: string,
    defaultValues: ConditionValue[]
  ): Promise<void> => {
    const requestId = ++picklistRequestId.current

    if (targetFilterOption?.AttributeType !== "Picklist" ||
      !targetFilterOption?.EntityName ||
      !targetFilterOption?.AttributeName) {
      setPicklistOptions([])
      setIsPicklistLoading(false)
      return
    }

    setIsPicklistLoading(true)
    try {
      const metadata = await crmRepository?.getPicklistAttributeMetadata(targetFilterOption.EntityName, targetFilterOption.AttributeName)
      const options = metadata?.OptionSet?.Options?.map(option => {
        const value = option.Value
        const displayName = option.Label.UserLocalizedLabel?.Label ?? value.toString()
        return { value, displayName }
      }) ?? []

      if (requestId !== picklistRequestId.current) {
        return
      }

      setPicklistOptions(options)

      const targetSelection = targetFilterOption?.Selection
      const targetMaxItems = targetSelection?.MaxItems && targetSelection.MaxItems > 0
        ? targetSelection.MaxItems
        : undefined
      const isTargetMultiPicklist = targetFilterOption?.AttributeType === "Picklist" && targetSelection?.Multi
      const sanitizedDefaultValues = sanitizePicklistValues(defaultValues, options, targetMaxItems)

      if (isTargetMultiPicklist && !isNoValueCondition(defaultCondition)) {
        setConditionValues(sanitizedDefaultValues)
        return
      }

      if (isNoValueCondition(defaultCondition)) {
        setConditionValues([])
        return
      }

      setConditionValues(sanitizedDefaultValues.slice(0, 1))
    }
    catch (error) {
      if (requestId !== picklistRequestId.current) {
        return
      }
      logger.error(`Failed to load picklist values: ${error}`)
      setPicklistOptions([])
    }
    finally {
      if (requestId === picklistRequestId.current) {
        setIsPicklistLoading(false)
      }
    }
  }, [ crmRepository ])

  React.useEffect(() => {
    const targetFilterOption = getTargetFilterOption(currentOption?.FilterOptionConfig)
    setCannotBeRemoved(targetFilterOption?.Default?.IsDisabled || targetFilterOption?.Default?.CannotBeRemoved)

    const filterOptions = getCrmFilterConditionsOptions(targetFilterOption?.AttributeType, localization?.CrmFilterConditions)
    setFilterConditions(filterOptions)

    const conditionDefaultValue = targetFilterOption?.Default?.Condition ?? filterOptions?.at(0)?.value ?? "eq"
    setSelectedFilterCondition(conditionDefaultValue)

    const defaultValues = targetFilterOption?.Default?.Values ?? []
    setConditionValues(defaultValues)

    void loadPicklistOptions(targetFilterOption, conditionDefaultValue, defaultValues)
  }, [ currentOption, loadPicklistOptions, localization?.CrmFilterConditions ])

  const handleAttributeChanged = (value: FilterOption | null): void => {
    const targetFilterOptionValue = getTargetFilterOption(value?.FilterOptionConfig)

    setSelectedAttribute(value ? { ...value } : undefined)

    const filterOptions = getCrmFilterConditionsOptions(targetFilterOptionValue?.AttributeType, localization?.CrmFilterConditions)
    setFilterConditions(filterOptions)

    const defaultCondition = targetFilterOptionValue?.Default?.Condition ?? filterOptions?.at(0)?.value ?? "eq"
    setSelectedFilterCondition(defaultCondition)

    const defaultValues = targetFilterOptionValue?.Default?.Values ?? []
    setConditionValues(defaultValues)

    void loadPicklistOptions(targetFilterOptionValue, defaultCondition, defaultValues)
  }

  const handleConditionOptionChanged = (value: string | null): void => {
    setSelectedFilterCondition(value)

    if (isNoValueCondition(value)) {
      setConditionValues([])
      return
    }

    if (selectedAttributeType === "Picklist") {
      const sanitizedValues = sanitizePicklistValues(conditionValues, picklistOptions, picklistMaxItems)

      if (isMultiPicklistSelection) {
        setConditionValues(sanitizedValues)
        return
      }

      setConditionValues(sanitizedValues.slice(0, 1))
      return
    }

  }

  const handleConditionValueChanged = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setConditionValues([ event.target.value ])
  }

  const handlePicklistValueChanged = (value: ConditionValueOption["value"] | null): void => {
    if (value === null) {
      setConditionValues([])
      return
    }

    setConditionValues([ value ])
  }

  const handleMultiPicklistValueChanged = (values: ConditionValueOption[]): void => {
    const nextValues = values.map(value => value.value)

    if (picklistMaxItems && nextValues.length > picklistMaxItems) {
      return
    }

    if (nextValues.length < picklistMinItems) {
      return
    }

    setConditionValues(nextValues)
  }

  const renderConditionValueInput = (): React.ReactNode => {
    const selectedConditionValue = conditionValues.at(0) ?? ""
    const selectedPicklistValues = picklistOptions.filter(option => conditionValues.includes(option.value))

    if (isNoValueCondition(selectedFilterCondition)) {
      return <span>&nbsp;</span>
    }

    if (selectedAttributeType === "Picklist") {
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
          const maxItemsHint = picklistMaxItems ? ` and at most ${picklistMaxItems}` : ""

          return (
            <div>
              <MultiCombobox
                options={picklistOptions}
                placeholder="Select values"
                displayValue={(option) => option.displayName}
                displayInputValue={(values) => values.map(option => option.displayName).join(", ")}
                value={selectedPicklistValues}
                onChange={handleMultiPicklistValueChanged}>
                {(option) => (
                  <ComboboxOption value={option}>
                    <ComboboxLabel>{option.displayName}</ComboboxLabel>
                  </ComboboxOption>
                )}
              </MultiCombobox>
              <span className="mt-1 block text-xs text-zinc-500">
                Select at least {picklistMinItems}{maxItemsHint} values
              </span>
            </div>
          )
        }

        if (selectedFilterCondition === "in") {
          return (
            <Input
              type="text"
              placeholder="Use comma separated values"
              value={selectedConditionValue.toString()}
              onChange={handleConditionValueChanged}
            />
          )
        }

        return (
          <Listbox
            placeholder="Select value"
            value={selectedConditionValue === "" ? null : selectedConditionValue}
            onChange={handlePicklistValueChanged}>
            {picklistOptions.map(option => {
              return (
                <ListboxOption
                  key={option.value}
                  value={option.value}>
                  <ListboxLabel>{option.displayName}</ListboxLabel>
                </ListboxOption>
              )
            })}
          </Listbox>
        )
      }
    }

    if (selectedAttributeType === "Boolean") {
      return (
        <Listbox
          value={selectedConditionValue === "" ? null : selectedConditionValue}
          onChange={handlePicklistValueChanged}>
          <ListboxOption value="true">
            <ListboxLabel>True</ListboxLabel>
          </ListboxOption>
          <ListboxOption value="false">
            <ListboxLabel>False</ListboxLabel>
          </ListboxOption>
        </Listbox>
      )
    }

    if (numberAttributeTypes.has(selectedAttributeType ?? "") && selectedFilterCondition !== "in") {
      return (
        <Input
          type="number"
          value={selectedConditionValue}
          onChange={handleConditionValueChanged}
        />
      )
    }

    if (dateAttributeTypes.has(selectedAttributeType ?? "")) {
      return (
        <Input
          type="date"
          value={selectedConditionValue}
          onChange={handleConditionValueChanged}
        />
      )
    }

    return (
      <Input
        type="text"
        placeholder={selectedFilterCondition === "in" ? "Use comma separated values" : "Value"}
        value={selectedConditionValue}
        onChange={handleConditionValueChanged}
      />
    )
  }

  return (
    <div className="flex flex-row gap-4 py-4 border-b border-b-gray-300">
      <div className="w-8 grow-0">
        <Button
          outline
          disabled={cannotBeRemoved}>
          <TrashIcon />
        </Button>
      </div>
      <div className="w-36 grow-3">
        <Combobox
          options={options}
          displayValue={(option: FilterOption | null) => getTargetFilterOption(option?.FilterOptionConfig)?.DisplayName}
          value={selectedAttribute ?? undefined}
          onChange={handleAttributeChanged}>
          {(option) => (
            option?.FilterOptionConfig?.CategoryDisplayName ? (
              <ComboboxOptionCategory className="bg-zinc-200/60 dark:text-white"> 
                {option?.FilterOptionConfig?.CategoryDisplayName}
              </ComboboxOptionCategory>
            )
            : (
              <ComboboxOption value={option}>
                <ComboboxLabel>{getTargetFilterOption(option?.FilterOptionConfig)?.DisplayName}</ComboboxLabel>
              </ComboboxOption>
            )
          )}
        </Combobox>
      </div>
      <div className="w-24 grow-2">
        {filterConditions && (
          <Listbox
            value={selectedFilterCondition}
            onChange={handleConditionOptionChanged}>
            {filterConditions?.map(condition => {
              return (
                <ListboxOption
                  key={condition.value}
                  value={condition.value}>
                  <ListboxLabel>{condition.displayName}</ListboxLabel>
                </ListboxOption>
              )
            })}
          </Listbox>
        )}
      </div>
      <div className="w-64 grow-8">
        {renderConditionValueInput()}
      </div>
    </div>
  )
}
