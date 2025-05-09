import * as React from "react";
import { Button } from "../../components/controls/catalyst/button";
import { TrashIcon } from "@heroicons/react/16/solid";
import { Combobox, ComboboxLabel, ComboboxOption } from "../../components/controls/catalyst/combobox";
import { FilterOption } from "./filter";

export type FilterItemProps = {
  availableOptions: FilterOption[],
  currentOption: FilterOption
}

export const FilterItem = ({
  availableOptions,
  currentOption
}: FilterItemProps) => {
  const [ currentAttribute, setCurrentAttribute ] = React.useState<FilterOption | null>()

  React.useEffect(() => {

  }, [ currentOption ])

  return (
    <div className="flex flex-row gap-4 py-4 border-b border-b-gray-300">
      <div className="grow-0">
        <Button outline disabled={currentOption?.FilterOptionConfig?.Default?.IsDisabled || currentOption?.FilterOptionConfig?.Default?.CannotRemove}>
          <TrashIcon />
        </Button>
      </div>
      <div className="grow-2">
        <Combobox options={availableOptions}
          defaultValue={currentOption}
          displayValue={(option: FilterOption | null) => option?.FilterOptionConfig?.AttributeDisplayName}
          value={currentAttribute ?? undefined}
          onChange={setCurrentAttribute}>
          {(option) => (
            option?.FilterOptionConfig?.CategoryDisplayName ? (
              <div className="group/option grid w-full cursor-default grid-cols-[1fr_--spacing(5)] items-baseline text-base/6 font-bold gap-x-2 py-2.5 pr-2 pl-1.5 sm:grid-cols-[1fr_--spacing(4)] sm:py-1.5 sm:pr-2 sm:pl-1 sm:text-sm/6 text-blue-500 dark:text-white outline-hidden data-disabled:opacity-50">
                {option?.FilterOptionConfig?.CategoryDisplayName}
              </div>
            )
            : (
              <ComboboxOption value={option}>
                <ComboboxLabel>{option?.FilterOptionConfig?.AttributeDisplayName}</ComboboxLabel>
              </ComboboxOption>
            )
          )}
        </Combobox>
      </div>
      <div className="grow-2">03</div>
      <div className="grow-6">04</div>
    </div>
  )
}