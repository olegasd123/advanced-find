import * as React from 'react'
import { EntityConfig, FilterOptionConfig } from '../../libs/config/app-config'
import { FilterItem } from './filter-item'
import { FilterCommandRow } from './filter-command-row'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { fillOptionsWithMetadataInfo } from '../../libs/utils/filter'

export interface FilterOption {
  FilterOptionConfig?: FilterOptionConfig
}

interface VisibleFilterOption {
  id: number
  option: FilterOption
}

export const FilterGrid = ({ entityConfig }: { entityConfig?: EntityConfig }) => {
  const [filterOptions, setFilterOptions] = React.useState<FilterOption[]>()
  const [visibleFilterOptions, setVisibleFilterOptions] = React.useState<VisibleFilterOption[]>([])
  const crm = useCrmRepository()
  const requestIdRef = React.useRef(0)
  const optionIdRef = React.useRef(0)

  const getDefaultVisibleFilterOptions = React.useCallback(
    (options?: FilterOption[]): VisibleFilterOption[] => {
      return (
        options
          ?.filter(
            (filterOption) =>
              filterOption?.FilterOptionConfig?.Default?.IsShowed &&
              !filterOption?.FilterOptionConfig?.CategoryDisplayName
          )
          .map((filterOption) => {
            return {
              id: ++optionIdRef.current,
              option: filterOption,
            }
          }) ?? []
      )
    },
    []
  )

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setFilterOptions(undefined)
    setVisibleFilterOptions([])
    optionIdRef.current = 0

    if (!entityConfig) {
      return
    }

    const getData = async () => {
      await fillOptionsWithMetadataInfo(
        entityConfig?.LogicalName,
        entityConfig?.FilterOptions,
        (entityLogicalName, groupedMissedDisplayNames) =>
          crm?.getAttributesMetadata(entityLogicalName, groupedMissedDisplayNames)
      )
      const options = entityConfig.FilterOptions?.map((option) => {
        return { FilterOptionConfig: option }
      })

      if (requestId === requestIdRef.current) {
        setFilterOptions(options)
        setVisibleFilterOptions(getDefaultVisibleFilterOptions(options))
      }
    }
    getData()
  }, [entityConfig, crm, getDefaultVisibleFilterOptions])

  const handleAddCondition = (): void => {
    setVisibleFilterOptions((previous) => [
      ...previous,
      {
        id: ++optionIdRef.current,
        option: {},
      },
    ])
  }

  const handleDeleteCondition = (optionId: number): void => {
    setVisibleFilterOptions((previous) => previous.filter((item) => item.id !== optionId))
  }

  const handleResetFilters = (): void => {
    setVisibleFilterOptions(getDefaultVisibleFilterOptions(filterOptions))
  }

  return (
    <div>
      <FilterCommandRow
        location="header"
        onAddCondition={handleAddCondition}
        onResetFilters={handleResetFilters}
      />

      {visibleFilterOptions.map((item) => {
        return (
          <FilterItem
            key={item.id}
            options={filterOptions ?? []}
            currentOption={item.option}
            onDeleteCondition={() => handleDeleteCondition(item.id)}
          />
        )
      })}

      <FilterCommandRow
          location="footer"
          onAddCondition={handleAddCondition}
          onResetFilters={handleResetFilters}
        />
    </div>
  )
}
