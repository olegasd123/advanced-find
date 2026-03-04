import * as React from 'react'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { useAppConfiguration } from '../../hooks/use-app-config'
import { EntityMetadata } from '../../libs/repositories/crm-repository'
import {
  EntityConfig,
  ResultViewDefaultSortConfig,
  ResultViewPaginationConfig,
} from '../../libs/config/app-config'
import { Select } from '../../../vendor/catalyst-ui-kit/typescript/select'
import { FilterGrid } from './filter-grid'
import { ResultGrid } from './result-grid'
import { createLogger } from '../../libs/utils/logger'
import {
  AppliedFilterCondition,
  buildCrmFilterFetchXml,
  buildCrmFetchXml,
  resolveSearchTableColumns,
  SearchTableColumn,
} from '../../libs/utils/crm-search'

const logger = createLogger('Search')
const resultIdsChunkSize = 120

interface SearchBranchPlan {
  requiresTwoPass: boolean
  branches: AppliedFilterCondition[][]
}

const normalizeResponseItems = (response: unknown): Record<string, unknown>[] => {
  const items = Array.isArray(response)
    ? response
    : response && typeof response === 'object' && 'value' in response
      ? ((response as { value?: unknown }).value ?? [])
      : []
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : []
}

const removeConditionGroupInfo = (condition: AppliedFilterCondition): AppliedFilterCondition => {
  return {
    ...condition,
    groupId: undefined,
    groupOperator: undefined,
  }
}

const buildSearchBranchPlan = (conditions: AppliedFilterCondition[]): SearchBranchPlan => {
  const groupedConditions = new Map<
    number,
    { operator: AppliedFilterCondition['groupOperator']; conditions: AppliedFilterCondition[] }
  >()
  const baseConditions: AppliedFilterCondition[] = []

  for (const condition of conditions) {
    if (condition.groupId === undefined) {
      baseConditions.push(removeConditionGroupInfo(condition))
      continue
    }

    const group = groupedConditions.get(condition.groupId)
    if (!group) {
      groupedConditions.set(condition.groupId, {
        operator: condition.groupOperator,
        conditions: [removeConditionGroupInfo(condition)],
      })
      continue
    }

    group.conditions.push(removeConditionGroupInfo(condition))
  }

  const orGroups: AppliedFilterCondition[][] = []
  for (const group of groupedConditions.values()) {
    if (group.conditions.length <= 1 || group.operator !== 'or') {
      baseConditions.push(...group.conditions)
      continue
    }

    orGroups.push(group.conditions)
  }

  if (orGroups.length === 0) {
    return { requiresTwoPass: false, branches: [baseConditions] }
  }

  let branches: AppliedFilterCondition[][] = [[]]
  for (const orGroup of orGroups) {
    const nextBranches: AppliedFilterCondition[][] = []
    for (const branch of branches) {
      for (const condition of orGroup) {
        nextBranches.push([...branch, condition])
      }
    }
    branches = nextBranches
  }

  const fullBranches = branches.map((branchConditions) => [...baseConditions, ...branchConditions])
  return { requiresTwoPass: true, branches: fullBranches }
}

