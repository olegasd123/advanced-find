import { RelationPathStepConfig, TableColumnConfig } from '@/libs/types/app-config.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'

export interface SearchTableColumnAttribute {
  attributeName: string
  valueKey: string
}

export interface SearchTableColumn {
  sourceColumn: TableColumnConfig
  id?: string
  columnKey: string
  chain: RelationPathStepConfig[]
  attributes: SearchTableColumnAttribute[]
  attributesFormat?: string
  entityName: string
  displayName?: string
  isRootColumn: boolean
}

export interface SearchBranchPlan {
  requiresTwoPass: boolean
  branches: AppliedFilterCondition[][]
}
