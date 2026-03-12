import * as React from 'react'
import { AttributeMetadata } from '@/libs/types/entity.types'
import {
  EntityConfig,
  FilterOptionConfig,
  RelationPathStepConfig,
} from '@/libs/types/app-config.types'
import { createLogger } from '@/libs/utils/logger'
import {
  getNormalizedConfigId,
  getPathTargetEntityName,
  getRelationPathById,
  resolveConfigPath,
} from '@/libs/utils/crm/relation-path'
import { useCrmRepository } from '@/hooks/use-crm-repository'
import { FilterOption, VisibleFilterOption } from '@/app/crm/filter-view/filter-grid.helpers'

const logger = createLogger('filter-utils')

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

const fillOptionsWithMetadataInfo = async (
  currentEntity?: string,
  filterOptions?: FilterOptionConfig[],
  relationPathById?: Map<string, RelationPathStepConfig[]>,
  getAttributeMetadata?: (
    entityLogicalName: string,
    attributesLogicalNames: string[]
  ) => Promise<AttributeMetadata[]> | undefined
) => {
  const resolvedPathById = relationPathById ?? new Map<string, RelationPathStepConfig[]>()
  const attributesNames = filterOptions
    ?.map((filterOption) => {
      if (filterOption && filterOption.AttributeName) {
        const relationPath = resolveConfigPath(
          resolvedPathById,
          filterOption.PathId,
          filterOption.Path
        )
        if (relationPath.length > 0) {
          filterOption.Path = relationPath
        }

        if (!filterOption.EntityName && currentEntity) {
          filterOption.EntityName = getPathTargetEntityName(currentEntity, relationPath)
        }
      }
      return filterOption
    })
    .filter((i) => typeof i !== 'undefined')

  if ((attributesNames?.length ?? 0) > 0) {
    const groupedAttributesNames = attributesNames?.reduce((p, c) => {
      if (c?.EntityName && c?.AttributeName) {
        p[c.EntityName!] = p[c.EntityName!] || []

        if (!p[c.EntityName!].includes(c.AttributeName!)) {
          p[c.EntityName!].push(c.AttributeName)
        }
      }
      return p
    }, Object.create(null))

    for (const entityName of Object.keys(groupedAttributesNames)) {
      const attributesMetadata = await getAttributeMetadata?.(
        entityName,
        groupedAttributesNames[entityName]
      )
      for (const attributeName of groupedAttributesNames[entityName]) {
        for (const filterOption of filterOptions!) {
          if (
            filterOption?.EntityName === entityName &&
            filterOption?.AttributeName === attributeName
          ) {
            const attributeMetadata = attributesMetadata?.find(
              (i) => i.LogicalName === attributeName
            )
            filterOption.AttributeType = attributeMetadata?.AttributeType
            if (!filterOption.DisplayName) {
              filterOption.DisplayName = attributeMetadata?.DisplayName.UserLocalizedLabel?.Label
            }
          }
        }
      }
    }

    logger.info(`filterOptions`, { filterOptions })
  }
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
        entityConfig.EntityName,
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