const splitIntoChunks = <T,>(items: T[], chunkSize: number): T[][] => {
  if (items.length === 0) {
    return []
  }

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

export const Search = () => {
  const [entitiesMetadata, setEntitiesMetadata] = React.useState<EntityMetadata[] | undefined>([])
  const [currentEntityConfig, setCurrentEntityConfig] = React.useState<EntityConfig | undefined>()
  const [isResultViewVisible, setIsResultViewVisible] = React.useState(false)
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilterCondition[]>([])
  const [results, setResults] = React.useState<Record<string, unknown>[]>([])
  const [searchTableColumns, setSearchTableColumns] = React.useState<SearchTableColumn[]>([])
  const [tableColumnDisplayNames, setTableColumnDisplayNames] = React.useState<
    Record<string, string>
  >({})
  const [isResultsLoading, setIsResultsLoading] = React.useState(false)
  const [resultsError, setResultsError] = React.useState<string>()
  const tableColumnsRequestIdRef = React.useRef(0)

  const appConfiguration = useAppConfiguration()
  const crmRepository = useCrmRepository()

  const configEntities = appConfiguration?.SearchScheme?.Entities
  const resultViewPagination: ResultViewPaginationConfig | undefined =
    currentEntityConfig?.ResultView.Pagination
  const resultViewDefaultSort: ResultViewDefaultSortConfig[] | undefined =
    currentEntityConfig?.ResultView.DefaultSort
  const resultViewShowAppliedFilters: boolean =
    currentEntityConfig?.ResultView.ShowAppliedFilters === true

  React.useEffect(() => {
    if ((configEntities?.length ?? 0) === 1) {
      setCurrentEntityConfig(configEntities?.at(0))
    }
  }, [configEntities])

  React.useEffect(() => {
    if (!crmRepository || !configEntities) {
      setEntitiesMetadata([])
      return
    }

    const getData = async () => {
      const result = await crmRepository.getEntitiesMetadata(
        configEntities.map((i) => i.LogicalName)
      )
      setEntitiesMetadata(result)
    }

    getData().catch((error) => {
      logger.error(`Failed to load entities metadata: ${error}`)
    })
  }, [configEntities, crmRepository])

  React.useEffect(() => {
    const requestId = ++tableColumnsRequestIdRef.current
    setSearchTableColumns([])
    setTableColumnDisplayNames({})

    if (!currentEntityConfig) {
      return
    }

    const resolvedColumns = resolveSearchTableColumns(currentEntityConfig)
    setSearchTableColumns(resolvedColumns)

    if (!crmRepository) {
      return
    }

    const missingDisplayNameColumns = resolvedColumns.filter((column) => !column.displayName)

    if (missingDisplayNameColumns.length === 0) {
      return
    }

    const loadColumnDisplayNames = async (): Promise<void> => {
      const attributeNamesByEntity = missingDisplayNameColumns.reduce<Record<string, string[]>>(
        (accumulator, column) => {
          accumulator[column.entityName] = accumulator[column.entityName] ?? []
          for (const attribute of column.attributes) {
            if (!accumulator[column.entityName].includes(attribute.attributeName)) {
              accumulator[column.entityName].push(attribute.attributeName)
            }
          }
          return accumulator
        },
        {}
      )

      const metadataByEntity = await Promise.all(
        Object.entries(attributeNamesByEntity).map(async ([entityName, attributeNames]) => {
          const metadata = await crmRepository.getAttributesMetadata(entityName, attributeNames)
          return { entityName, metadata }
        })
      )

      if (requestId !== tableColumnsRequestIdRef.current) {
        return
      }

      const namesByColumnKey: Record<string, string> = {}
      for (const column of missingDisplayNameColumns) {
        const entityMetadata =
          metadataByEntity.find((item) => item.entityName === column.entityName)?.metadata ?? []
        const labels = column.attributes.map((attribute) => {
          const metadata = entityMetadata.find(
            (item) => item.LogicalName === attribute.attributeName
          )
          return metadata?.DisplayName.UserLocalizedLabel?.Label ?? attribute.attributeName
        })
        namesByColumnKey[column.columnKey] = labels.join(' | ')
      }

      setTableColumnDisplayNames(namesByColumnKey)
    }

    loadColumnDisplayNames().catch((error) => {
      logger.error(`Failed to load table column display names: ${error}`)
    })
  }, [crmRepository, currentEntityConfig])

  const handleCurrentEntityConfigChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setCurrentEntityConfig(configEntities?.at(parseInt(event.target.value, 10)))
    setIsResultViewVisible(false)
    setAppliedFilters([])
    setResults([])
    setResultsError(undefined)
  }

  const handleBackToFilters = (): void => {
    setIsResultViewVisible(false)
  }

  const handleSearch = async (conditions: AppliedFilterCondition[]): Promise<void> => {
    if (!crmRepository || !currentEntityConfig) {
      return
    }

    const selectedEntityMetadata = entitiesMetadata?.find(
      (entityMetadata) => entityMetadata.LogicalName === currentEntityConfig.LogicalName
    )
    const entitySetName =
      selectedEntityMetadata?.EntitySetName ?? selectedEntityMetadata?.LogicalCollectionName
    if (!entitySetName) {
      logger.error('Entity collection name is missing for search request', {
        logicalName: currentEntityConfig.LogicalName,
      })
      return
    }

    const tableColumns = resolveSearchTableColumns(currentEntityConfig)
    setSearchTableColumns(tableColumns)

    const branchPlan = buildSearchBranchPlan(conditions)
    const primaryIdAttribute =
      selectedEntityMetadata?.PrimaryIdAttribute ?? `${currentEntityConfig.LogicalName}id`

    logger.info(`Executing search with conditions`, {
      entitySetName,
      tableColumns,
      conditions,
      requiresTwoPass: branchPlan.requiresTwoPass,
      branchesCount: branchPlan.branches.length,
      primaryIdAttribute,
    })

    setIsResultViewVisible(true)
    setAppliedFilters(conditions)
    setIsResultsLoading(true)
    setResultsError(undefined)

    try {
      if (!branchPlan.requiresTwoPass) {
        const fetchXml = buildCrmFetchXml(
          currentEntityConfig.LogicalName,
          tableColumns,
          branchPlan.branches[0] ?? []
        )
        logger.info(`Executing single-pass search with FetchXML`, { fetchXml })
        const response = await crmRepository.getEntities(entitySetName, [], { fetchXml })
        setResults(normalizeResponseItems(response))
        return
      }

      const resultIds = new Set<string>()

      for (const branchConditions of branchPlan.branches) {
        const branchFetchXml = buildCrmFilterFetchXml(
          currentEntityConfig.LogicalName,
          branchConditions,
          [primaryIdAttribute]
        )
        logger.info(`Executing branch search with FetchXML`, { fetchXml: branchFetchXml })
        const branchResponse = await crmRepository.getEntities(entitySetName, [], {
          fetchXml: branchFetchXml,
        })
        const branchItems = normalizeResponseItems(branchResponse)
        for (const item of branchItems) {
          const rawId = item[primaryIdAttribute]
          if (rawId !== undefined && rawId !== null) {
            resultIds.add(String(rawId))
          }
        }
      }

      if (resultIds.size === 0) {
        setResults([])
        return
      }

      const resultRows: Record<string, unknown>[] = []
      for (const chunkIds of splitIntoChunks(Array.from(resultIds), resultIdsChunkSize)) {
        const idCondition: AppliedFilterCondition = {
          filterOption: {
            EntityName: currentEntityConfig.LogicalName,
            AttributeName: primaryIdAttribute,
          },
          condition: 'in',
          values: chunkIds,
        }
        const finalFetchXml = buildCrmFetchXml(currentEntityConfig.LogicalName, tableColumns, [
          idCondition,
        ])
        const finalResponse = await crmRepository.getEntities(entitySetName, [], {
          fetchXml: finalFetchXml,
        })
        resultRows.push(...normalizeResponseItems(finalResponse))
      }

      const uniqueRowsById = new Map<string, Record<string, unknown>>()
      for (const row of resultRows) {
        const rawId = row[primaryIdAttribute]
        if (rawId === undefined || rawId === null) {
          continue
        }
        uniqueRowsById.set(String(rawId), row)
      }

      setResults(Array.from(uniqueRowsById.values()))
    } catch (error) {
      logger.error(`Failed to load search results: ${error}`)
      setResults([])
      setResultsError('Failed to load search results.')
    } finally {
      setIsResultsLoading(false)
    }
  }

  return (
    <div>
      {(configEntities?.length ?? 0) > 1 && (
        <Select defaultValue="" onChange={handleCurrentEntityConfigChanged}>
          <option value="" disabled>
            Select an entity
          </option>
          {configEntities?.map((entityInfo, index) => (
            <option key={index} value={index}>
              {
                entitiesMetadata?.find(
                  (entityMetadata) => entityInfo.LogicalName === entityMetadata.LogicalName
                )?.DisplayCollectionName.UserLocalizedLabel.Label
              }
            </option>
          ))}
        </Select>
      )}

      {currentEntityConfig && (
        <div className={isResultViewVisible ? 'hidden' : ''}>
          <FilterGrid
            key={currentEntityConfig.LogicalName}
            entityConfig={currentEntityConfig}
            onSearch={handleSearch}
          />
        </div>
      )}

      {currentEntityConfig && isResultViewVisible && (
        <ResultGrid
          results={results}
          tableColumns={searchTableColumns}
          tableColumnDisplayNames={tableColumnDisplayNames}
          columnVisibilityStorageKey={currentEntityConfig.LogicalName}
          pagination={resultViewPagination}
          defaultSort={resultViewDefaultSort}
          showAppliedFilters={resultViewShowAppliedFilters}
          isLoading={isResultsLoading}
          errorMessage={resultsError}
          appliedFilters={appliedFilters}
          onBack={handleBackToFilters}
        />
      )}
    </div>
  )
}
