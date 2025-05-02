import { useState, useEffect } from "react";
import { EntityConfig, FilterOptionConfig } from "../../data/configuration";
import FilterItem from "./FilterItem";

export interface FilterOption {
  FilterOptionConfig?: FilterOptionConfig
}

export default function Filter({ entityConfig }: {
  entityConfig: EntityConfig | undefined }) {
  const [ filterOptions, setFilterOptions ] = useState<FilterOption[]>()
  
  useEffect(() => {
    const options = entityConfig?.FilterOptions?.map(option => {
      return { FilterOptionConfig: option }
    })
    setFilterOptions(options)
  }, [ entityConfig ])

  return (
    <div>
      {filterOptions?.map((filterOption, index) => {
        if (filterOption?.FilterOptionConfig?.Default?.IsShowed) {
          return <FilterItem key={index} allOptions={filterOptions} currentOption={filterOption} />
        }
      })}
    </div>
  )
}