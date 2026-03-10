interface FilterOptionDefaultConfig {
  CannotBeRemoved?: boolean
  Condition?: string
  OrderedBy?: number
  IsAttributeDisabled?: boolean
  IsDisabled?: boolean
  IsShown?: boolean
  Values?: Array<string | number>
}

export interface DefaultFilterGroupConfig {
  FilterOptionIds?: string[]
  FilterOptionIndexes?: number[]
  Operator?: 'and' | 'or'
  IsOperatorEditable?: boolean
  IsRemovable?: boolean
  GroupTitle?: string
}

export interface ResultViewPaginationConfig {
  List?: number[]
  AllOptionLabel?: string
  SummaryTemplate?: string
}

export interface ResultViewDefaultSortConfig {
  ColumnId: string
  IsAscending?: boolean
}

export interface ResultViewConfig {
  Pagination?: ResultViewPaginationConfig
  Columns: TableColumnConfig[]
  DefaultSort?: ResultViewDefaultSortConfig[]
  ShowAppliedFilters?: boolean
}

export interface TableColumnConfig {
  Id?: string
  PathId?: string
  Path?: RelationPathStepConfig[]
  AttributeNames?: string[]
  AttributeFormat?: string
  DisplayName?: string
  Width?: number | string
}

interface SearchSchemaConfig {
  Entities: EntityConfig[]
  Localization: LocalizationConfig
}

interface LocalizationConfig {
  FilterConditionLabels?: Record<string, string>
}

export interface SelectionConfig {
  MaxItems?: number
  MinItems?: number
  Multiple?: boolean
  SearchDelay?: number
  MinCharacters?: number
}

interface LookupConfig {
  AttributeNames?: string[]
  AttributeFormat?: string
}

export interface AppConfig {
  SearchSchema?: SearchSchemaConfig
}

export interface EntityConfig {
  FilterUniqueOptionsOnly?: boolean
  FilterCategories?: FilterCategoryConfig[]
  RelationPaths?: RelationPathConfig[]
  FilterOptions: FilterOptionConfig[]
  DefaultFilterGroups?: DefaultFilterGroupConfig[]
  LogicalName: string
  ResultView: ResultViewConfig
}

export interface FilterCategoryConfig {
  Id: string
  DisplayName: string
}

export interface RelationPathStepConfig {
  EntityName: string
  FromAttribute: string
  ToAttribute: string
}

export interface RelationPathConfig {
  Id: string
  Steps: RelationPathStepConfig[]
}

export interface FilterOptionConfig {
  Id?: string
  PathId?: string
  Path?: RelationPathStepConfig[]
  DisplayName?: string
  AttributeName?: string
  AttributeType?: string
  CategoryId?: string
  EntityName?: string
  Default?: FilterOptionDefaultConfig
  Groupable?: boolean
  Lookup?: LookupConfig
  Selection?: SelectionConfig
}
