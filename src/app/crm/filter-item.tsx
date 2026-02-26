import * as React from "react";
import { Button } from "../../../vendor/catalyst-ui-kit/typescript/button";
import { TrashIcon } from "@heroicons/react/16/solid";
import { Combobox, ComboboxLabel, ComboboxOption } from "../../../vendor/catalyst-ui-kit/typescript/combobox";
import { Listbox, ListboxLabel, ListboxOption } from "../../../vendor/catalyst-ui-kit/typescript/listbox";
import { ComboboxOptionCategory } from "../../components/controls/combobox-option-category";
import { FilterOption } from "./filter-grid";
import { FilterItemValue } from "./filter-item-value";
import { useAppConfiguration } from "../../hooks/use-app-config";
import { CrmFilterConditionOption, getCrmFilterConditionsOptions, getTargetFilterOption } from "../../libs/utils/filter";

export const FilterItem = ({
  options,
  currentOption,
  onDeleteCondition
}: {
  options: FilterOption[],
  currentOption?: FilterOption,
  onDeleteCondition?: () => void
}) => {
  const [ selectedAttribute, setSelectedAttribute ] = React.useState<FilterOption | undefined>(currentOption)
  const [ filterConditions, setFilterConditions ] = React.useState<CrmFilterConditionOption[] | undefined>()
  const [ selectedFilterCondition, setSelectedFilterCondition ] = React.useState<string | null>()
  const [ cannotBeRemoved, setCannotBeRemoved ] = React.useState<boolean | undefined>(true)
  const [ isAttributeDisabled, setIsAttributeDisabled ] = React.useState<boolean | undefined>(false)
  const [ isDisabled, setIsDisabled ] = React.useState<boolean | undefined>(false)

  const localization = useAppConfiguration()?.SearchScheme?.Localization
  const selectedFilterOption = getTargetFilterOption(selectedAttribute?.FilterOptionConfig)

  React.useEffect(() => {
    setSelectedAttribute(currentOption ? { ...currentOption } : undefined)

    const targetFilterOption = getTargetFilterOption(currentOption?.FilterOptionConfig)
    // Apply default values from config to the condition only for initialization,
    // after that the condition values will be controlled by user actions and config default values will be ignored
    setCannotBeRemoved(targetFilterOption?.Default?.IsDisabled || targetFilterOption?.Default?.CannotBeRemoved)
    setIsAttributeDisabled(targetFilterOption?.Default?.IsAttributeDisabled)
    setIsDisabled(targetFilterOption?.Default?.IsDisabled)

    const options = getCrmFilterConditionsOptions(targetFilterOption?.AttributeType, localization?.CrmFilterConditions, targetFilterOption?.Selection?.Multiple)
    setFilterConditions(options)

    const defaultCondition = targetFilterOption?.Default?.Condition ?? options?.at(0)?.value ?? "eq"
    setSelectedFilterCondition(defaultCondition)
  }, [ currentOption, localization?.CrmFilterConditions ])

  const handleAttributeChanged = (value: FilterOption | null): void => {
    const targetFilterOptionValue = getTargetFilterOption(value?.FilterOptionConfig)
    setSelectedAttribute(value ? { ...value } : undefined)

    const options = getCrmFilterConditionsOptions(targetFilterOptionValue?.AttributeType, localization?.CrmFilterConditions, targetFilterOptionValue?.Selection?.Multiple)
    setFilterConditions(options)

    const defaultCondition = targetFilterOptionValue?.Default?.Condition ?? options?.at(0)?.value ?? "eq"
    setSelectedFilterCondition(defaultCondition)
  }

  const handleConditionOptionChanged = (value: string | null): void => {
    setSelectedFilterCondition(value)
  }

  return (
    <div className="flex flex-row gap-4 py-4 border-b border-b-gray-300">
      <div className="w-8 grow-0">
        <Button
          outline
          onClick={onDeleteCondition}
          aria-label="Delete condition"
          disabled={cannotBeRemoved}>
          <TrashIcon />
        </Button>
      </div>
      <div className="w-36 grow-3">
        <Combobox
          options={options}
          displayValue={(option: FilterOption | null) => getTargetFilterOption(option?.FilterOptionConfig)?.DisplayName}
          value={selectedAttribute ?? undefined}
          disabled={isDisabled || isAttributeDisabled}
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
            disabled={isDisabled}
            onChange={handleConditionOptionChanged}>
            {filterConditions.map(condition => {
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
        <FilterItemValue
          filterOption={selectedFilterOption}
          selectedFilterCondition={selectedFilterCondition}
          isDisabled={isDisabled}
        />
      </div>
    </div>
  )
}
