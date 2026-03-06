import { EntityConfig, RelationPathStepConfig, TableColumnConfig } from '../../config/app-config'
import { SearchTableColumn } from '../../types/search.types'
export type { SearchTableColumn, SearchTableColumnAttribute } from '../../types/search.types'
import {
  getNormalizedConfigId,
  getPathTargetEntityName,
  getRelationPathById,
  resolveConfigPath,
} from './relation-path'

interface LegacyTableColumnConfig extends TableColumnConfig {
  Attributes?: string[]
  AttributeName?: string
}

export const getTableColumnChain = (
  column: TableColumnConfig | undefined,
  relationPathById: Map<string, RelationPathStepConfig[]> = new Map()
): RelationPathStepConfig[] => {
  if (!column) {
    return []
  }

  return resolveConfigPath(relationPathById, column.PathId, column.Path)
}

export const getTargetTableColumn = (
  entityConfig: EntityConfig,
  column: TableColumnConfig | undefined,
  relationPathById: Map<string, RelationPathStepConfig[]> = getRelationPathById(entityConfig)
): { EntityName: string } | undefined => {
  if (!column) {
    return undefined
  }

  const chain = getTableColumnChain(column, relationPathById)
  return {
    EntityName: getPathTargetEntityName(entityConfig.LogicalName, chain),
  }
}

const getTableColumnDisplayName = (column: TableColumnConfig): string | undefined => {
  const displayName = column.DisplayName?.trim()
  return displayName ? displayName : undefined
}

const getLegacyAttributeName = (column?: TableColumnConfig): string | undefined => {
  const attributeName = (column as LegacyTableColumnConfig | undefined)?.AttributeName
  if (!attributeName) {
    return undefined
  }

  const normalizedAttributeName = attributeName.trim()
  return normalizedAttributeName.length > 0 ? normalizedAttributeName : undefined
}

const getTableColumnAttributes = (column?: TableColumnConfig): string[] => {
  if (!column) {
    return []
  }

  const attributeNames =
    column.AttributeNames ?? (column as LegacyTableColumnConfig | undefined)?.Attributes ?? []

  return attributeNames
    .filter((attributeName): attributeName is string => typeof attributeName === 'string')
    .map((attributeName) => attributeName.trim())
    .filter((attributeName) => attributeName.length > 0)
}

const getResolvedTableColumnAttributes = (column: TableColumnConfig): string[] => {
  const sourceAttributes = getTableColumnAttributes(column)
  if (sourceAttributes.length > 0) {
    return sourceAttributes
  }

  const sourceLegacyAttributeName = getLegacyAttributeName(column)
  if (sourceLegacyAttributeName) {
    return [sourceLegacyAttributeName]
  }

  return []
}

const getTableColumnAttributesFormat = (column: TableColumnConfig): string | undefined => {
  const attributesFormat = column.AttributeFormat?.trim()
  return attributesFormat ? attributesFormat : undefined
}

export const createColumnKey = (columnIndex: number): string => {
  return `col_${columnIndex}`
}

export const createColumnValueKey = (
  columnIndex: number,
  attributeName: string,
  attributeIndex: number
): string => {
  const normalizedAttributeName = attributeName.replace(/[^a-zA-Z0-9_]/g, '_')
  return `col_${columnIndex}_${normalizedAttributeName}_${attributeIndex}`
}

export const createRootSearchColumn = (attributeName: string, index: number): SearchTableColumn => {
  return {
    sourceColumn: {
      AttributeNames: [attributeName],
    },
    columnKey: createColumnKey(index),
    chain: [],
    attributes: [
      {
        attributeName,
        valueKey: attributeName,
      },
    ],
    entityName: '',
    isRootColumn: true,
  }
}

export const resolveSearchTableColumns = (entityConfig: EntityConfig): SearchTableColumn[] => {
  const relationPathById = getRelationPathById(entityConfig)

  return entityConfig.ResultView.Columns.map((column, index) => {
    const chain = getTableColumnChain(column, relationPathById)
    const attributeNames = getResolvedTableColumnAttributes(column)
    const entityName = getPathTargetEntityName(entityConfig.LogicalName, chain)
    const isRootColumn = chain.length === 0
    const attributes = attributeNames.map((attributeName, attributeIndex) => ({
      attributeName,
      valueKey: isRootColumn
        ? attributeName
        : createColumnValueKey(index, attributeName, attributeIndex),
    }))

    return {
      sourceColumn: column,
      id: getNormalizedConfigId(column.Id),
      columnKey: createColumnKey(index),
      chain,
      attributes,
      attributesFormat: getTableColumnAttributesFormat(column),
      entityName,
      displayName: getTableColumnDisplayName(column),
      isRootColumn,
    }
  }).filter((column) => column.attributes.length > 0)
}

export const getSearchSelectColumns = (entityConfig: EntityConfig): string[] => {
  const uniqueColumns = new Set<string>()
  for (const column of resolveSearchTableColumns(entityConfig)) {
    for (const attribute of column.attributes) {
      uniqueColumns.add(attribute.attributeName)
    }
  }
  return Array.from(uniqueColumns)
}
