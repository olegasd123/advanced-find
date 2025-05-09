
interface DisplayName {
  UserLocalizedLabel?: UserLocalizedLabel
}

interface DisplayCollectionName {
  UserLocalizedLabel: UserLocalizedLabel
}

interface Label {
  UserLocalizedLabel: UserLocalizedLabel
}

interface Metadata {
  LogicalName: string,
  DisplayName: DisplayName,
}

interface Option {
  Value: number,
  Label: Label
}

interface OptionSet {
  Options: Option[]
}

interface UserLocalizedLabel {
  Label: string
}

export interface AttributeMetadata extends Metadata {
  AttributeType: string,
}

export interface CrmRepository {
  getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]>
  getAttributesMetadata(entityLogicalName: string, attributesLogicalNames: string[]): Promise<AttributeMetadata[]>
  getLookupAttributeMetadata(entityLogicalName: string, attributeLogicalName: string): Promise<LookupAttributeMetadata>
  getPicklistAttributeMetadata(entityLogicalName: string, attributeLogicalName: string): Promise<PicklistAttributeMetadata>
}

export interface EntityMetadata extends Metadata {
  EntitySetName: string,
  DisplayCollectionName: DisplayCollectionName
}

export interface LookupAttributeMetadata {
  Targets: string[]
}

export interface PicklistAttributeMetadata {
  OptionSet: OptionSet
}

export const findAttributes = (entityLogicalName: string, source: AttributeMetadata[], attributesLogicalNames: string[]): AttributeMetadata[] => {
  const attributes: AttributeMetadata[] = []
  for (const attributeLogicalName of attributesLogicalNames) {
    const attribute = source.find(i => i.LogicalName === attributeLogicalName)
    if (attribute) {
      attributes.push(attribute)
    }
    else {
      console.error(`Coudn't find the attribute by name '${attributeLogicalName}' at the entity '${entityLogicalName}'`)
    }
  }
  return attributes
}

export default class CrmData implements CrmRepository {

  // EntityDefinitions(LogicalName='account')/Attributes?$select=LogicalName,AttributeType,DisplayName
  async getAttributesMetadata(entityLogicalName: string, attributesLogicalNames: string[]): Promise<AttributeMetadata[]> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,AttributeType,DisplayName`
    const allAttributes = await fetch(url).then(async result => {
      const data = await result.json()
      return <AttributeMetadata[]>data.value
    }, error => {
      console.error("CrmData.getAttributesMetadata", error)
      throw error
    })
    return findAttributes(entityLogicalName, allAttributes, attributesLogicalNames)
  }

  // EntityDefinitions(LogicalName='mso_candidat')?$select=DisplayName,LogicalName,EntitySetName
  async getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/EntityDefinitions?$select=LogicalName,EntitySetName,DisplayName,DisplayCollectionName`
    const entities = await fetch(url).then(async result => {
      const data = await result.json()
      return <EntityMetadata[]>data.value
    }, error => {
      console.error("CrmData.getEntitiesMetadata", error)
      throw error
    })

    return entities.filter(i => logicalNames?.includes(i.LogicalName))
  }

  // EntityDefinitions(LogicalName='account')/Attributes(LogicalName='createdby')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets
  getLookupAttributeMetadata(entityLogicalName: string, attributeLogicalName: string): Promise<LookupAttributeMetadata> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets`
    return fetch(url).then(async result => {
      const data = await result.json()
      return <LookupAttributeMetadata>data
    }, error => {
      console.error("CrmData.getLookupAttributeMetadata", error)
      throw error
    })
  }

  // EntityDefinitions(LogicalName='account')/Attributes(LogicalName='accountcategorycode')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)
  getPicklistAttributeMetadata(entityLogicalName: string, attributeLogicalName: string): Promise<PicklistAttributeMetadata> {
    const url = `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`
    return fetch(url).then(async result => {
      const data = await result.json()
      return <PicklistAttributeMetadata>data
    }, error => {
      console.error("CrmData.getPicklistAttributeMetadata", error)
      throw error
    })
  }
}