import * as React from 'react'
import { EntityConfig } from '@/libs/types/app-config.types'
import { CrmData, EntityMetadata } from '@/libs/types/entity.types'
import { SearchTableColumn } from '@/libs/types/search.types'
import { createErrorReporter } from '@/libs/utils/error-reporter'
import { resolveSearchTableColumns } from '@/libs/utils/crm/crm-search'

const errorReporter = createErrorReporter('useEntityMetadata')

interface UseEntityMetadataParams {
  crmRepository: CrmData | null
  configEntities: EntityConfig[] | undefined
  currentEntityConfig: EntityConfig | undefined
}

interface UseEntityMetadataResult {
  entitiesMetadata: EntityMetadata[]
  searchTableColumns: SearchTableColumn[]
  tableColumnDisplayNames: Record<string, string>
  metadataErrorMessage: string | undefined
}

export const useEntityMetadata = ({
  crmRepository,
  configEntities,
  currentEntityConfig,
}: UseEntityMetadataParams): UseEntityMetadataResult => {
  const [entitiesMetadata, setEntitiesMetadata] = React.useState<EntityMetadata[]>([])
  const [tableColumnDisplayNames, setTableColumnDisplayNames] = React.useState<
    Record<string, string>
  >({})
  const [entitiesMetadataErrorMessage, setEntitiesMetadataErrorMessage] = React.useState<string>()
  const [tableColumnNamesErrorMessage, setTableColumnNamesErrorMessage] = React.useState<string>()
  const requestIdRef = React.useRef(0)

  const searchTableColumns = React.useMemo(() => {
    if (!currentEntityConfig) {
      return []
    }

    return resolveSearchTableColumns(currentEntityConfig)
  }, [currentEntityConfig])

  React.useEffect(() => {
    if (!crmRepository || !configEntities) {
      setEntitiesMetadata([])
      setEntitiesMetadataErrorMessage(undefined)
      return
    }

    let isCancelled = false
    setEntitiesMetadataErrorMessage(undefined)

    const loadEntitiesMetadata = async (): Promise<void> => {
      const metadata = await crmRepository.getEntitiesMetadata(
        configEntities.map((entity) => entity.LogicalName)
      )
      if (!isCancelled) {
        setEntitiesMetadata(metadata)
      }
    }

    loadEntitiesMetadata().catch((error) => {
      if (isCancelled) {
        return
      }
      const userMessage = errorReporter.reportAsyncError({
        location: 'load entities metadata',
        error,
        userMessage: 'Failed to load entity metadata.',
      })
      setEntitiesMetadataErrorMessage(userMessage)
    })

    return () => {
      isCancelled = true
    }
  }, [configEntities, crmRepository])

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setTableColumnDisplayNames({})
    setTableColumnNamesErrorMessage(undefined)

    if (!crmRepository || !currentEntityConfig) {
      return
    }

    const missingDisplayNameColumns = searchTableColumns.filter((column) => !column.displayName)
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

      if (requestId !== requestIdRef.current) {
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
      if (requestId !== requestIdRef.current) {
        return
      }
      const userMessage = errorReporter.reportAsyncError({
        location: 'load table column display names',
        error,
        userMessage: 'Failed to load table column names.',
        context: { entityLogicalName: currentEntityConfig.LogicalName },
      })
      setTableColumnNamesErrorMessage(userMessage)
    })
  }, [crmRepository, currentEntityConfig, searchTableColumns])

  const metadataErrorMessage = entitiesMetadataErrorMessage ?? tableColumnNamesErrorMessage

  return { entitiesMetadata, searchTableColumns, tableColumnDisplayNames, metadataErrorMessage }
}
