import * as React from "react";
import { Button } from "../../../vendor/catalyst-ui-kit/typescript/button";
import { TrashIcon } from "@heroicons/react/16/solid";
import { Combobox, ComboboxLabel, ComboboxOption } from "../../../vendor/catalyst-ui-kit/typescript/combobox";
import { Listbox, ListboxLabel, ListboxOption } from "../../../vendor/catalyst-ui-kit/typescript/listbox";
import { ComboboxOptionCategory } from "../../components/controls/combobox-option-category";
import { FilterOption } from "./filter-grid";
import { useAppConfiguration } from "../../hooks/use-app-config";
import { CrmFilterConditionOption, getCrmFilterConditionsOptions, getTargetFilterOption } from "../../libs/utils/filter";

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

  const [ cannotBeRemoved, setCannotBeRemoved ] = React.useState<boolean | undefined>(true)

  const localization = useAppConfiguration()?.SearchScheme?.Localization

  React.useEffect(() => {
    const targetFilterOption = getTargetFilterOption(currentOption?.FilterOptionConfig)
    setCannotBeRemoved(targetFilterOption?.Default?.IsDisabled || targetFilterOption?.Default?.CannotBeRemoved)

    const filterOptions = getCrmFilterConditionsOptions(targetFilterOption?.AttributeType, localization?.CrmFilterConditions)
    setFilterConditions(filterOptions)

    const conditionDefaultValue = targetFilterOption?.Default?.Condition ?? filterOptions?.at(0)?.value
    setSelectedFilterCondition(conditionDefaultValue)
  }, [ currentOption ])

  const handleAttributeChanged = (value: FilterOption | null): void => {
    const targetFilterOptionValue = getTargetFilterOption(value?.FilterOptionConfig)

    setSelectedAttribute({ ...value })

    const filterOptions = getCrmFilterConditionsOptions(targetFilterOptionValue?.AttributeType, localization?.CrmFilterConditions)
    setFilterConditions(filterOptions)
    setSelectedFilterCondition(filterOptions?.at(0)?.value ?? "")
  }

  const handleConditionOptionChanged = (value: string | null): void => {
    setSelectedFilterCondition(value)
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
        // TODO: implement inputs for condition value regarding attribute type
      </div>
    </div>
  )
}