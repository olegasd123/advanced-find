import * as React from 'react'
import { EntityConfig } from '@/libs/types/app-config.types'
import { CrmData, EntityMetadata } from '@/libs/types/entity.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import { SearchTableColumn } from '@/libs/types/search.types'
import { createErrorReporter } from '@/libs/utils/error-reporter'
import { SearchService } from '@/app/crm/search-service'

const errorReporter = createErrorReporter('useSearchQuery')

interface UseSearchQueryParams {
  crmRepository: CrmData | null
  currentPresetConfig: EntityConfig | undefined
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

export const useSearchQuery = ({
  crmRepository,
  currentPresetConfig,
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
      if (!crmRepository || !currentPresetConfig) {
        return
      }

      const selectedEntityMetadata = entitiesMetadata.find(
        (entityMetadata) => entityMetadata.LogicalName === currentPresetConfig.EntityName
      )
      const entitySetName =
        selectedEntityMetadata?.EntitySetName ?? selectedEntityMetadata?.LogicalCollectionName
      if (!entitySetName) {
        setResults([])
        const userMessage = errorReporter.reportAsyncError({
          location: 'execute search',
          error: new Error('Entity collection name is missing for search request'),
          userMessage: 'Search cannot run because entity metadata is incomplete.',
          context: {
            logicalName: currentPresetConfig.EntityName,
          },
        })
        setResultsError(userMessage)
        return
      }

      const primaryIdAttribute =
        selectedEntityMetadata?.PrimaryIdAttribute ?? `${currentPresetConfig.EntityName}id`
      const requestId = ++requestIdRef.current
      const isRequestStale = (): boolean => requestId !== requestIdRef.current

      setIsResultsLoading(true)
      setResultsError(undefined)

      try {
        const searchService = new SearchService(crmRepository)
        const nextResults = await searchService.executeSearch({
          entityLogicalName: currentPresetConfig.EntityName,
          entitySetName,
          searchTableColumns,
          conditions,
          primaryIdAttribute,
          shouldStop: isRequestStale,
        })
        if (isRequestStale()) {
          return
        }

        setResults(nextResults)
      } catch (error) {
        if (isRequestStale()) {
          return
        }

        const userMessage = errorReporter.reportAsyncError({
          location: 'execute search',
          error,
          userMessage: 'Failed to load search results.',
          context: {
            logicalName: currentPresetConfig.EntityName,
            entitySetName,
          },
        })
        setResults([])
        setResultsError(userMessage)
      } finally {
        if (!isRequestStale()) {
          setIsResultsLoading(false)
        }
      }
    },
    [crmRepository, currentPresetConfig, entitiesMetadata, searchTableColumns]
  )

  return { results, isResultsLoading, resultsError, executeSearch, resetResults }
}
