interface FilterOptionsDefaultConfig {
  CannotRemove?: boolean,
  OrderedBy?: number,
  IsDisabled?: boolean,
  IsShowed?: boolean,
  Values?: string[]
}

interface FilterOprionsDropdownListConfig {
  CategoryName?: string,
  OrderBy?: number
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
  AttributeLogicalName: string,
  Control?: string,
  Default?: FilterOptionsDefaultConfig,
  DropdownList?: FilterOprionsDropdownListConfig,
  EntityLogicalName: string,
  Selection?: SelectionConfig
}