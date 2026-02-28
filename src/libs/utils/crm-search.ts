import { EntityConfig, FilterOptionConfig, TableColumnConfig } from '../config/app-config'
import { getTargetFilterOption } from './filter'

export type ConditionValue = string | number

export interface AppliedFilterCondition {
  filterOption?: FilterOptionConfig
  condition?: string | null
  values: ConditionValue[]
  isDisabled?: boolean
}

export interface SearchTableColumn {
  sourceColumn: TableColumnConfig
  chain: TableColumnConfig[]
  attributeName: string
  entityName: string
  displayName?: string
  valueKey: string
  isRootColumn: boolean
}

interface LinkPathItem {
  EntityName?: string
  FromAttribute?: string
  ToAttribute?: string
}

interface FetchAttributeNode {
  name: string
  alias?: string
}

interface FetchLinkNode {
  entityName: string
  fromAttribute: string
  toAttribute: string
  attributes: Map<string, FetchAttributeNode>
  conditions: string[]
  children: Map<string, FetchLinkNode>
}

const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])

const numberAttributeTypes = new Set(['number', 'integer', 'bigint', 'decimal', 'double', 'money'])

const isNoValueCondition = (condition: string | null | undefined): boolean => {
  if (!condition) {
    return false
  }

  return noValueConditions.has(condition)
}

const escapeODataString = (value: string): string => value.replace(/'/g, "''")

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const parseValues = (condition: string, values: ConditionValue[]): ConditionValue[] => {
  if (condition !== 'in') {
    return values
  }

  if (values.length !== 1 || typeof values[0] !== 'string') {
    return values
  }

  return values[0]
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const toFetchValue = (attributeType: string | undefined, value: ConditionValue): string => {
  const normalizedAttributeType = attributeType?.toLowerCase()

  if (normalizedAttributeType === 'boolean') {
    return value.toString().toLowerCase() === 'true' ? '1' : '0'
  }

  if (numberAttributeTypes.has(normalizedAttributeType ?? '')) {
    const parsed = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(parsed)) {
      return String(parsed)
    }
  }

  return String(value)
}

const toODataLiteral = (attributeType: string | undefined, value: ConditionValue): string => {
  const normalizedAttributeType = attributeType?.toLowerCase()

  if (normalizedAttributeType === 'boolean') {
    if (typeof value === 'boolean') {
      return String(value)
    }
    return value.toString().toLowerCase() === 'true' ? 'true' : 'false'
  }

  if (numberAttributeTypes.has(normalizedAttributeType ?? '')) {
    const parsed = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(parsed)) {
      return String(parsed)
    }
  }

  if (normalizedAttributeType === 'datetime' && typeof value === 'string') {
    const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)
    if (!Number.isNaN(dateValue.getTime())) {
      return `'${dateValue.toISOString()}'`
    }
  }

  return `'${escapeODataString(String(value))}'`
}

const getFilterOptionChain = (filterOption?: FilterOptionConfig): FilterOptionConfig[] => {
  if (!filterOption) {
    return []
  }

  const chain: FilterOptionConfig[] = []
  let current: FilterOptionConfig | undefined = filterOption
  while (current) {
    chain.push(current)
    current = current.RelatedTo
  }

  return chain
}

