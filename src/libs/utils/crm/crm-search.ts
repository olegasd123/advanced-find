import {
  AppliedFilterCondition,
  ConditionValue,
  FilterGroupOperator,
} from '@/libs/types/filter.types'

export type {
  AppliedFilterCondition,
  ConditionValue,
  FilterGroupOperator,
} from '@/libs/types/filter.types'

// Re-export column resolution types and functions
export type { SearchTableColumnAttribute, SearchTableColumn } from '@/libs/types/search.types'
export {
  getTableColumnChain,
  getTargetTableColumn,
  createColumnKey,
  createColumnValueKey,
  createRootSearchColumn,
  resolveSearchTableColumns,
  getSearchSelectColumns,
} from '@/libs/utils/crm/crm-search-columns'

// Re-export FetchXML builder functions
export { buildCrmFetchXml, buildCrmFilterFetchXml } from '@/libs/utils/crm/crm-search-fetch-xml'

// --- Shared constants ---

export const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])

export const numberAttributeTypes = new Set([
  'number',
  'integer',
  'bigint',
  'decimal',
  'double',
  'money',
])

export const normalizeGroupOperator = (
  operator: FilterGroupOperator | undefined
): FilterGroupOperator => (operator === 'or' ? 'or' : 'and')

export const isNoValueCondition = (condition: string | null | undefined): boolean => {
  if (!condition) {
    return false
  }

  return noValueConditions.has(condition)
}

// --- Shared value helpers ---

export const escapeODataString = (value: string): string => value.replace(/'/g, "''")

export const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export const parseValues = (condition: string, values: ConditionValue[]): ConditionValue[] => {
  if (condition !== 'in' && condition !== 'not-in') {
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

export const normalizeConditionForValues = (
  condition: string,
  values: ConditionValue[]
): string => {
  if (condition === 'eq' && values.length > 1) {
    return 'in'
  }
  if (condition === 'ne' && values.length > 1) {
    return 'not-in'
  }
  return condition
}

export const toFetchValue = (attributeType: string | undefined, value: ConditionValue): string => {
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

export const toODataLiteral = (
  attributeType: string | undefined,
  value: ConditionValue
): string => {
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

export const hasMeaningfulValues = (values: ConditionValue[]): boolean => {
  return values.some((value) => {
    if (typeof value === 'number') {
      return true
    }
    return value.trim().length > 0
  })
}

// --- OData filter building ---

interface FilterConditionGroupBucket {
  operator: FilterGroupOperator
  conditions: string[]
}

interface FilterConditionContext {
  rootConditions: string[]
  groupedConditions: Map<number, FilterConditionGroupBucket>
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

const createFilterConditionContext = (): FilterConditionContext => ({
  rootConditions: [],
  groupedConditions: new Map<number, FilterConditionGroupBucket>(),
})

const addConditionToContext = (
  filterContext: FilterConditionContext,
  condition: AppliedFilterCondition,
  expression: string
): void => {
  if (condition.groupId === undefined) {
    filterContext.rootConditions.push(expression)
    return
  }

  const existingGroup = filterContext.groupedConditions.get(condition.groupId)
  if (!existingGroup) {
    filterContext.groupedConditions.set(condition.groupId, {
      operator: normalizeGroupOperator(condition.groupOperator),
      conditions: [expression],
    })
    return
  }

  existingGroup.conditions.push(expression)
}

const buildGroupedExpressions = (
  rootExpressions: string[],
  groupedExpressions: Map<number, FilterConditionGroupBucket>
): string[] => {
  const parts = rootExpressions.map((expression) => `(${expression})`)

  for (const groupedCondition of groupedExpressions.values()) {
    if (groupedCondition.conditions.length === 0) {
      continue
    }

    if (groupedCondition.conditions.length === 1) {
      parts.push(`(${groupedCondition.conditions[0]})`)
      continue
    }

    const groupedExpression = groupedCondition.conditions
      .map((expression) => `(${expression})`)
      .join(` ${groupedCondition.operator} `)
    parts.push(`(${groupedExpression})`)
  }

  return parts
}

const createFilterExpression = (conditionValue: AppliedFilterCondition): string | undefined => {
  const filterOption = conditionValue.filterOption
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

  const normalizedCondition = normalizeConditionForValues(condition, values)

  if (normalizedCondition === 'in') {
    return `${attributeName} in (${literals.join(',')})`
  }
  if (normalizedCondition === 'not-in') {
    return `not (${attributeName} in (${literals.join(',')}))`
  }
  if (normalizedCondition === 'begins-with') {
    return `startswith(${attributeName},${firstLiteral})`
  }
  if (normalizedCondition === 'not-begin-with') {
    return `not startswith(${attributeName},${firstLiteral})`
  }
  if (normalizedCondition === 'ends-with') {
    return `endswith(${attributeName},${firstLiteral})`
  }
  if (normalizedCondition === 'not-end-with') {
    return `not endswith(${attributeName},${firstLiteral})`
  }
  if (normalizedCondition === 'like') {
    return `contains(${attributeName},${firstLiteral})`
  }
  if (normalizedCondition === 'not-like') {
    return `not contains(${attributeName},${firstLiteral})`
  }
  if (
    normalizedCondition === 'eq' ||
    normalizedCondition === 'ne' ||
    normalizedCondition === 'ge' ||
    normalizedCondition === 'gt' ||
    normalizedCondition === 'le' ||
    normalizedCondition === 'lt'
  ) {
    return `${attributeName} ${normalizedCondition} ${firstLiteral}`
  }

  return undefined
}

export const buildCrmEntitiesFilter = (
  entityLogicalName: string,
  conditions: AppliedFilterCondition[]
): string | undefined => {
  const expressionsContext = createFilterConditionContext()
  for (const condition of conditions) {
    const conditionEntityName = condition.filterOption?.EntityName
    if (conditionEntityName && conditionEntityName !== entityLogicalName) {
      continue
    }

    const expression = createFilterExpression(condition)
    if (!expression) {
      continue
    }

    addConditionToContext(expressionsContext, condition, expression)
  }

  const expressions = buildGroupedExpressions(
    expressionsContext.rootConditions,
    expressionsContext.groupedConditions
  )

  if (expressions.length === 0) {
    return undefined
  }

  return expressions.join(' and ')
}
