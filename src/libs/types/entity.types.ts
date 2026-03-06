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
  LogicalName: string
  DisplayName: DisplayName
}

interface Option {
  Value: number
  Label: Label
}

interface OptionSet {
  Options: Option[]
}

interface UserLocalizedLabel {
  Label: string
}

export interface AttributeMetadata extends Metadata {
  AttributeType: string
}

export interface GetEntitiesOptions {
  filter?: string
  fetchXml?: string
}

export interface EntityMetadata extends Metadata {
  EntitySetName: string
  LogicalCollectionName?: string
  PrimaryIdAttribute?: string
  DisplayCollectionName: DisplayCollectionName
}

export interface LookupAttributeMetadata {
  Targets: string[]
}

export interface PicklistAttributeMetadata {
  OptionSet: OptionSet
}

export interface CrmData {
  getEntitiesMetadata(logicalNames: string[] | undefined): Promise<EntityMetadata[]>
  getAttributesMetadata(
    entityLogicalName: string,
    attributesLogicalNames: string[]
  ): Promise<AttributeMetadata[]>
  getLookupAttributeMetadata(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<LookupAttributeMetadata>
  getPicklistAttributeMetadata(
    entityLogicalName: string,
    attributeLogicalName: string
  ): Promise<PicklistAttributeMetadata>
  getEntities(
    entityPluralName: string,
    attributeLogicalNames: string[],
    options?: GetEntitiesOptions
  ): Promise<unknown>
}
