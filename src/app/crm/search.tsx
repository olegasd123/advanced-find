import * as React from 'react'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { useAppConfiguration } from '../../hooks/use-app-config'
import { EntityMetadata } from '../../libs/repositories/crm-repository'
import { EntityConfig, ResultViewPaginationConfig } from '../../libs/config/app-config'
import { Select } from '../../../vendor/catalyst-ui-kit/typescript/select'
import { FilterGrid } from './filter-grid'
import { ResultGrid } from './result-grid'
import { createLogger } from '../../libs/utils/logger'
import {
  AppliedFilterCondition,
  buildCrmFetchXml,
  resolveSearchTableColumns,
  SearchTableColumn,
} from '../../libs/utils/crm-search'

const logger = createLogger('Search')

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
          const metadata = entityMetadata.find((item) => item.LogicalName === attribute.attributeName)
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
    const fetchXml = buildCrmFetchXml(currentEntityConfig.LogicalName, tableColumns, conditions)
    setSearchTableColumns(tableColumns)

    logger.info(`Executing search with conditions`, {
      entitySetName,
      tableColumns,
      conditions,
      fetchXml,
    })

    setIsResultViewVisible(true)
    setAppliedFilters(conditions)
    setIsResultsLoading(true)
    setResultsError(undefined)

    try {
      const response = await crmRepository.getEntities(entitySetName, [], { fetchXml })
      const items = Array.isArray(response)
        ? response
        : response && typeof response === 'object' && 'value' in response
          ? ((response as { value?: unknown }).value ?? [])
          : []
      setResults(Array.isArray(items) ? (items as Record<string, unknown>[]) : [])
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
          isLoading={isResultsLoading}
          errorMessage={resultsError}
          appliedFilters={appliedFilters}
          onBack={handleBackToFilters}
        />
      )}
    </div>
  )
}
