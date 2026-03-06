import * as React from 'react'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { useAppConfig } from '../../hooks/use-app-config'
import { useEntityMetadata } from './use-entity-metadata'
import { useFilterState } from './use-filter-state'
import { useSearchQuery } from './use-search-query'
import { Select } from '../../components/catalyst/select'
import { FilterGrid } from './filter-grid'
import { ResultGrid } from './result-grid'
import { AppliedFilterCondition } from '../../libs/utils/crm/crm-search'

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

  const { entitiesMetadata, searchTableColumns, tableColumnDisplayNames } = useEntityMetadata({
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
    ? (configEntities?.findIndex((entity) => entity.LogicalName === currentEntityConfig.LogicalName) ??
      -1)
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
              {entitiesMetadata.find((entityMetadata) => entityInfo.LogicalName === entityMetadata.LogicalName)
                ?.DisplayCollectionName.UserLocalizedLabel.Label ?? entityInfo.LogicalName}
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
          onBack={closeResultView}
        />
      )}
    </div>
  )
}
