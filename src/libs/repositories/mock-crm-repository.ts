import { AttributeMetadata, CrmData, EntityMetadata, LookupAttributeMetadata, PicklistAttributeMetadata, findAttributes } from "./crm-repository"

export default class MockCrmRepository implements CrmData {

  async getAttributesMetadata(entityLogicalName: string, attributesLogicalNames: string[]): Promise<AttributeMetadata[]> {
    const allAttributes = await fetch(`design-data/entity.${entityLogicalName}.meta.d.json`).then(async result => {
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
  
  getLookupAttributeMetadata(_: string, attributeLogicalName: string): Promise<LookupAttributeMetadata> {
    return fetch(`design-data/lookup.${attributeLogicalName}.meta.d.json`).then(async result => {
      const data = await result.json()
      return <LookupAttributeMetadata>data
    }, error => {
      throw error
    })
  }
  
  getPicklistAttributeMetadata(_: string, attributeLogicalName: string): Promise<PicklistAttributeMetadata> {
    return fetch(`design-data/picklist.${attributeLogicalName}.meta.d.json`).then(async result => {
      const data = await result.json()
      return <PicklistAttributeMetadata>data
    }, error => {
      throw error
    })
  }

}