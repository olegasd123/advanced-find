interface FilterOptionsDefaultConfig {
  CannotBeRemoved?: boolean
  Condition?: string
  OrderedBy?: number
  IsAttributeDisabled?: boolean
  IsDisabled?: boolean
  IsShowed?: boolean
  Values?: Array<string | number>
}

interface SearchSchemeConfig {
  Entities: EntityConfig[]
  Localization: LocalizationConfig
}

interface LocalizationConfig {
  CrmFilterConditions?: Record<string, string>
}

interface SelectionConfig {
  MaxItems?: number
  MinItems?: number
  Multiple?: boolean
  RelatedEntityAttributeNames: string[]
  RelatedEntityAttributeFormat: string
}

export interface AppConfig {
  SearchScheme?: SearchSchemeConfig
}

export interface EntityConfig {
  FilterOptions: FilterOptionConfig[]
  LogicalName: string
  View: string[]
}

export interface FilterOptionConfig {
  DisplayName?: string
  AttributeName?: string
  FromAttribute?: string
  ToAttribute?: string
  AttributeType?: string
  CategoryDisplayName?: string
  Control?: string
  EntityName?: string
  Default?: FilterOptionsDefaultConfig
  Selection?: SelectionConfig
  RelatedTo?: FilterOptionConfig
}
