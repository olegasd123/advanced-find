import {
  EntityConfig,
  FilterOptionConfig,
  RelationPathConfig,
  RelationPathStepConfig,
  TableColumnConfig,
} from '@/libs/types/app-config.types'
import { createColumnKey } from '@/libs/utils/crm/crm-search-columns'
import {
  getNormalizedConfigId,
  getPathTargetEntityName,
  getRelationPathById,
  normalizeRelationPathSteps,
  resolveConfigPath,
} from '@/libs/utils/crm/relation-path'

interface LegacyTableColumnConfig extends TableColumnConfig {
  Attributes?: string[]
  AttributeName?: string
}

interface AppConfigValidationContext {
  rootEntityLogicalName: string
  relationPathById: Map<string, RelationPathStepConfig[]>
  issues: Set<string>
  requiredAttributesByEntity: Map<string, Set<string>>
}

export interface AppConfigMetadataValidationPlan {
  configuredEntityLogicalNames: string[]
  requiredAttributesByEntity: Map<string, string[]>
  issues: string[]
}

const maxIssuesInUserMessage = 3

const normalizeLogicalName = (value: string | undefined): string | undefined => {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : undefined
}

const addIssue = (issues: Set<string>, message: string): void => {
  const normalizedMessage = message.trim()
  if (normalizedMessage.length === 0) {
    return
  }
  issues.add(normalizedMessage)
}

const addAttributeRequirement = (
  requiredAttributesByEntity: Map<string, Set<string>>,
  entityLogicalName: string,
  attributeLogicalName: string
): void => {
  const normalizedEntityLogicalName = normalizeLogicalName(entityLogicalName)
  const normalizedAttributeLogicalName = normalizeLogicalName(attributeLogicalName)

  if (!normalizedEntityLogicalName || !normalizedAttributeLogicalName) {
    return
  }

  const attributeNames =
    requiredAttributesByEntity.get(normalizedEntityLogicalName) ?? new Set<string>()
  attributeNames.add(normalizedAttributeLogicalName)
  requiredAttributesByEntity.set(normalizedEntityLogicalName, attributeNames)
}

