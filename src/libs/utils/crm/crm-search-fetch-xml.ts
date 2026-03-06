import { FilterOptionConfig, RelationPathStepConfig } from '../../config/app-config'
import { AppliedFilterCondition, FilterGroupOperator } from '../../types/filter.types'
import { SearchTableColumn } from '../../types/search.types'
import { getTargetFilterOption } from './filter'
import { createRootSearchColumn } from './crm-search-columns'
import {
  escapeXml,
  hasMeaningfulValues,
  normalizeGroupOperator,
  parseValues,
  toFetchValue,
} from './crm-search'

interface FetchAttributeNode {
  name: string
  alias?: string
}

interface FilterConditionGroupBucket {
  operator: FilterGroupOperator
  conditions: string[]
}

interface FilterConditionContext {
  rootConditions: string[]
  groupedConditions: Map<number, FilterConditionGroupBucket>
}

interface FetchLinkNode {
  entityName: string
  fromAttribute: string
  toAttribute: string
  attributes: Map<string, FetchAttributeNode>
  filterContext: FilterConditionContext
  children: Map<string, FetchLinkNode>
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

const renderFilterContextXml = (filterContext: FilterConditionContext): string => {
  const parts: string[] = [...filterContext.rootConditions]

  for (const groupedCondition of filterContext.groupedConditions.values()) {
    if (groupedCondition.conditions.length === 0) {
      continue
    }

    if (groupedCondition.conditions.length === 1) {
      parts.push(groupedCondition.conditions[0])
      continue
    }

    parts.push(
      `<filter type="${groupedCondition.operator}">${groupedCondition.conditions.join('')}</filter>`
    )
  }

  if (parts.length === 0) {
    return ''
  }

  return `<filter type="and">${parts.join('')}</filter>`
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
    filterContext: createFilterConditionContext(),
    children: new Map<string, FetchLinkNode>(),
  }
  links.set(key, created)
  return created
}

const ensureLinkNodeForChain = (
  chain: RelationPathStepConfig[],
  rootLinks: Map<string, FetchLinkNode>
): { canLink: boolean; node?: FetchLinkNode } => {
  if (chain.length === 0) {
    return { canLink: true }
  }

  let currentParentLinks = rootLinks
  let currentNode: FetchLinkNode | undefined

  for (const pathStep of chain) {
    const linkToAttribute = pathStep.FromAttribute
    const linkFromAttribute = pathStep.ToAttribute
    const childEntityName = pathStep.EntityName

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
  const filterXml = renderFilterContextXml(node.filterContext)
  const childrenXml = Array.from(node.children.values()).map(renderLinkNodeXml).join('')

  return `<link-entity name="${escapeXml(node.entityName)}" from="${escapeXml(node.fromAttribute)}" to="${escapeXml(node.toAttribute)}" link-type="inner">${attributesXml}${filterXml}${childrenXml}</link-entity>`
}

export const buildCrmFetchXml = (
  entityLogicalName: string,
  tableColumns: SearchTableColumn[],
  conditions: AppliedFilterCondition[]
): string => {
  const rootAttributes = new Map<string, FetchAttributeNode>()
  const rootFilterContext = createFilterConditionContext()
  const rootLinks = new Map<string, FetchLinkNode>()

  for (const column of tableColumns) {
    if (column.isRootColumn) {
      for (const attribute of column.attributes) {
        rootAttributes.set(attribute.valueKey, {
          name: attribute.attributeName,
          alias: attribute.valueKey === attribute.attributeName ? undefined : attribute.valueKey,
        })
      }
      continue
    }

    const linkNode = ensureLinkNodeForChain(column.chain, rootLinks)
    if (!linkNode.canLink || !linkNode.node) {
      continue
    }

    for (const attribute of column.attributes) {
      linkNode.node.attributes.set(attribute.valueKey, {
        name: attribute.attributeName,
        alias: attribute.valueKey,
      })
    }
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

    const optionPath = sourceFilterOption?.Path ?? []
    const hasDeclaredPath = Boolean(sourceFilterOption?.PathId || sourceFilterOption?.Path)

    if (!hasDeclaredPath) {
      addConditionToContext(rootFilterContext, condition, conditionXml)
      continue
    }
    if (optionPath.length === 0) {
      continue
    }

    const linkNode = ensureLinkNodeForChain(optionPath, rootLinks)
    if (!linkNode.canLink || !linkNode.node) {
      continue
    }

    addConditionToContext(linkNode.node.filterContext, condition, conditionXml)
  }

  const attributesXml = Array.from(rootAttributes.values()).map(renderAttributeNodeXml).join('')
  const rootFilterXml = renderFilterContextXml(rootFilterContext)
  const linksXml = Array.from(rootLinks.values()).map(renderLinkNodeXml).join('')

  return `<fetch version="1.0" mapping="logical" distinct="false"><entity name="${escapeXml(entityLogicalName)}">${attributesXml}${rootFilterXml}${linksXml}</entity></fetch>`
}

export const buildCrmFilterFetchXml = (
  entityLogicalName: string,
  conditions: AppliedFilterCondition[],
  rootAttributeNames: string[] = []
): string => {
  const rootColumns = rootAttributeNames.map((attributeName, index) =>
    createRootSearchColumn(attributeName, index)
  )
  return buildCrmFetchXml(entityLogicalName, rootColumns, conditions)
}
