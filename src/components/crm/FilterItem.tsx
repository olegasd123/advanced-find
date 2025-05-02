import { useState } from "react";
import { FilterOptionConfig } from "../../data/configuration";
import { Button } from "../controls/catalyst/button";
import { TrashIcon } from "@heroicons/react/16/solid";
import { Combobox, ComboboxLabel, ComboboxOption } from "../controls/catalyst/combobox";
import { FilterOption } from "./Filter";

export default function FilterItem({ allOptions, currentOption }:
  { allOptions: FilterOption[], currentOption: FilterOption }) {
  //const [ currentAttribute, setCurrentAttribute ] = useState<string | null>()

  return (
    <div className="flex flex-row gap-4 py-4 border-b border-b-gray-300">
      <div className="grow-0">
        <Button outline disabled={currentOption?.FilterOptionConfig?.Default?.IsDisabled || currentOption?.FilterOptionConfig?.Default?.CannotRemove}>
          <TrashIcon />
        </Button>
      </div>
      <div className="grow-2">
        {/* <Combobox name="user" options={users} displayValue={(user) => user?.name} value={user} onChange={setUser}>
          {(user) => (
            <ComboboxOption value={user}>
              <ComboboxLabel>{user.name}</ComboboxLabel>
            </ComboboxOption>
          )}
        </Combobox> */}
      </div>
      <div className="grow-2">03</div>
      <div className="grow-6">04</div>
    </div>
  )
}