import { AttributeMetadata, CrmData, EntityMetadata, LookupAttributeMetadata, PicklistAttributeMetadata, findAttributes } from "./crm-repository"

export default class MockCrmRepository implements CrmData {

  async getAttributesMetadata(entityLogicalName: string, attributesLogicalNames: string[]): Promise<AttributeMetadata[]> {
    const allAttributes = await fetch(`mock-data/entity-${entityLogicalName}-metadata.json`).then(async result => {
      const data = await result.json()
      return <AttributeMetadata[]>data.value
    }, error => {
      throw error
    })
    return findAttributes(entityLogicalName, allAttributes, attributesLogicalNames)
  }

  async getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]> {
    const entities = await fetch('mock-data/entities-metadata.json').then(async result => {
      const data = await result.json()
      return <EntityMetadata[]>data.value
    }, error => {
      throw error
    })

    return entities.filter(i => logicalNames?.includes(i.LogicalName))
  }
  
  getLookupAttributeMetadata(_: string, attributeLogicalName: string): Promise<LookupAttributeMetadata> {
    return fetch(`mock-data/lookup-${attributeLogicalName}-metadata.json`).then(async result => {
      const data = await result.json()
      return <LookupAttributeMetadata>data
    }, error => {
      throw error
    })
  }
  
  getPicklistAttributeMetadata(_: string, attributeLogicalName: string): Promise<PicklistAttributeMetadata> {
    return fetch(`mock-data/picklist-${attributeLogicalName}-metadata.json`).then(async result => {
      const data = await result.json()
      return <PicklistAttributeMetadata>data
    }, error => {
      throw error
    })
  }

}