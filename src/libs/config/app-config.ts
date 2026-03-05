interface FilterOptionsDefaultConfig {
  CannotBeRemoved?: boolean
  Condition?: string
  OrderedBy?: number
  IsAttributeDisabled?: boolean
  IsDisabled?: boolean
  IsShowed?: boolean
  Values?: Array<string | number>
}

export type FilterGroupOperator = 'and' | 'or'

export interface DefaultFilterGroupConfig {
  FilterOptionIds?: string[]
  FilterOptionIndexes?: number[]
  Operator?: FilterGroupOperator
  IsOperatorChangeable?: boolean
  IsRemovable?: boolean
  GroupTitle?: string
}

export interface ResultViewPaginationConfig {
  List?: number[]
  ListItemAll?: string
  DisplaySummary?: string
}

export interface ResultViewDefaultSortConfig {
  ColumnId?: string
  ColumnNumber?: number
  IsAscending?: boolean
}

export interface ResultViewConfig {
  Pagination?: ResultViewPaginationConfig
  TableColumns: TableColumnConfig[]
  DefaultSort?: ResultViewDefaultSortConfig[]
  ShowAppliedFilters?: boolean
}

export interface TableColumnConfig {
  Id?: string
  PathId?: string
  Path?: RelationPathStepConfig[]
  AttributeNames?: string[]
  AttributesFormat?: string
  DisplayName?: string
  Width?: number | string
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
}

interface LookupConfig {
  AttributeNames?: string[]
  AttributeFormat?: string
}

export interface AppConfig {
  SearchScheme?: SearchSchemeConfig
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
  Default?: FilterOptionsDefaultConfig
  Groupable?: boolean
  Lookup?: LookupConfig
  Selection?: SelectionConfig
}
