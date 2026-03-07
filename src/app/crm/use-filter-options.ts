import * as React from 'react'
import { EntityConfig } from '@/libs/types/app-config.types'
import { fillOptionsWithMetadataInfo } from '@/libs/utils/crm/filter'
import { getNormalizedConfigId, getRelationPathById } from '@/libs/utils/crm/relation-path'
import { useCrmRepository } from '@/hooks/use-crm-repository'
import { FilterOption, VisibleFilterOption } from './filter-grid.helpers'

interface UseFilterOptionsResult {
  filterOptions: FilterOption[] | undefined
  visibleFilterOptions: VisibleFilterOption[]
  defaultVisibleFilterOptions: VisibleFilterOption[]
  defaultsRevision: number
  setVisibleFilterOptions: React.Dispatch<React.SetStateAction<VisibleFilterOption[]>>
  addCondition: () => void
  removeCondition: (optionId: number) => void
  resetVisibleFilterOptions: () => void
}

const buildDefaultVisibleFilterOptions = (
  options: FilterOption[] | undefined,
  optionIdRef: React.MutableRefObject<number>
): VisibleFilterOption[] => {
  return (
    options
      ?.filter((filterOption) => filterOption?.FilterOptionConfig?.Default?.IsShown)
      .map((filterOption) => ({
        id: ++optionIdRef.current,
        option: filterOption,
      })) ?? []
  )
}

export const useFilterOptions = ({
  entityConfig,
}: {
  entityConfig?: EntityConfig
}): UseFilterOptionsResult => {
  const [filterOptions, setFilterOptions] = React.useState<FilterOption[]>()
  const [visibleFilterOptions, setVisibleFilterOptions] = React.useState<VisibleFilterOption[]>([])
  const [defaultVisibleFilterOptions, setDefaultVisibleFilterOptions] = React.useState<
    VisibleFilterOption[]
  >([])
  const [defaultsRevision, setDefaultsRevision] = React.useState(0)
  const crm = useCrmRepository()
  const requestIdRef = React.useRef(0)
  const optionIdRef = React.useRef(0)
  const relationPathById = React.useMemo(
    () => (entityConfig ? getRelationPathById(entityConfig) : new Map()),
    [entityConfig]
  )

  const applyDefaultVisibleFilterOptions = React.useCallback((options?: FilterOption[]): void => {
    const nextVisibleFilterOptions = buildDefaultVisibleFilterOptions(options, optionIdRef)
    setVisibleFilterOptions(nextVisibleFilterOptions)
    setDefaultVisibleFilterOptions(nextVisibleFilterOptions)
    setDefaultsRevision((previous) => previous + 1)
  }, [])

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setFilterOptions(undefined)
    setVisibleFilterOptions([])
    setDefaultVisibleFilterOptions([])
    setDefaultsRevision((previous) => previous + 1)
    optionIdRef.current = 0

    if (!entityConfig) {
      return
    }

    const getData = async () => {
      await fillOptionsWithMetadataInfo(
        entityConfig.LogicalName,
        entityConfig.FilterOptions,
        relationPathById,
        (entityLogicalName, groupedMissedDisplayNames) =>
          crm?.getAttributesMetadata(entityLogicalName, groupedMissedDisplayNames)
      )
      const options = entityConfig.FilterOptions?.map((option, index) => ({
        FilterOptionConfig: option,
        optionId: getNormalizedConfigId(option.Id),
        sourceIndex: index,
      }))

      if (requestId === requestIdRef.current) {
        setFilterOptions(options)
        applyDefaultVisibleFilterOptions(options)
      }
    }

    void getData()
  }, [applyDefaultVisibleFilterOptions, crm, entityConfig, relationPathById])

  const addCondition = React.useCallback((): void => {
    setVisibleFilterOptions((previous) => [
      ...previous,
      {
        id: ++optionIdRef.current,
        option: {},
      },
    ])
  }, [])

  const removeCondition = React.useCallback((optionId: number): void => {
    setVisibleFilterOptions((previous) => previous.filter((item) => item.id !== optionId))
  }, [])

  const resetVisibleFilterOptions = React.useCallback((): void => {
    applyDefaultVisibleFilterOptions(filterOptions)
  }, [applyDefaultVisibleFilterOptions, filterOptions])

  return {
    filterOptions,
    visibleFilterOptions,
    defaultVisibleFilterOptions,
    defaultsRevision,
    setVisibleFilterOptions,
    addCondition,
    removeCondition,
    resetVisibleFilterOptions,
  }
}
