import { AttributeMetadata, CrmRepository, EntityMetadata, LookupAttributeMetadata, PicklistAttributeMetadata, findAttributes } from "./crm-repository"

export default class CrmDesignData implements CrmRepository {

  async getAttributesMetadata(entityLogicalName: string, attributesLogicalNames: string[]): Promise<AttributeMetadata[]> {
    const allAttributes = await fetch('design-data/entity.account.meta.d.json').then(async result => {
      const data = await result.json()
      return <AttributeMetadata[]>data.value
    }, error => {
      throw error
    })
    return findAttributes(entityLogicalName, allAttributes, attributesLogicalNames)
  }

  async getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]> {
    const entities = await fetch('design-data/entities.meta.d.json').then(async result => {
      const data = await result.json()
      return <EntityMetadata[]>data.value
    }, error => {
      throw error
    })

    return entities.filter(i => logicalNames?.includes(i.LogicalName))
  }
  
  getLookupAttributeMetadata(entityLogicalName: string, attributeLogicalNames: string): Promise<LookupAttributeMetadata> {
    return fetch('design-data/attribute.lookup.meta.d.json').then(async result => {
      const data = await result.json()
      return <LookupAttributeMetadata>data
    }, error => {
      throw error
    })
  }
  
  getPicklistAttributeMetadata(entityLogicalName: string, attributeLogicalNames: string): Promise<PicklistAttributeMetadata> {
    return fetch('design-data/attribute.picklist.meta.d.json').then(async result => {
      const data = await result.json()
      return <PicklistAttributeMetadata>data
    }, error => {
      throw error
    })
  }

}