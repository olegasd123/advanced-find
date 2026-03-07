import { createLogger } from '@/libs/utils/logger'
import {
  AttributeMetadata,
  CrmData,
  EntityMetadata,
  GetEntitiesOptions,
  LookupAttributeMetadata,
  PicklistAttributeMetadata,
} from '@/libs/types/entity.types'

export type {
  AttributeMetadata,
  CrmData,
  EntityMetadata,
  GetEntitiesOptions,
  LookupAttributeMetadata,
  PicklistAttributeMetadata,
} from '@/libs/types/entity.types'

const logger = createLogger('crm-repository')

export const findAttributes = (
  entityLogicalName: string,
  source: AttributeMetadata[],
  attributesLogicalNames: string[]
): AttributeMetadata[] => {
  const attributes: AttributeMetadata[] = []
  for (const attributeLogicalName of attributesLogicalNames) {
    const attribute = source.find((i) => i.LogicalName === attributeLogicalName)
    if (attribute) {
      attributes.push(attribute)
    } else {
      logger.error(
        `Couldn't find the attribute by name '${attributeLogicalName}' at the entity '${entityLogicalName}'`
      )
    }
  }
  return attributes
}

export default class CrmRepository implements CrmData {
  // EntityDefinitions(LogicalName='account')/Attributes?$select=LogicalName,AttributeType,DisplayName
  async getAttributesMetadata(
    entityLogicalName: string,
    attributesLogicalNames: string[]
  ): Promise<AttributeMetadata[]> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${import.meta.env.VITE_CRM_API_VERSION}/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,AttributeType,DisplayName`
    const allAttributes = await fetch(url).then(
      async (result) => {
        const data = await result.json()
        return <AttributeMetadata[]>data.value
      },
      (error) => {
        logger.error(`CrmRepository.getAttributesMetadata: ${error}`)
        throw error
      }
    )
    return findAttributes(entityLogicalName, allAttributes, attributesLogicalNames)
  }

  // EntityDefinitions(LogicalName='account')?$select=LogicalName,LogicalCollectionName,EntitySetName,PrimaryIdAttribute,DisplayName,DisplayCollectionName
  async getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${import.meta.env.VITE_CRM_API_VERSION}/EntityDefinitions?$select=LogicalName,LogicalCollectionName,EntitySetName,PrimaryIdAttribute,DisplayName,DisplayCollectionName`
    const entities = await fetch(url).then(
      async (result) => {
        const data = await result.json()
        return <EntityMetadata[]>data.value
      },
      (error) => {
        logger.error(`CrmRepository.getEntitiesMetadata: ${error}`)
        throw error
      }
    )

    return entities.filter((i) => logicalNames?.includes(i.LogicalName))
  }

  // EntityDefinitions(LogicalName='account')/Attributes(LogicalName='createdby')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets
  getLookupAttributeMetadata(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<LookupAttributeMetadata> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${import.meta.env.VITE_CRM_API_VERSION}/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets`
    return fetch(url).then(
      async (result) => {
        const data = await result.json()
        return <LookupAttributeMetadata>data
      },
      (error) => {
        logger.error(`CrmRepository.getLookupAttributeMetadata: ${error}`)
        throw error
      }
    )
  }

  // EntityDefinitions(LogicalName='account')/Attributes(LogicalName='accountcategorycode')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)
  getPicklistAttributeMetadata(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<PicklistAttributeMetadata> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${import.meta.env.VITE_CRM_API_VERSION}/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`
    return fetch(url).then(
      async (result) => {
        const data = await result.json()
        return <PicklistAttributeMetadata>data
      },
      (error) => {
        logger.error(`CrmRepository.getPicklistAttributeMetadata: ${error}`)
        throw error
      }
    )
  }

  getEntities(
    entityPluralName: string,
    attributeLogicalNames: string[],
    options?: GetEntitiesOptions
  ): Promise<unknown> {
    const query: string[] = []

    if (options?.fetchXml) {
      query.push(`fetchXml=${encodeURIComponent(options.fetchXml)}`)
    } else {
      if (attributeLogicalNames.length > 0) {
        query.push(`$select=${attributeLogicalNames.join(',')}`)
      }
      if (options?.filter) {
        query.push(`$filter=${encodeURIComponent(options.filter)}`)
      }
    }
    const queryPart = query.length > 0 ? `?${query.join('&')}` : ''
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${import.meta.env.VITE_CRM_API_VERSION}/${entityPluralName}${queryPart}`
    return fetch(url).then(
      async (result) => {
        const data = await result.json()
        return data as unknown
      },
      (error) => {
        logger.error(`CrmRepository.getEntities: ${error}`)
        throw error
      }
    )
  }
}