const getColumnAttributes = (column?: TableColumnConfig): string[] => {
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

const getLegacyColumnAttribute = (column?: TableColumnConfig): string | undefined => {
  const attributeName = (column as LegacyTableColumnConfig | undefined)?.AttributeName?.trim()
  return attributeName && attributeName.length > 0 ? attributeName : undefined
}

const getResolvedColumnAttributes = (column: TableColumnConfig): string[] => {
  const attributes = getColumnAttributes(column)
  if (attributes.length > 0) {
    return attributes
  }

  const legacyAttribute = getLegacyColumnAttribute(column)
  if (!legacyAttribute) {
    return []
  }

  return [legacyAttribute]
}

const resolveValidatedPath = (
  context: AppConfigValidationContext,
  pathId: string | undefined,
  path: RelationPathStepConfig[] | undefined,
  location: string
): RelationPathStepConfig[] => {
  const normalizedInlinePath = normalizeRelationPathSteps(path)
  if ((path?.length ?? 0) > 0 && normalizedInlinePath.length !== path?.length) {
    addIssue(
      context.issues,
      `${location} has invalid path step values (EntityName, FromAttribute, ToAttribute are required).`
    )
  }

  const normalizedPathId = getNormalizedConfigId(pathId)
  if (
    normalizedInlinePath.length === 0 &&
    normalizedPathId &&
    !context.relationPathById.has(normalizedPathId)
  ) {
    addIssue(context.issues, `${location} uses unknown PathId "${pathId}".`)
  }

  return resolveConfigPath(context.relationPathById, pathId, path)
}

const collectRelationPathConfigIssues = (
  relationPaths: RelationPathConfig[] | undefined,
  context: AppConfigValidationContext
): void => {
  const seenPathIds = new Set<string>()

  for (const [index, relationPath] of (relationPaths ?? []).entries()) {
    const location = `Entity "${context.rootEntityLogicalName}" RelationPaths[${index}]`
    const normalizedId = getNormalizedConfigId(relationPath.Id)
    if (!normalizedId) {
      addIssue(context.issues, `${location} has an empty Id.`)
    } else if (seenPathIds.has(normalizedId)) {
      addIssue(context.issues, `${location} has duplicate Id "${relationPath.Id}".`)
    } else {
      seenPathIds.add(normalizedId)
    }

    if ((relationPath.Steps?.length ?? 0) === 0) {
      addIssue(context.issues, `${location} has no Steps.`)
      continue
    }

    const normalizedSteps = normalizeRelationPathSteps(relationPath.Steps)
    if (normalizedSteps.length !== relationPath.Steps.length) {
      addIssue(
        context.issues,
        `${location} has invalid step values (EntityName, FromAttribute, ToAttribute are required).`
      )
    }

    if (normalizedSteps.length === 0) {
      continue
    }

    let sourceEntityLogicalName = context.rootEntityLogicalName
    for (const step of normalizedSteps) {
      addAttributeRequirement(
        context.requiredAttributesByEntity,
        sourceEntityLogicalName,
        step.FromAttribute
      )
      addAttributeRequirement(context.requiredAttributesByEntity, step.EntityName, step.ToAttribute)
      sourceEntityLogicalName = step.EntityName
    }
  }
}

const collectFilterOptionIssues = (
  filterOptions: FilterOptionConfig[] | undefined,
  categoryIds: Set<string>,
  context: AppConfigValidationContext
): Set<string> => {
  const filterOptionIds = new Set<string>()

  for (const [index, filterOption] of (filterOptions ?? []).entries()) {
    const location = `Entity "${context.rootEntityLogicalName}" FilterOptions[${index}]`
    const normalizedOptionId = getNormalizedConfigId(filterOption.Id)
    if (normalizedOptionId) {
      if (filterOptionIds.has(normalizedOptionId)) {
        addIssue(context.issues, `${location} has duplicate Id "${filterOption.Id}".`)
      } else {
        filterOptionIds.add(normalizedOptionId)
      }
    }

    const categoryId = getNormalizedConfigId(filterOption.CategoryId)
    if (categoryId && !categoryIds.has(categoryId)) {
      addIssue(context.issues, `${location} uses unknown CategoryId "${filterOption.CategoryId}".`)
    }

    const resolvedPath = resolveValidatedPath(
      context,
      filterOption.PathId,
      filterOption.Path,
      location
    )
    const pathTargetLogicalName = getPathTargetEntityName(
      context.rootEntityLogicalName,
      resolvedPath
    )
    const optionEntityLogicalName = normalizeLogicalName(filterOption.EntityName)
    if (
      optionEntityLogicalName &&
      resolvedPath.length > 0 &&
      optionEntityLogicalName !== pathTargetLogicalName
    ) {
      addIssue(
        context.issues,
        `${location} has EntityName "${filterOption.EntityName}" but the relation path target is "${pathTargetLogicalName}".`
      )
    }

    const targetEntityLogicalName = optionEntityLogicalName ?? pathTargetLogicalName
    const attributeName = normalizeLogicalName(filterOption.AttributeName)
    if (attributeName) {
      addAttributeRequirement(
        context.requiredAttributesByEntity,
        targetEntityLogicalName,
        attributeName
      )
    }
  }

  return filterOptionIds
}

const collectResultViewIssues = (
  entityConfig: EntityConfig,
  context: AppConfigValidationContext
): void => {
  const normalizedColumnIds = new Set<string>()

  for (const [index, column] of entityConfig.ResultView.Columns.entries()) {
    const location = `Entity "${context.rootEntityLogicalName}" ResultView.Columns[${index}]`
    const normalizedColumnId = getNormalizedConfigId(column.Id) ?? createColumnKey(index)
    if (normalizedColumnIds.has(normalizedColumnId)) {
      addIssue(context.issues, `${location} has duplicate Id "${column.Id ?? normalizedColumnId}".`)
    } else {
      normalizedColumnIds.add(normalizedColumnId)
    }

    const resolvedPath = resolveValidatedPath(context, column.PathId, column.Path, location)
    const targetEntityLogicalName = getPathTargetEntityName(
      context.rootEntityLogicalName,
      resolvedPath
    )

    const attributeNames = getResolvedColumnAttributes(column)
    if (attributeNames.length === 0) {
      addIssue(
        context.issues,
        `${location} has no attributes (use AttributeNames or AttributeName).`
      )
      continue
    }

    for (const attributeName of attributeNames) {
      addAttributeRequirement(
        context.requiredAttributesByEntity,
        targetEntityLogicalName,
        attributeName
      )
    }
  }

  for (const [index, defaultSort] of (entityConfig.ResultView.DefaultSort ?? []).entries()) {
    const location = `Entity "${context.rootEntityLogicalName}" ResultView.DefaultSort[${index}]`
    const normalizedSortColumnId = getNormalizedConfigId(defaultSort.ColumnId)
    if (!normalizedSortColumnId) {
      addIssue(context.issues, `${location} has an empty ColumnId.`)
      continue
    }

    if (!normalizedColumnIds.has(normalizedSortColumnId)) {
      addIssue(context.issues, `${location} references unknown ColumnId "${defaultSort.ColumnId}".`)
    }
  }
}

const collectDefaultFilterGroupIssues = (
  entityConfig: EntityConfig,
  filterOptionIds: Set<string>,
  context: AppConfigValidationContext
): void => {
  const filterOptionsLength = entityConfig.FilterOptions.length

  for (const [groupIndex, group] of (entityConfig.DefaultFilterGroups ?? []).entries()) {
    const groupLocation = `Entity "${context.rootEntityLogicalName}" DefaultFilterGroups[${groupIndex}]`
    for (const optionIndex of group.FilterOptionIndexes ?? []) {
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= filterOptionsLength) {
        addIssue(
          context.issues,
          `${groupLocation} uses out-of-range FilterOptionIndexes value "${optionIndex}".`
        )
      }
    }

    for (const optionId of group.FilterOptionIds ?? []) {
      const normalizedOptionId = getNormalizedConfigId(optionId)
      if (!normalizedOptionId || !filterOptionIds.has(normalizedOptionId)) {
        addIssue(
          context.issues,
          `${groupLocation} references unknown FilterOptionId "${optionId}".`
        )
      }
    }
  }
}

