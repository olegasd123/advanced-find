import { EntityConfig, TableColumnConfig } from '../../config/app-config'

export interface SearchTableColumnAttribute {
  attributeName: string
  valueKey: string
}

export interface SearchTableColumn {
  sourceColumn: TableColumnConfig
  columnKey: string
  chain: TableColumnConfig[]
  attributes: SearchTableColumnAttribute[]
  attributesFormat?: string
  entityName: string
  displayName?: string
  isRootColumn: boolean
}

interface LegacyTableColumnConfig extends TableColumnConfig {
  Attributes?: string[]
  AttributeName?: string
}

export const getTableColumnChain = (column?: TableColumnConfig): TableColumnConfig[] => {
  if (!column) {
    return []
  }

  const chain: TableColumnConfig[] = []
  let current: TableColumnConfig | undefined = column
  while (current) {
    chain.push(current)
    current = current.RelatedTo
  }

  return chain
}

export const getTargetTableColumn = (column?: TableColumnConfig): TableColumnConfig | undefined => {
  if (!column) {
    return undefined
  }

  if (column.RelatedTo) {
    return getTargetTableColumn(column.RelatedTo)
  }

  return column
}

const getTableColumnDisplayName = (chain: TableColumnConfig[]): string | undefined => {
  for (let index = chain.length - 1; index >= 0; index--) {
    const displayName = chain[index].DisplayName
    if (displayName && displayName.length > 0) {
      return displayName
    }
  }

  return undefined
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

const getResolvedTableColumnAttributes = (
  column: TableColumnConfig,
  targetColumn?: TableColumnConfig
): string[] => {
  const targetAttributes = getTableColumnAttributes(targetColumn)
  if (targetAttributes.length > 0) {
    return targetAttributes
  }

  const targetLegacyAttributeName = getLegacyAttributeName(targetColumn)
  if (targetLegacyAttributeName) {
    return [targetLegacyAttributeName]
  }

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

const getTableColumnAttributesFormat = (chain: TableColumnConfig[]): string | undefined => {
  for (let index = chain.length - 1; index >= 0; index--) {
    const attributesFormat = chain[index].AttributesFormat
    if (attributesFormat && attributesFormat.trim().length > 0) {
      return attributesFormat
    }
  }

  return undefined
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
    chain: [
      {
        AttributeNames: [attributeName],
      },
    ],
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
  return entityConfig.ResultView.TableColumns.map((column, index) => {
    const chain = getTableColumnChain(column)
    const targetColumn = getTargetTableColumn(column)
    const attributeNames = getResolvedTableColumnAttributes(column, targetColumn)
    const entityName = targetColumn?.EntityName ?? entityConfig.LogicalName
    const isRootColumn =
      chain.length <= 1 &&
      (!targetColumn?.EntityName || targetColumn.EntityName === entityConfig.LogicalName)
    const attributes = attributeNames.map((attributeName, attributeIndex) => ({
      attributeName,
      valueKey: isRootColumn
        ? attributeName
        : createColumnValueKey(index, attributeName, attributeIndex),
    }))

    return {
      sourceColumn: column,
      columnKey: createColumnKey(index),
      chain,
      attributes,
      attributesFormat: getTableColumnAttributesFormat(chain),
      entityName,
      displayName: getTableColumnDisplayName(chain),
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
