import {
  AttributeMetadata,
  CrmData,
  EntityMetadata,
  GetEntitiesOptions,
  LookupAttributeMetadata,
  PicklistAttributeMetadata,
} from '@/libs/types/entity.types'
import { findAttributes } from '@/libs/data/crm/crm-repository.helpers'

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

  getEntities(
    entityPluralName: string,
    attributeLogicalNames: string[],
    options?: GetEntitiesOptions
  ): Promise<unknown> {
    void attributeLogicalNames
    return fetch(`mock-data/${entityPluralName}.json`).then(
      async (result) => {
        const data = await result.json()
        let items = data.value as Record<string, unknown>[]

        if (options?.filter) {
          const containsMatches = [...options.filter.matchAll(/contains\((\w+),'([^']*)'\)/g)]
          if (containsMatches.length > 0) {
            items = items.filter((item) =>
              containsMatches.some(([, attr, query]) => {
                const val = item[attr]
                return typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase())
              })
            )
          }
        }

        return items
      },
      (error) => {
        throw error
      }
    )
  }
}
