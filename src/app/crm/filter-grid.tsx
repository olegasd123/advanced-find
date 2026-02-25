import * as React from "react";
import { EntityConfig, FilterOptionConfig } from "../../libs/config/app-config";
import { FilterItem } from "./filter-item";
import { useCrmRepository } from "../../hooks/use-crm-repository";
import { fillOptionsWithMetadataInfo } from "../../libs/utils/filter";

export interface FilterOption {
  FilterOptionConfig?: FilterOptionConfig
}

export const FilterGrid = ({
  entityConfig
}: {
  entityConfig?: EntityConfig
}) => {
  const [ filterOptions, setFilterOptions ] = React.useState<FilterOption[]>()
  const crm = useCrmRepository()

  React.useEffect(() => {
    const getData = async () => {
      await fillOptionsWithMetadataInfo(
        entityConfig?.LogicalName,
        entityConfig?.FilterOptions,
        (entityLogicalName, groupedMissedDisplayNames) => crm?.getAttributesMetadata(entityLogicalName, groupedMissedDisplayNames)
      )
      const options = entityConfig?.FilterOptions?.map(option => {
        return { FilterOptionConfig: option }
      })
      
      setFilterOptions(options)
    }
    getData()
  }, [ entityConfig ])

  return (
    <div>
      {filterOptions?.map((filterOption, index) => {
        if (filterOption?.FilterOptionConfig?.Default?.IsShowed &&
          !filterOption?.FilterOptionConfig?.CategoryDisplayName) {
          return <FilterItem
            key={index}
            options={filterOptions}
            currentOption={filterOption}
          />
        }
      })}
    </div>
  )
}