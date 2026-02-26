import { FilterOptionConfig } from "../config/app-config"
import { AttributeMetadata } from "../repositories/crm-repository"
import { createLogger } from "./logger"

const logger = createLogger('filter-utils');

export interface CrmFilterConditionOption {
  value: string,
  displayName: string,
  isMultiSelection?: boolean
}

export const getTargetFilterOption = (option?: FilterOptionConfig): FilterOptionConfig | undefined => {
  if (option?.RelatedTo) {
    return getTargetFilterOption(option?.RelatedTo)
  }
  return option
}

export const fillOptionsWithMetadataInfo = async (
  currentEntity?: string,
  filterOptions? : FilterOptionConfig[],
  getAttributeMetadata?: (entityLogicalName: string, attributesLogicalNames: any) => Promise<AttributeMetadata[]> | undefined
) => {
  const attributesNames = filterOptions?.map(i => {
    if (!i.CategoryDisplayName) {
      const option = getTargetFilterOption(i)
      if (option && option.AttributeName && !option.EntityName) {
        option.EntityName = currentEntity
      }
      return option
    }
  }).filter(i => typeof i !== 'undefined')

  if (attributesNames?.length ?? 0 > 0) {
    const groupedAttributesNames = attributesNames?.reduce((p, c) => {
      if (c?.EntityName || c?.AttributeName) {
        p[c.EntityName!] = p[c.EntityName!] || []

        if (!p[c.EntityName!].includes(c.AttributeName!)) {
          p[c.EntityName!].push(c.AttributeName)
        }
      }
      return p
    }, Object.create(null))

    for (const entityName of Object.keys(groupedAttributesNames)) {
      const attributesMetadata = await getAttributeMetadata?.(entityName, groupedAttributesNames[entityName])
      for (const attributeName of groupedAttributesNames[entityName]) {
        for (const filterOption of filterOptions!) {
          const attributeInfo = getTargetFilterOption(filterOption)
          if (attributeInfo?.EntityName === entityName &&
            attributeInfo?.AttributeName === attributeName) {
            const attributeMetadata = attributesMetadata?.find(i => i.LogicalName === attributeName)
            attributeInfo.AttributeType = attributeMetadata?.AttributeType
            if (!attributeInfo.DisplayName) {
              attributeInfo.DisplayName = attributeMetadata?.DisplayName.UserLocalizedLabel?.Label
            }
          }
        }
      }
    }

    logger.info(`filterOptions`, { filterOptions })
  }
}

export const getCrmFilterConditionsOptions = (
  type: string | undefined,
  localizationInfo: any,
  isMultiSelection?: boolean
): CrmFilterConditionOption[] => {
  const normalizedType = type?.toLowerCase()

  const filters: string[] = []

  filters.push(...[ 'eq', 'ne', 'null', 'not-null' ])

  if (normalizedType === 'string' || normalizedType === 'memo' || normalizedType === 'uniqueidentifier') {
    filters.push(...[ 'in', 'begins-with', 'not-begin-with', 'ends-with', 'not-end-with', 'like', 'not-like' ])
  }
  else if ((normalizedType === 'picklist' || normalizedType === 'lookup') &&
    isMultiSelection) {
    filters.push(...[ 'in' ])
  }
  else if (normalizedType === 'number' ||
    normalizedType === 'integer' ||
    normalizedType === 'bigint' ||
    normalizedType === 'decimal' ||
    normalizedType === 'double' ||
    normalizedType === 'money') {
    filters.push(...[ 'in', 'ge', 'gt', 'le', 'lt' ])
  }
  else if (normalizedType === 'datetime') {
    filters.push(...[ 'ge', 'gt', 'le', 'lt', 'today', 'tomorrow', 'yesterday' ])
  }

  return filters.map(i => { return { value: i, displayName: localizationInfo[i] }})
}
