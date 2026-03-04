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
  FilterOptionIndexes: number[]
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
  AttributeNames?: string[]
  AttributesFormat?: string
  DisplayName?: string
  EntityName?: string
  FromAttribute?: string
  ToAttribute?: string
  RelatedTo?: TableColumnConfig
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
  FilterOptions: FilterOptionConfig[]
  DefaultFilterGroups?: DefaultFilterGroupConfig[]
  LogicalName: string
  ResultView: ResultViewConfig
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
  Groupable?: boolean
  Lookup?: LookupConfig
  Selection?: SelectionConfig
  RelatedTo?: FilterOptionConfig
}
