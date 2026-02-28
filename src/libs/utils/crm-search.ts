import { EntityConfig, FilterOptionConfig } from '../config/app-config'

export type ConditionValue = string | number

export interface AppliedFilterCondition {
  filterOption?: FilterOptionConfig
  condition?: string | null
  values: ConditionValue[]
  isDisabled?: boolean
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

export const getSearchSelectColumns = (entityConfig: EntityConfig): string[] => {
  const uniqueColumns = new Set<string>()
  for (const column of entityConfig.ResultView.TableColumns) {
    if (column.AttributeName) {
      uniqueColumns.add(column.AttributeName)
    }
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
