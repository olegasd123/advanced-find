import { FilterOptionConfig } from '../config/app-config'

export type FilterGroupOperator = 'and' | 'or'

export type ConditionValue = string | number

export interface AppliedFilterCondition {
  filterOption?: FilterOptionConfig
  condition?: string | null
  values: ConditionValue[]
  displayValues?: string[]
  isDisabled?: boolean
  groupId?: number
  groupOperator?: FilterGroupOperator
}
