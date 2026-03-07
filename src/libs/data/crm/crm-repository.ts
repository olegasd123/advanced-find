import { createLogger } from '@/libs/utils/logger'
import { findAttributes } from '@/libs/data/crm/crm-repository.helpers'
import {
  AttributeMetadata,
  CrmData,
  EntityMetadata,
  GetEntitiesOptions,
  LookupAttributeMetadata,
  PicklistAttributeMetadata,
} from '@/libs/types/entity.types'
import { crmApiVersion } from '@/libs/utils/env'

export type {
  AttributeMetadata,
  CrmData,
  EntityMetadata,
  GetEntitiesOptions,
  LookupAttributeMetadata,
  PicklistAttributeMetadata,
} from '@/libs/types/entity.types'

const logger = createLogger('crm-repository')

export default class CrmRepository implements CrmData {
  private async fetchJson<T>(url: string, context: string): Promise<T> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        const details = text ? ` - ${text}` : ''
        throw new Error(`${context}: HTTP ${response.status}${details}`)
      }

      return (await response.json()) as T
    } catch (error) {
      logger.error(`${context}: ${error}`)
      throw error
    }
  }

  // EntityDefinitions(LogicalName='account')/Attributes?$select=LogicalName,AttributeType,DisplayName
  async getAttributesMetadata(
    entityLogicalName: string,
    attributesLogicalNames: string[]
  ): Promise<AttributeMetadata[]> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${crmApiVersion}/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,AttributeType,DisplayName`
    const data = await this.fetchJson<{ value: AttributeMetadata[] }>(
      url,
      'CrmRepository.getAttributesMetadata'
    )
    const allAttributes = data.value
    return findAttributes(entityLogicalName, allAttributes, attributesLogicalNames)
  }

  // EntityDefinitions(LogicalName='account')?$select=LogicalName,LogicalCollectionName,EntitySetName,PrimaryIdAttribute,DisplayName,DisplayCollectionName
  async getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${crmApiVersion}/EntityDefinitions?$select=LogicalName,LogicalCollectionName,EntitySetName,PrimaryIdAttribute,DisplayName,DisplayCollectionName`
    const data = await this.fetchJson<{ value: EntityMetadata[] }>(
      url,
      'CrmRepository.getEntitiesMetadata'
    )
    const entities = data.value

    return entities.filter((i) => logicalNames?.includes(i.LogicalName))
  }

  // EntityDefinitions(LogicalName='account')/Attributes(LogicalName='createdby')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets
  getLookupAttributeMetadata(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<LookupAttributeMetadata> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${crmApiVersion}/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets`
    return this.fetchJson<LookupAttributeMetadata>(url, 'CrmRepository.getLookupAttributeMetadata')
  }

  // EntityDefinitions(LogicalName='account')/Attributes(LogicalName='accountcategorycode')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)
  getPicklistAttributeMetadata(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<PicklistAttributeMetadata> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${crmApiVersion}/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`
    return this.fetchJson<PicklistAttributeMetadata>(
      url,
      'CrmRepository.getPicklistAttributeMetadata'
    )
  }

  async getEntities(
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
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/${crmApiVersion}/${entityPluralName}${queryPart}`
    return this.fetchJson<unknown>(url, 'CrmRepository.getEntities')
  }
}
