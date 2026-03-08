import * as React from 'react'
import { useCrmRepository } from '@/hooks/use-crm-repository'
import { useAppConfig } from '@/hooks/use-app-config'
import { useEntityMetadata } from '@/app/crm/use-entity-metadata'
import { useFilterState } from '@/app/crm/use-filter-state'
import { useSearchQuery } from '@/app/crm/use-search-query'
import { Select } from '@/components/catalyst/select'
import { FilterGrid } from '@/app/crm/filter-grid'
import { ResultGrid } from '@/app/crm/result-grid'
import { ViewErrorBoundary } from '@/app/view-error-boundary'
import { AppliedFilterCondition } from '@/libs/types/filter.types'

const MetadataSkeleton = () => (
  <div className="pt-4" role="status" aria-label="Loading entity metadata">
    <div className="mb-3 h-10 w-full rounded bg-zinc-200 animate-pulse" />
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="mb-3 h-10 w-full rounded bg-zinc-200 animate-pulse" />
    ))}
    <div className="pt-2 text-sm text-zinc-500">Loading entity metadata...</div>
  </div>
)

export const Search = () => {
  const appConfigState = useAppConfig()
  const appConfig = appConfigState.appConfig
  const crmRepository = useCrmRepository()

  const configEntities = appConfig?.SearchSchema?.Entities

  const {
    currentEntityConfig,
    isResultViewVisible,
    appliedFilters,
    selectEntityByIndex,
    openResultView,
    closeResultView,
  } = useFilterState(configEntities)

  const {
    entitiesMetadata,
    searchTableColumns,
    tableColumnDisplayNames,
    metadataErrorMessage,
    isMetadataLoading,
  } = useEntityMetadata({
    crmRepository,
    configEntities,
    currentEntityConfig,
  })

  const { results, isResultsLoading, resultsError, executeSearch, resetResults } = useSearchQuery({
    crmRepository,
    currentEntityConfig,
    entitiesMetadata,
    searchTableColumns,
  })

  React.useEffect(() => {
    resetResults()
  }, [currentEntityConfig?.LogicalName, resetResults])

  const resultViewPagination = currentEntityConfig?.ResultView.Pagination
  const resultViewDefaultSort = currentEntityConfig?.ResultView.DefaultSort
  const resultViewShowAppliedFilters = currentEntityConfig?.ResultView.ShowAppliedFilters === true

  const selectedEntityIndex = currentEntityConfig
    ? (configEntities?.findIndex(
        (entity) => entity.LogicalName === currentEntityConfig.LogicalName
      ) ?? -1)
    : -1

  const handleCurrentEntityConfigChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedIndex = parseInt(event.target.value, 10)
    if (Number.isNaN(selectedIndex)) {
      selectEntityByIndex(-1)
      return
    }

    selectEntityByIndex(selectedIndex)
  }

  const handleSearch = async (conditions: AppliedFilterCondition[]): Promise<void> => {
    if (!crmRepository || !currentEntityConfig) {
      return
    }

    openResultView(conditions)
    await executeSearch(conditions)
  }

  if (appConfigState.isLoading) {
    return <div className="py-6 text-zinc-600">Loading app configuration...</div>
  }

  if (appConfigState.errorMessage) {
    return <div className="py-6 text-rose-700">{appConfigState.errorMessage}</div>
  }

  if (!configEntities || configEntities.length === 0) {
    return <div className="py-6 text-zinc-600">No entities found in app configuration.</div>
  }

  return (
    <div>
      {configEntities.length > 1 && (
        <Select
          value={selectedEntityIndex >= 0 ? String(selectedEntityIndex) : ''}
          onChange={handleCurrentEntityConfigChanged}
        >
          <option value="" disabled>
            Select an entity
          </option>
          {configEntities.map((entityInfo, index) => (
            <option key={entityInfo.LogicalName} value={index}>
              {entitiesMetadata.find(
                (entityMetadata) => entityInfo.LogicalName === entityMetadata.LogicalName
              )?.DisplayCollectionName.UserLocalizedLabel.Label ?? entityInfo.LogicalName}
            </option>
          ))}
        </Select>
      )}

      {metadataErrorMessage && <div className="py-3 text-rose-700">{metadataErrorMessage}</div>}

      {currentEntityConfig && (
        <div className={isResultViewVisible ? 'hidden' : ''}>
          {isMetadataLoading ? (
            <MetadataSkeleton />
          ) : (
            <ViewErrorBoundary
              viewName="filter view"
              message="The filter view failed to render. Try again or reload the page."
              resetKey={`filter-${currentEntityConfig.LogicalName}`}
            >
              <FilterGrid
                key={currentEntityConfig.LogicalName}
                entityConfig={currentEntityConfig}
                onSearch={handleSearch}
              />
            </ViewErrorBoundary>
          )}
        </div>
      )}

      {currentEntityConfig && isResultViewVisible && (
        <ViewErrorBoundary
          viewName="result view"
          message="The result view failed to render. Try again or go back to filters."
          resetKey={`result-${currentEntityConfig.LogicalName}-${results.length}`}
        >
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
            onBack={closeResultView}
          />
        </ViewErrorBoundary>
      )}
    </div>
  )
}
