interface FilterOptionsDefaultConfig {
  CannotRemove?: boolean,
  OrderedBy?: number,
  IsDisabled?: boolean,
  IsShowed?: boolean,
  Values?: string[]
}

interface SearchSchemeConfig {
  Entities: EntityConfig[]
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
  AttributeDisplayName?: string,
  AttributeLogicalName?: string,
  CategoryDisplayName?: string,
  Control?: string,
  EntityLogicalName?: string,
  Default?: FilterOptionsDefaultConfig,
  Selection?: SelectionConfig
}