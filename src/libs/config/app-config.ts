
interface FilterOptionsDefaultConfig {
  CannotBeRemoved?: boolean,
  Condition?: string,
  OrderedBy?: number,
  IsDisabled?: boolean,
  IsShowed?: boolean,
  Values?: string[]
}

interface SearchSchemeConfig {
  Entities: EntityConfig[],
  Localization: LocalizationConfig,
}

interface LocalizationConfig {
  CrmFilterConditions: any
}

interface SelectionConfig {
  MaxItems?: number,
  MinItems?: number,
  Multi?: boolean
}

export interface AppConfig {
  SearchScheme?: SearchSchemeConfig
}

export interface EntityConfig {
  FilterOptions: FilterOptionConfig[],
  LogicalName: string,
  View: string[]
}

export interface FilterOptionConfig {
  DisplayName?: string,
  AttributeName?: string,
  FromAttribute?: string,
  ToAttribute?: string,
  AttributeType?: string,
  CategoryDisplayName?: string,
  Control?: string,
  EntityName?: string,
  Default?: FilterOptionsDefaultConfig,
  Selection?: SelectionConfig,
  RelatedTo?: FilterOptionConfig
}