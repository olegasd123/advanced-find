import * as React from 'react'
import { EntityConfig } from '../../libs/config/app-config'
import { CrmData, EntityMetadata } from '../../libs/data/crm/crm-repository'
import { createLogger } from '../../libs/utils/logger'
import {
  AppliedFilterCondition,
  buildCrmFilterFetchXml,
  buildCrmFetchXml,
  SearchTableColumn,
} from '../../libs/utils/crm/crm-search'

const logger = createLogger('useSearchQuery')
const resultIdsChunkSize = 120

interface SearchBranchPlan {
  requiresTwoPass: boolean
  branches: AppliedFilterCondition[][]
}

interface UseSearchQueryParams {
  crmRepository: CrmData | null
  currentEntityConfig: EntityConfig | undefined
  entitiesMetadata: EntityMetadata[]
  searchTableColumns: SearchTableColumn[]
}

interface UseSearchQueryResult {
  results: Record<string, unknown>[]
  isResultsLoading: boolean
  resultsError: string | undefined
  executeSearch: (conditions: AppliedFilterCondition[]) => Promise<void>
  resetResults: () => void
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

export const useSearchQuery = ({
  crmRepository,
  currentEntityConfig,
  entitiesMetadata,
  searchTableColumns,
}: UseSearchQueryParams): UseSearchQueryResult => {
  const [results, setResults] = React.useState<Record<string, unknown>[]>([])
  const [isResultsLoading, setIsResultsLoading] = React.useState(false)
  const [resultsError, setResultsError] = React.useState<string>()
  const requestIdRef = React.useRef(0)

  const resetResults = React.useCallback((): void => {
    requestIdRef.current += 1
    setResults([])
    setIsResultsLoading(false)
    setResultsError(undefined)
  }, [])

  const executeSearch = React.useCallback(
    async (conditions: AppliedFilterCondition[]): Promise<void> => {
      if (!crmRepository || !currentEntityConfig) {
        return
      }

      const selectedEntityMetadata = entitiesMetadata.find(
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

      const branchPlan = buildSearchBranchPlan(conditions)
      const primaryIdAttribute =
        selectedEntityMetadata?.PrimaryIdAttribute ?? `${currentEntityConfig.LogicalName}id`
      const requestId = ++requestIdRef.current
      const isRequestStale = (): boolean => requestId !== requestIdRef.current

      logger.info(`Executing search with conditions`, {
        entitySetName,
        tableColumns: searchTableColumns,
        conditions,
        requiresTwoPass: branchPlan.requiresTwoPass,
        branchesCount: branchPlan.branches.length,
        primaryIdAttribute,
      })

      setIsResultsLoading(true)
      setResultsError(undefined)

      try {
        if (!branchPlan.requiresTwoPass) {
          const fetchXml = buildCrmFetchXml(
            currentEntityConfig.LogicalName,
            searchTableColumns,
            branchPlan.branches[0] ?? []
          )
          logger.info(`Executing single-pass search with FetchXML`, { fetchXml })
          const response = await crmRepository.getEntities(entitySetName, [], { fetchXml })
          if (isRequestStale()) {
            return
          }

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
          if (isRequestStale()) {
            return
          }

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
          const finalFetchXml = buildCrmFetchXml(currentEntityConfig.LogicalName, searchTableColumns, [
            idCondition,
          ])
          const finalResponse = await crmRepository.getEntities(entitySetName, [], {
            fetchXml: finalFetchXml,
          })
          if (isRequestStale()) {
            return
          }
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
        if (isRequestStale()) {
          return
        }
        logger.error(`Failed to load search results: ${error}`)
        setResults([])
        setResultsError('Failed to load search results.')
      } finally {
        if (!isRequestStale()) {
          setIsResultsLoading(false)
        }
      }
    },
    [crmRepository, currentEntityConfig, entitiesMetadata, searchTableColumns]
  )

  return { results, isResultsLoading, resultsError, executeSearch, resetResults }
}