const getTableColumnChain = (column?: TableColumnConfig): TableColumnConfig[] => {
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

const getTargetTableColumn = (column?: TableColumnConfig): TableColumnConfig | undefined => {
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

const createColumnValueKey = (columnIndex: number, attributeName: string): string => {
  const normalizedAttributeName = attributeName.replace(/[^a-zA-Z0-9_]/g, '_')
  return `col_${columnIndex}_${normalizedAttributeName}`
}

const hasMeaningfulValues = (values: ConditionValue[]): boolean => {
  return values.some((value) => {
    if (typeof value === 'number') {
      return true
    }
    return value.trim().length > 0
  })
}

const createDateConditionExpression = (
  condition: string,
  attributeName: string
): string | undefined => {
  if (condition === 'today') {
    return `Microsoft.Dynamics.CRM.Today(PropertyName='${attributeName}')`
  }
  if (condition === 'tomorrow') {
    return `Microsoft.Dynamics.CRM.Tomorrow(PropertyName='${attributeName}')`
  }
  if (condition === 'yesterday') {
    return `Microsoft.Dynamics.CRM.Yesterday(PropertyName='${attributeName}')`
  }
  return undefined
}

const createFilterExpression = (conditionValue: AppliedFilterCondition): string | undefined => {
  const filterOption = getTargetFilterOption(conditionValue.filterOption)
  const condition = conditionValue.condition ?? undefined
  const attributeName = filterOption?.AttributeName

  if (!filterOption || !condition || !attributeName || conditionValue.isDisabled) {
    return undefined
  }

  if (isNoValueCondition(condition)) {
    if (condition === 'null') {
      return `${attributeName} eq null`
    }
    if (condition === 'not-null') {
      return `${attributeName} ne null`
    }
    return createDateConditionExpression(condition, attributeName)
  }

  const values = parseValues(condition, conditionValue.values).filter((value) => {
    if (typeof value === 'number') {
      return true
    }
    return value.trim().length > 0
  })
  if (values.length === 0) {
    return undefined
  }

  const literals = values.map((value) => toODataLiteral(filterOption.AttributeType, value))
  const firstLiteral = literals.at(0)
  if (!firstLiteral) {
    return undefined
  }

  if (condition === 'in') {
    return `${attributeName} in (${literals.join(',')})`
  }
  if (condition === 'begins-with') {
    return `startswith(${attributeName},${firstLiteral})`
  }
  if (condition === 'not-begin-with') {
    return `not startswith(${attributeName},${firstLiteral})`
  }
  if (condition === 'ends-with') {
    return `endswith(${attributeName},${firstLiteral})`
  }
  if (condition === 'not-end-with') {
    return `not endswith(${attributeName},${firstLiteral})`
  }
  if (condition === 'like') {
    return `contains(${attributeName},${firstLiteral})`
  }
  if (condition === 'not-like') {
    return `not contains(${attributeName},${firstLiteral})`
  }
  if (
    condition === 'eq' ||
    condition === 'ne' ||
    condition === 'ge' ||
    condition === 'gt' ||
    condition === 'le' ||
    condition === 'lt'
  ) {
    return `${attributeName} ${condition} ${firstLiteral}`
  }

  return undefined
}

const createFetchConditionXml = (
  conditionValue: AppliedFilterCondition,
  targetFilterOption: FilterOptionConfig
): string | undefined => {
  const condition = conditionValue.condition ?? undefined
  const attributeName = targetFilterOption.AttributeName
  if (!condition || !attributeName || conditionValue.isDisabled) {
    return undefined
  }

  const escapedAttributeName = escapeXml(attributeName)

  if (condition === 'null' || condition === 'not-null') {
    return `<condition attribute="${escapedAttributeName}" operator="${condition}" />`
  }

  if (condition === 'today' || condition === 'tomorrow' || condition === 'yesterday') {
    return `<condition attribute="${escapedAttributeName}" operator="${condition}" />`
  }

  const values = parseValues(condition, conditionValue.values).filter((value) => {
    if (typeof value === 'number') {
      return true
    }
    return value.trim().length > 0
  })
  if (!hasMeaningfulValues(values)) {
    return undefined
  }

  const firstValue = values.at(0)
  if (firstValue === undefined) {
    return undefined
  }

  if (condition === 'in') {
    const valuesXml = values
      .map(
        (value) =>
          `<value>${escapeXml(toFetchValue(targetFilterOption.AttributeType, value))}</value>`
      )
      .join('')
    return `<condition attribute="${escapedAttributeName}" operator="in">${valuesXml}</condition>`
  }

  const targetValue = toFetchValue(targetFilterOption.AttributeType, firstValue)

  if (
    condition === 'eq' ||
    condition === 'ne' ||
    condition === 'ge' ||
    condition === 'gt' ||
    condition === 'le' ||
    condition === 'lt' ||
    condition === 'begins-with' ||
    condition === 'ends-with'
  ) {
    return `<condition attribute="${escapedAttributeName}" operator="${condition}" value="${escapeXml(targetValue)}" />`
  }

  if (condition === 'not-begin-with') {
    return `<condition attribute="${escapedAttributeName}" operator="not-like" value="${escapeXml(`${targetValue}%`)}" />`
  }
  if (condition === 'not-end-with') {
    return `<condition attribute="${escapedAttributeName}" operator="not-like" value="${escapeXml(`%${targetValue}`)}" />`
  }
  if (condition === 'like') {
    return `<condition attribute="${escapedAttributeName}" operator="like" value="${escapeXml(`%${targetValue}%`)}" />`
  }
  if (condition === 'not-like') {
    return `<condition attribute="${escapedAttributeName}" operator="not-like" value="${escapeXml(`%${targetValue}%`)}" />`
  }

  return undefined
}

const getOrCreateLinkNode = (
  links: Map<string, FetchLinkNode>,
  entityName: string,
  fromAttribute: string,
  toAttribute: string
): FetchLinkNode => {
  const key = `${entityName}|${fromAttribute}|${toAttribute}`
  const existing = links.get(key)
  if (existing) {
    return existing
  }

  const created: FetchLinkNode = {
    entityName,
    fromAttribute,
    toAttribute,
    attributes: new Map<string, FetchAttributeNode>(),
    conditions: [],
    children: new Map<string, FetchLinkNode>(),
  }
  links.set(key, created)
  return created
}

const ensureLinkNodeForChain = (
  chain: LinkPathItem[],
  rootLinks: Map<string, FetchLinkNode>
): { canLink: boolean; node?: FetchLinkNode } => {
  if (chain.length <= 1) {
    return { canLink: true }
  }

  let currentParentLinks = rootLinks
  let currentNode: FetchLinkNode | undefined

  for (let index = 0; index < chain.length - 1; index++) {
    const parentItem = chain[index]
    const childItem = chain[index + 1]

    const linkToAttribute = parentItem.FromAttribute
    const linkFromAttribute = childItem.ToAttribute
    const childEntityName = childItem.EntityName

    if (!linkToAttribute || !linkFromAttribute || !childEntityName) {
      return { canLink: false }
    }

    currentNode = getOrCreateLinkNode(
      currentParentLinks,
      childEntityName,
      linkFromAttribute,
      linkToAttribute
    )
    currentParentLinks = currentNode.children
  }

  return { canLink: Boolean(currentNode), node: currentNode }
}

const renderAttributeNodeXml = (attribute: FetchAttributeNode): string => {
  if (attribute.alias) {
    return `<attribute name="${escapeXml(attribute.name)}" alias="${escapeXml(attribute.alias)}" />`
  }

  return `<attribute name="${escapeXml(attribute.name)}" />`
}

const renderLinkNodeXml = (node: FetchLinkNode): string => {
  const attributesXml = Array.from(node.attributes.values()).map(renderAttributeNodeXml).join('')
  const filterXml =
    node.conditions.length > 0 ? `<filter type="and">${node.conditions.join('')}</filter>` : ''
  const childrenXml = Array.from(node.children.values()).map(renderLinkNodeXml).join('')

  return `<link-entity name="${escapeXml(node.entityName)}" from="${escapeXml(node.fromAttribute)}" to="${escapeXml(node.toAttribute)}" link-type="inner">${attributesXml}${filterXml}${childrenXml}</link-entity>`
}

export const resolveSearchTableColumns = (entityConfig: EntityConfig): SearchTableColumn[] => {
  return entityConfig.ResultView.TableColumns.map((column, index) => {
    const chain = getTableColumnChain(column)
    const targetColumn = getTargetTableColumn(column)

    const attributeName = targetColumn?.AttributeName ?? column.AttributeName ?? ''
    const entityName = targetColumn?.EntityName ?? entityConfig.LogicalName
    const isRootColumn =
      chain.length <= 1 &&
      (!targetColumn?.EntityName || targetColumn.EntityName === entityConfig.LogicalName)

    return {
      sourceColumn: column,
      chain,
      attributeName,
      entityName,
      displayName: getTableColumnDisplayName(chain),
      valueKey: isRootColumn ? attributeName : createColumnValueKey(index, attributeName),
      isRootColumn,
    }
  }).filter((column) => column.attributeName.length > 0)
}

export const getSearchSelectColumns = (entityConfig: EntityConfig): string[] => {
  const uniqueColumns = new Set<string>()
  for (const column of resolveSearchTableColumns(entityConfig)) {
    uniqueColumns.add(column.attributeName)
  }
  return Array.from(uniqueColumns)
}

export const buildCrmEntitiesFilter = (
  entityLogicalName: string,
  conditions: AppliedFilterCondition[]
): string | undefined => {
  const expressions = conditions
    .filter((condition) => {
      const conditionEntityName = condition.filterOption?.EntityName
      return !conditionEntityName || conditionEntityName === entityLogicalName
    })
    .map(createFilterExpression)
    .filter((expression): expression is string => Boolean(expression))

  if (expressions.length === 0) {
    return undefined
  }

  return expressions.map((expression) => `(${expression})`).join(' and ')
}

export const buildCrmFetchXml = (
  entityLogicalName: string,
  tableColumns: SearchTableColumn[],
  conditions: AppliedFilterCondition[]
): string => {
  const rootAttributes = new Map<string, FetchAttributeNode>()
  const rootConditions: string[] = []
  const rootLinks = new Map<string, FetchLinkNode>()

  for (const column of tableColumns) {
    if (column.isRootColumn) {
      rootAttributes.set(column.valueKey, {
        name: column.attributeName,
        alias: column.valueKey === column.attributeName ? undefined : column.valueKey,
      })
      continue
    }

    const linkNode = ensureLinkNodeForChain(column.chain, rootLinks)
    if (!linkNode.canLink || !linkNode.node) {
      continue
    }

    linkNode.node.attributes.set(column.valueKey, {
      name: column.attributeName,
      alias: column.valueKey,
    })
  }

  for (const condition of conditions) {
    const sourceFilterOption = condition.filterOption
    const targetFilterOption = getTargetFilterOption(sourceFilterOption)
    if (!sourceFilterOption || !targetFilterOption) {
      continue
    }

    const conditionXml = createFetchConditionXml(condition, targetFilterOption)
    if (!conditionXml) {
      continue
    }

    const optionChain = getFilterOptionChain(sourceFilterOption)
    if (optionChain.length <= 1) {
      rootConditions.push(conditionXml)
      continue
    }

    const linkNode = ensureLinkNodeForChain(optionChain, rootLinks)
    if (!linkNode.canLink || !linkNode.node) {
      continue
    }

    linkNode.node.conditions.push(conditionXml)
  }

  const attributesXml = Array.from(rootAttributes.values()).map(renderAttributeNodeXml).join('')
  const rootFilterXml =
    rootConditions.length > 0 ? `<filter type="and">${rootConditions.join('')}</filter>` : ''
  const linksXml = Array.from(rootLinks.values()).map(renderLinkNodeXml).join('')

  return `<fetch version="1.0" mapping="logical" distinct="false"><entity name="${escapeXml(entityLogicalName)}">${attributesXml}${rootFilterXml}${linksXml}</entity></fetch>`
}
