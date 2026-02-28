import * as React from 'react'
import { EntityConfig, FilterOptionConfig } from '../../libs/config/app-config'
import { FilterItem } from './filter-item'
import { FilterCommandRow } from './filter-command-row'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { fillOptionsWithMetadataInfo } from '../../libs/utils/filter'
import { AppliedFilterCondition } from '../../libs/utils/crm-search'

export interface FilterOption {
  FilterOptionConfig?: FilterOptionConfig
}

interface VisibleFilterOption {
  id: number
  option: FilterOption
}

export const FilterGrid = ({
  entityConfig,
  onSearch,
}: {
  entityConfig?: EntityConfig
  onSearch?: (conditions: AppliedFilterCondition[]) => void
}) => {
  const [filterOptions, setFilterOptions] = React.useState<FilterOption[]>()
  const [visibleFilterOptions, setVisibleFilterOptions] = React.useState<VisibleFilterOption[]>([])
  const [conditionsById, setConditionsById] = React.useState<
    Record<number, AppliedFilterCondition>
  >({})
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
    setConditionsById({})
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
    setConditionsById((previous) => {
      const next = { ...previous }
      delete next[optionId]
      return next
    })
  }

  const handleResetFilters = (): void => {
    setConditionsById({})
    setVisibleFilterOptions(getDefaultVisibleFilterOptions(filterOptions))
  }

  const handleConditionChanged = React.useCallback(
    (optionId: number, condition: AppliedFilterCondition): void => {
      setConditionsById((previous) => ({
        ...previous,
        [optionId]: condition,
      }))
    },
    []
  )

  const handleSearch = (): void => {
    onSearch?.(
      visibleFilterOptions
        .map((item) => conditionsById[item.id])
        .filter((condition): condition is AppliedFilterCondition => Boolean(condition))
    )
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
            optionId={item.id}
            options={filterOptions ?? []}
            currentOption={item.option}
            onDeleteCondition={() => handleDeleteCondition(item.id)}
            onConditionChanged={handleConditionChanged}
          />
        )
      })}

      <FilterCommandRow
        location="footer"
        onAddCondition={handleAddCondition}
        onResetFilters={handleResetFilters}
        onSearch={handleSearch}
      />
    </div>
  )
}
