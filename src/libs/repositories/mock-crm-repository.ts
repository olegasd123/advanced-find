import {
  AttributeMetadata,
  CrmData,
  EntityMetadata,
  LookupAttributeMetadata,
  PicklistAttributeMetadata,
  findAttributes,
} from './crm-repository'

export default class MockCrmRepository implements CrmData {
  async getAttributesMetadata(
    entityLogicalName: string,
    attributesLogicalNames: string[]
  ): Promise<AttributeMetadata[]> {
    const allAttributes = await fetch(`mock-data/${entityLogicalName}-attributes-md.json`).then(
      async (result) => {
        const data = await result.json()
        return <AttributeMetadata[]>data.value
      },
      (error) => {
        throw error
      }
    )
    return findAttributes(entityLogicalName, allAttributes, attributesLogicalNames)
  }

  async getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]> {
    const entities = await fetch('mock-data/entities-md.json').then(
      async (result) => {
        const data = await result.json()
        return <EntityMetadata[]>data.value
      },
      (error) => {
        throw error
      }
    )

    return entities.filter((i) => logicalNames?.includes(i.LogicalName))
  }

  getLookupAttributeMetadata(
    _: string,
    attributeLogicalName: string
  ): Promise<LookupAttributeMetadata> {
    return fetch(`mock-data/account-${attributeLogicalName}-lookup-md.json`).then(
      async (result) => {
        const data = await result.json()
        return <LookupAttributeMetadata>data
      },
      (error) => {
        throw error
      }
    )
  }

  getPicklistAttributeMetadata(
    _: string,
    attributeLogicalName: string
  ): Promise<PicklistAttributeMetadata> {
    return fetch(`mock-data/account-${attributeLogicalName}-picklist-md.json`).then(
      async (result) => {
        const data = await result.json()
        return <PicklistAttributeMetadata>data
      },
      (error) => {
        throw error
      }
    )
  }

  getEntities(entityPluralName: string, attributeLogicalNames: string[]): Promise<unknown> {
    void attributeLogicalNames
    return fetch(`mock-data/${entityPluralName}.json`).then(
      async (result) => {
        const data = await result.json()
        return data.value
      },
      (error) => {
        throw error
      }
    )
  }
}
