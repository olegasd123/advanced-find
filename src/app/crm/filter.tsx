import * as React from "react";
import { EntityConfig, FilterOptionConfig } from "../../config/app";
import { FilterItem } from "./filter-item";
import { useCrmRepository } from "../../providers";
import { fillOutMissedDisplayNames } from "../../utils/filter";

export interface FilterOption {
  FilterOptionConfig?: FilterOptionConfig
}

export type FilterProps = {
  entityConfig?: EntityConfig
}

export const Filter = ({
  entityConfig
}: FilterProps) => {
  const [ filterOptions, setFilterOptions ] = React.useState<FilterOption[]>()
  
  const crm = useCrmRepository();

  React.useEffect(() => {
    const getData = async () => {
      
      await fillOutMissedDisplayNames(
        entityConfig?.FilterOptions,
        (entityLogicalName, groupedMissedDisplayNames) => crm?.getAttributesMetadata(entityLogicalName, groupedMissedDisplayNames)
      )

      const options = entityConfig?.FilterOptions?.map(option => {
        return { FilterOptionConfig: option }
      })
      setFilterOptions(options)
    }
    getData();
  }, [ entityConfig ])

  return (
    <div>
      {filterOptions?.map((filterOption, index) => {
        if (filterOption?.FilterOptionConfig?.Default?.IsShowed && !filterOption?.FilterOptionConfig?.CategoryDisplayName) {
          return <FilterItem key={index} availableOptions={filterOptions} currentOption={filterOption} />
        }
      })}
    </div>
  )
}