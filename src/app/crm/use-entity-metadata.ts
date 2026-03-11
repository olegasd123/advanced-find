import * as React from 'react'
import { EntityConfig } from '@/libs/types/app-config.types'
import { CrmData, EntityMetadata } from '@/libs/types/entity.types'
import { SearchTableColumn } from '@/libs/types/search.types'
import { createErrorReporter } from '@/libs/utils/error-reporter'
import { resolveSearchTableColumns } from '@/libs/utils/crm/crm-search'
import {
  buildAppConfigMetadataValidationPlan,
  buildAppConfigValidationUserMessage,
} from '@/libs/utils/app-config-validator'

const errorReporter = createErrorReporter('useEntityMetadata')

interface UseEntityMetadataParams {
  crmRepository: CrmData | null
  configPresets: EntityConfig[] | undefined
  currentPresetConfig: EntityConfig | undefined
}

interface UseEntityMetadataResult {
  entitiesMetadata: EntityMetadata[]
  searchTableColumns: SearchTableColumn[]
  tableColumnDisplayNames: Record<string, string>
  metadataErrorMessage: string | undefined
  isMetadataLoading: boolean
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export const useEntityMetadata = ({
  crmRepository,
  configPresets,
  currentPresetConfig,
}: UseEntityMetadataParams): UseEntityMetadataResult => {
  const [entitiesMetadata, setEntitiesMetadata] = React.useState<EntityMetadata[]>([])
  const [tableColumnDisplayNames, setTableColumnDisplayNames] = React.useState<
    Record<string, string>
  >({})
  const [entitiesMetadataErrorMessage, setEntitiesMetadataErrorMessage] = React.useState<string>()
  const [tableColumnNamesErrorMessage, setTableColumnNamesErrorMessage] = React.useState<string>()
  const [isEntitiesMetadataLoading, setIsEntitiesMetadataLoading] = React.useState(false)
  const [isTableColumnNamesLoading, setIsTableColumnNamesLoading] = React.useState(false)
  const requestIdRef = React.useRef(0)
  const appConfigValidationPlan = React.useMemo(
    () => buildAppConfigMetadataValidationPlan(configPresets),
    [configPresets]
  )

  const searchTableColumns = React.useMemo(() => {
    if (!currentPresetConfig) {
      return []
    }

    return resolveSearchTableColumns(currentPresetConfig)
  }, [currentPresetConfig])

  React.useEffect(() => {
    if (!crmRepository || !configPresets) {
      setEntitiesMetadata([])
      setEntitiesMetadataErrorMessage(undefined)
      setIsEntitiesMetadataLoading(false)
      return
    }

    let isCancelled = false
    setEntitiesMetadataErrorMessage(undefined)
    setIsEntitiesMetadataLoading(true)

    const loadEntitiesMetadata = async (): Promise<void> => {
      try {
        const metadata = await crmRepository.getEntitiesMetadata(
          appConfigValidationPlan.configuredEntityNames
        )
        if (isCancelled) {
          return
        }

        const configIssues = [...appConfigValidationPlan.issues]
        const metadataByLogicalName = new Set(metadata.map((item) => item.LogicalName))
        const missingEntityNames = appConfigValidationPlan.configuredEntityNames.filter(
          (entityName) => !metadataByLogicalName.has(entityName)
        )

        for (const entityName of missingEntityNames) {
          configIssues.push(`Entity "${entityName}" was not found in CRM metadata.`)
        }

        for (const [
          entityLogicalName,
          attributeLogicalNames,
        ] of appConfigValidationPlan.requiredAttributesByEntity.entries()) {
          if (isCancelled) {
            return
          }

          try {
            const attributesMetadata = await crmRepository.getAttributesMetadata(
              entityLogicalName,
              attributeLogicalNames
            )
            const existingAttributeNames = new Set(
              attributesMetadata.map((item) => item.LogicalName)
            )
            const missingAttributeNames = attributeLogicalNames.filter(
              (attributeLogicalName) => !existingAttributeNames.has(attributeLogicalName)
            )
            if (missingAttributeNames.length > 0) {
              configIssues.push(
                `Entity "${entityLogicalName}" has unknown attribute(s): ${missingAttributeNames.join(', ')}.`
              )
            }
          } catch (error) {
            const errorMessage = getErrorMessage(error)
            if (errorMessage.includes('does not exist')) {
              configIssues.push(`Entity "${entityLogicalName}" was not found in CRM metadata.`)
            } else {
              configIssues.push(
                `Failed to load attributes metadata for entity "${entityLogicalName}".`
              )
            }
          }
        }

        const uniqueConfigIssues = Array.from(new Set(configIssues))
        const userValidationMessage = buildAppConfigValidationUserMessage(uniqueConfigIssues)
        if (!isCancelled) {
          if (userValidationMessage) {
            setEntitiesMetadataErrorMessage(
              errorReporter.reportAsyncError({
                location: 'validate app configuration',
                error: new Error(uniqueConfigIssues.join(' ')),
                userMessage: userValidationMessage,
                context: { issues: uniqueConfigIssues },
              })
            )
          } else {
            setEntitiesMetadataErrorMessage(undefined)
          }

          setEntitiesMetadata(metadata)
        }
      } finally {
        if (!isCancelled) {
          setIsEntitiesMetadataLoading(false)
        }
      }
    }

    loadEntitiesMetadata().catch((error) => {
      if (isCancelled) {
        return
      }
      setIsEntitiesMetadataLoading(false)
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
  }, [appConfigValidationPlan, configPresets, crmRepository])

  React.useEffect(() => {
    const requestId = ++requestIdRef.current
    setTableColumnDisplayNames({})
    setTableColumnNamesErrorMessage(undefined)
    setIsTableColumnNamesLoading(false)

    if (!crmRepository || !currentPresetConfig) {
      return
    }

    const missingDisplayNameColumns = searchTableColumns.filter((column) => !column.displayName)
    if (missingDisplayNameColumns.length === 0) {
      return
    }
    setIsTableColumnNamesLoading(true)

    const loadColumnDisplayNames = async (): Promise<void> => {
      try {
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
      } finally {
        if (requestId === requestIdRef.current) {
          setIsTableColumnNamesLoading(false)
        }
      }
    }

    loadColumnDisplayNames().catch((error) => {
      if (requestId !== requestIdRef.current) {
        return
      }
      const userMessage = errorReporter.reportAsyncError({
        location: 'load table column display names',
        error,
        userMessage: 'Failed to load table column names.',
        context: { entityName: currentPresetConfig.EntityName },
      })
      setTableColumnNamesErrorMessage(userMessage)
    })
  }, [crmRepository, currentPresetConfig, searchTableColumns])

  const metadataErrorMessage = entitiesMetadataErrorMessage ?? tableColumnNamesErrorMessage
  const isMetadataLoading = isEntitiesMetadataLoading || isTableColumnNamesLoading

  return {
    entitiesMetadata,
    searchTableColumns,
    tableColumnDisplayNames,
    metadataErrorMessage,
    isMetadataLoading,
  }
}
