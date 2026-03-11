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
import { removeAppliedFilterValue } from '@/app/crm/result-grid.helpers'

const MetadataSkeleton = () => (
  <div className="pt-4" role="status" aria-label="Loading entity metadata">
    <div className="rounded border border-zinc-200 bg-white p-4">
      <div className="mb-4 h-4 w-56 rounded bg-zinc-200 animate-pulse" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="mb-3 grid grid-cols-12 gap-3 last:mb-0">
          <div className="col-span-4 h-4 rounded bg-zinc-200 animate-pulse" />
          <div className="col-span-2 h-4 rounded bg-zinc-200 animate-pulse" />
          <div className="col-span-6 h-4 rounded bg-zinc-200 animate-pulse" />
        </div>
      ))}
    </div>
    <div className="pt-2 text-sm text-zinc-400">Loading entity metadata...</div>
  </div>
)

export const Search = () => {
  const appConfigState = useAppConfig()
  const appConfig = appConfigState.appConfig
  const crmRepository = useCrmRepository()

  const configPresets = appConfig?.CrmSearchSchema?.Presets
  const activePresets = React.useMemo(
    () => configPresets?.filter((preset) => preset.IsActive !== false) ?? [],
    [configPresets]
  )

  const {
    currentPresetConfig,
    isResultViewVisible,
    appliedFilters,
    selectPresetByIndex,
    openResultView,
    closeResultView,
    updateAppliedFilters,
  } = useFilterState(activePresets)

  const {
    entitiesMetadata,
    searchTableColumns,
    tableColumnDisplayNames,
    metadataErrorMessage,
    isMetadataLoading,
  } = useEntityMetadata({
    crmRepository,
    configPresets: activePresets,
    currentPresetConfig,
  })

  const { results, isResultsLoading, resultsError, executeSearch, resetResults } = useSearchQuery({
    crmRepository,
    currentPresetConfig,
    entitiesMetadata,
    searchTableColumns,
  })

  React.useEffect(() => {
    resetResults()
  }, [currentPresetConfig, resetResults])

  const resultViewPagination = currentPresetConfig?.ResultView.Pagination
  const resultViewDefaultSort = currentPresetConfig?.ResultView.DefaultSort
  const resultViewShowAppliedFilters = currentPresetConfig?.ResultView.ShowAppliedFilters === true

  const selectedPresetIndex = currentPresetConfig
    ? activePresets.findIndex((preset) => preset === currentPresetConfig)
    : -1
  const currentPresetKey = currentPresetConfig
    ? `${currentPresetConfig.EntityName}-${selectedPresetIndex >= 0 ? selectedPresetIndex : 'selected'}`
    : ''

  const handleCurrentPresetChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedIndex = parseInt(event.target.value, 10)
    if (Number.isNaN(selectedIndex)) {
      selectPresetByIndex(-1)
      return
    }

    selectPresetByIndex(selectedIndex)
  }

  const handleSearch = async (conditions: AppliedFilterCondition[]): Promise<void> => {
    if (!crmRepository || !currentPresetConfig) {
      return
    }

    openResultView(conditions)
    await executeSearch(conditions)
  }

  const handleRemoveFilterValue = async (
    filterIndex: number,
    valueIndex: number | undefined
  ): Promise<void> => {
    const nextFilters = removeAppliedFilterValue(appliedFilters, filterIndex, valueIndex)
    updateAppliedFilters(nextFilters)
    await executeSearch(nextFilters)
  }

  if (appConfigState.isLoading) {
    return <div className="py-6 text-zinc-600">Loading app configuration...</div>
  }

  if (appConfigState.errorMessage) {
    return <div className="py-6 text-rose-700">{appConfigState.errorMessage}</div>
  }

  if (activePresets.length === 0) {
    return <div className="py-6 text-zinc-600">No active presets found in app configuration.</div>
  }

  return (
    <div>
      {activePresets.length > 1 && (
        <Select
          value={selectedPresetIndex >= 0 ? String(selectedPresetIndex) : ''}
          onChange={handleCurrentPresetChanged}
        >
          <option value="" disabled>
            Select preset
          </option>
          {activePresets.map((presetInfo, index) => (
            <option key={`${presetInfo.EntityName}-${index}`} value={index}>
              {presetInfo.DisplayName ??
                entitiesMetadata.find(
                  (entityMetadata) => presetInfo.EntityName === entityMetadata.LogicalName
                )?.DisplayCollectionName.UserLocalizedLabel.Label ??
                presetInfo.EntityName}
            </option>
          ))}
        </Select>
      )}

      {metadataErrorMessage && <div className="py-3 text-rose-700">{metadataErrorMessage}</div>}

      {currentPresetConfig && (
        <div className={isResultViewVisible ? 'hidden' : ''}>
          {isMetadataLoading ? (
            <MetadataSkeleton />
          ) : (
            <ViewErrorBoundary
              viewName="filter view"
              message="The filter view failed to render. Try again or reload the page."
              resetKey={`filter-${currentPresetKey}`}
            >
              <FilterGrid
                key={currentPresetKey}
                entityConfig={currentPresetConfig}
                onSearch={handleSearch}
              />
            </ViewErrorBoundary>
          )}
        </div>
      )}

      {currentPresetConfig && isResultViewVisible && (
        <ViewErrorBoundary
          viewName="result view"
          message="The result view failed to render. Try again or go back to filters."
          resetKey={`result-${currentPresetKey}-${results.length}`}
        >
          <ResultGrid
            results={results}
            tableColumns={searchTableColumns}
            tableColumnDisplayNames={tableColumnDisplayNames}
            columnVisibilityStorageKey={currentPresetKey}
            pagination={resultViewPagination}
            defaultSort={resultViewDefaultSort}
            showAppliedFilters={resultViewShowAppliedFilters}
            isLoading={isResultsLoading}
            errorMessage={resultsError}
            appliedFilters={appliedFilters}
            onRemoveFilterValue={handleRemoveFilterValue}
            onBack={closeResultView}
          />
        </ViewErrorBoundary>
      )}
    </div>
  )
}
