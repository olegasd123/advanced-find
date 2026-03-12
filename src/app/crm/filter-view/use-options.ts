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
import { Option, VisibleOption } from '@/app/crm/filter-view/grid.helpers'

const logger = createLogger('filter-utils')

interface UseOptionsResult {
  filterOptions: Option[] | undefined
  visibleFilterOptions: VisibleOption[]
  defaultVisibleFilterOptions: VisibleOption[]
  defaultsRevision: number
  setVisibleFilterOptions: React.Dispatch<React.SetStateAction<VisibleOption[]>>
  addCondition: () => void
  removeCondition: (optionId: number) => void
  resetVisibleFilterOptions: () => void
}

const buildDefaultVisibleOptions = (
  options: Option[] | undefined,
  optionIdRef: React.MutableRefObject<number>
): VisibleOption[] => {
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

export const useOptions = ({ entityConfig }: { entityConfig?: EntityConfig }): UseOptionsResult => {
  const [filterOptions, setFilterOptions] = React.useState<Option[]>()
  const [visibleFilterOptions, setVisibleFilterOptions] = React.useState<VisibleOption[]>([])
  const [defaultVisibleFilterOptions, setDefaultVisibleFilterOptions] = React.useState<
    VisibleOption[]
  >([])
  const [defaultsRevision, setDefaultsRevision] = React.useState(0)
  const crm = useCrmRepository()
  const requestIdRef = React.useRef(0)
  const optionIdRef = React.useRef(0)
  const relationPathById = React.useMemo(
    () => (entityConfig ? getRelationPathById(entityConfig) : new Map()),
    [entityConfig]
  )

  const applyDefaultVisibleOptions = React.useCallback((options?: Option[]): void => {
    const nextVisibleFilterOptions = buildDefaultVisibleOptions(options, optionIdRef)
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
        applyDefaultVisibleOptions(options)
      }
    }

    void getData()
  }, [applyDefaultVisibleOptions, crm, entityConfig, relationPathById])

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
    applyDefaultVisibleOptions(filterOptions)
  }, [applyDefaultVisibleOptions, filterOptions])

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
