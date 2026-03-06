import { describe, expect, it } from 'vitest'
import {
  buildSearchBranchPlan,
  collectUniqueResultIds,
  dedupeRowsByPrimaryId,
  splitIntoChunks,
} from '../use-search-query'
import { AppliedFilterCondition } from '../../../libs/utils/crm/crm-search'

const condition = (
  attributeName: string,
  value: string,
  groupId?: number,
  groupOperator?: 'and' | 'or'
): AppliedFilterCondition => ({
  filterOption: { EntityName: 'account', AttributeName: attributeName, AttributeType: 'string' },
  condition: 'eq',
  values: [value],
  groupId,
  groupOperator,
})

describe('use-search-query helpers', () => {
  it('creates two-pass branch plan for OR groups', () => {
    const conditions: AppliedFilterCondition[] = [
      condition('statecode', '0'),
      condition('name', 'A', 12, 'or'),
      condition('name', 'B', 12, 'or'),
    ]

    const plan = buildSearchBranchPlan(conditions)

    expect(plan.requiresTwoPass).toBe(true)
    expect(plan.branches).toHaveLength(2)
    expect(plan.branches[0]).toEqual([
      condition('statecode', '0'),
      condition('name', 'A'),
    ])
    expect(plan.branches[1]).toEqual([
      condition('statecode', '0'),
      condition('name', 'B'),
    ])
  })

  it('falls back to single pass when OR group has one condition', () => {
    const conditions: AppliedFilterCondition[] = [
      condition('statecode', '0'),
      condition('name', 'A', 99, 'or'),
    ]

    const plan = buildSearchBranchPlan(conditions)

    expect(plan.requiresTwoPass).toBe(false)
    expect(plan.branches).toEqual([[condition('statecode', '0'), condition('name', 'A')]])
  })

  it('collects unique ids from response payloads', () => {
    expect(
      collectUniqueResultIds(
        [
          { accountid: '1', name: 'A' },
          { accountid: '1', name: 'A duplicate' },
          { accountid: 2, name: 'B' },
          { name: 'No id' },
          { accountid: null },
        ],
        'accountid'
      )
    ).toEqual(['1', '2'])

    expect(
      collectUniqueResultIds(
        {
          value: [{ accountid: '3' }, { accountid: '3' }, { accountid: '4' }],
        },
        'accountid'
      )
    ).toEqual(['3', '4'])
  })

  it('deduplicates final rows by primary id and keeps latest row value', () => {
    const rows = dedupeRowsByPrimaryId(
      [
        { accountid: '1', name: 'Old Name' },
        { accountid: '2', name: 'Second' },
        { accountid: '1', name: 'New Name' },
        { name: 'No id row' },
      ],
      'accountid'
    )

    expect(rows).toHaveLength(2)
    expect(rows.find((item) => item.accountid === '1')?.name).toBe('New Name')
    expect(rows.find((item) => item.accountid === '2')?.name).toBe('Second')
  })

  it('splits ids into deterministic chunks', () => {
    expect(splitIntoChunks(['1', '2', '3', '4', '5'], 2)).toEqual([
      ['1', '2'],
      ['3', '4'],
      ['5'],
    ])
    expect(splitIntoChunks([], 2)).toEqual([])
  })
})