const collectEntityValidationPlan = (
  entityConfig: EntityConfig,
  issues: Set<string>,
  requiredAttributesByEntity: Map<string, Set<string>>
): string | undefined => {
  const rootEntityLogicalName = normalizeLogicalName(entityConfig.LogicalName)
  if (!rootEntityLogicalName) {
    addIssue(issues, `SearchSchema.Entities contains an entity with an empty LogicalName.`)
    return undefined
  }

  const relationPathById = getRelationPathById(entityConfig)
  const context: AppConfigValidationContext = {
    rootEntityLogicalName,
    relationPathById,
    issues,
    requiredAttributesByEntity,
  }

  const categoryIds = new Set<string>()
  for (const [index, category] of (entityConfig.FilterCategories ?? []).entries()) {
    const categoryLocation = `Entity "${rootEntityLogicalName}" FilterCategories[${index}]`
    const normalizedCategoryId = getNormalizedConfigId(category.Id)
    if (!normalizedCategoryId) {
      addIssue(issues, `${categoryLocation} has an empty Id.`)
      continue
    }

    if (categoryIds.has(normalizedCategoryId)) {
      addIssue(issues, `${categoryLocation} has duplicate Id "${category.Id}".`)
      continue
    }

    categoryIds.add(normalizedCategoryId)
  }

  collectRelationPathConfigIssues(entityConfig.RelationPaths, context)
  const filterOptionIds = collectFilterOptionIssues(
    entityConfig.FilterOptions,
    categoryIds,
    context
  )
  collectDefaultFilterGroupIssues(entityConfig, filterOptionIds, context)
  collectResultViewIssues(entityConfig, context)

  return rootEntityLogicalName
}

const toSortedAttributeMap = (source: Map<string, Set<string>>): Map<string, string[]> => {
  const entries = Array.from(source.entries()).sort(([entityA], [entityB]) =>
    entityA.localeCompare(entityB)
  )

  const result = new Map<string, string[]>()
  for (const [entityLogicalName, attributes] of entries) {
    result.set(
      entityLogicalName,
      Array.from(attributes).sort((a, b) => a.localeCompare(b))
    )
  }

  return result
}

export const buildAppConfigMetadataValidationPlan = (
  configEntities: EntityConfig[] | undefined
): AppConfigMetadataValidationPlan => {
  if (!configEntities || configEntities.length === 0) {
    return {
      configuredEntityLogicalNames: [],
      requiredAttributesByEntity: new Map(),
      issues: [],
    }
  }

  const issues = new Set<string>()
  const requiredAttributesByEntity = new Map<string, Set<string>>()
  const configuredEntityLogicalNames: string[] = []
  const seenEntityLogicalNames = new Set<string>()

  for (const [index, entityConfig] of configEntities.entries()) {
    const entityLogicalName = collectEntityValidationPlan(
      entityConfig,
      issues,
      requiredAttributesByEntity
    )
    if (!entityLogicalName) {
      continue
    }

    const normalizedEntityLogicalName = entityLogicalName.toLowerCase()
    if (seenEntityLogicalNames.has(normalizedEntityLogicalName)) {
      addIssue(
        issues,
        `SearchSchema.Entities[${index}] has duplicate LogicalName "${entityConfig.LogicalName}".`
      )
      continue
    }

    seenEntityLogicalNames.add(normalizedEntityLogicalName)
    configuredEntityLogicalNames.push(entityLogicalName)
  }

  return {
    configuredEntityLogicalNames,
    requiredAttributesByEntity: toSortedAttributeMap(requiredAttributesByEntity),
    issues: Array.from(issues),
  }
}

export const buildAppConfigValidationUserMessage = (issues: string[]): string | undefined => {
  if (issues.length === 0) {
    return undefined
  }

  const topIssues = issues.slice(0, maxIssuesInUserMessage)
  const remainingIssuesCount = issues.length - topIssues.length
  const topIssuesMessage = topIssues.join(' ')
  const remainingMessage =
    remainingIssuesCount > 0 ? ` ${remainingIssuesCount} more issue(s) found.` : ''

  return `App configuration has invalid values. ${topIssuesMessage}${remainingMessage}`
}
