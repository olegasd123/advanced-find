import * as React from "react";
import { EntityConfig, FilterOptionConfig } from "../../libs/config/app-config";
import { FilterItem } from "./filter-item";
import { FilterCommandRow } from "./filter-command-row";
import { useCrmRepository } from "../../hooks/use-crm-repository";
import { fillOptionsWithMetadataInfo, getTargetFilterOption } from "../../libs/utils/filter";

export interface FilterOption {
  FilterOptionConfig?: FilterOptionConfig
}

export const FilterGrid = ({
  entityConfig
}: {
  entityConfig?: EntityConfig
}) => {
  const [ filterOptions, setFilterOptions ] = React.useState<FilterOption[]>()
  const [ visibleFilterOptions, setVisibleFilterOptions ] = React.useState<FilterOption[]>([])
  const crm = useCrmRepository()
  const requestIdRef = React.useRef(0)

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setFilterOptions(undefined)
    setVisibleFilterOptions([])

    if (!entityConfig) {
      return
    }

    const getData = async () => {
      await fillOptionsWithMetadataInfo(
        entityConfig?.LogicalName,
        entityConfig?.FilterOptions,
        (entityLogicalName, groupedMissedDisplayNames) => crm?.getAttributesMetadata(entityLogicalName, groupedMissedDisplayNames)
      )
      const options = entityConfig.FilterOptions?.map(option => {
        return { FilterOptionConfig: option }
      })

      if (requestId === requestIdRef.current) {
        setFilterOptions(options)
        setVisibleFilterOptions(options?.filter(filterOption =>
          filterOption?.FilterOptionConfig?.Default?.IsShowed &&
          !filterOption?.FilterOptionConfig?.CategoryDisplayName
        ) ?? [])
      }
    }
    getData()
  }, [ entityConfig, crm ])

  const handleAddCondition = (): void => {
    setVisibleFilterOptions(previous => [ ...previous, {} ])
  }

  return (
    <div>
      {visibleFilterOptions.map((filterOption, index) => {
        const targetFilterOption = getTargetFilterOption(filterOption.FilterOptionConfig)
        const itemKey = `${entityConfig?.LogicalName ?? "entity"}-${targetFilterOption?.EntityName ?? "entity"}-${targetFilterOption?.AttributeName ?? "attribute"}-${index}`
        return <FilterItem
          key={itemKey}
          options={filterOptions ?? []}
          currentOption={filterOption}
        />
      })}

      <FilterCommandRow onAddCondition={handleAddCondition} />
    </div>
  )
}
