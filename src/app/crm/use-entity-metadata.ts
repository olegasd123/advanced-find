import * as React from 'react'
import { EntityConfig } from '../../libs/types/app-config.types'
import { CrmData, EntityMetadata } from '../../libs/types/entity.types'
import { SearchTableColumn } from '../../libs/types/search.types'
import { createLogger } from '../../libs/utils/logger'
import { resolveSearchTableColumns } from '../../libs/utils/crm/crm-search'

const logger = createLogger('useEntityMetadata')

interface UseEntityMetadataParams {
  crmRepository: CrmData | null
  configEntities: EntityConfig[] | undefined
  currentEntityConfig: EntityConfig | undefined
}

interface UseEntityMetadataResult {
  entitiesMetadata: EntityMetadata[]
  searchTableColumns: SearchTableColumn[]
  tableColumnDisplayNames: Record<string, string>
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
      return
    }

    let isCancelled = false

    const loadEntitiesMetadata = async (): Promise<void> => {
      const metadata = await crmRepository.getEntitiesMetadata(
        configEntities.map((entity) => entity.LogicalName)
      )
      if (!isCancelled) {
        setEntitiesMetadata(metadata)
      }
    }

    loadEntitiesMetadata().catch((error) => {
      logger.error(`Failed to load entities metadata: ${error}`)
    })

    return () => {
      isCancelled = true
    }
  }, [configEntities, crmRepository])

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setTableColumnDisplayNames({})

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
      logger.error(`Failed to load table column display names: ${error}`)
    })
  }, [crmRepository, currentEntityConfig, searchTableColumns])

  return { entitiesMetadata, searchTableColumns, tableColumnDisplayNames }
}
