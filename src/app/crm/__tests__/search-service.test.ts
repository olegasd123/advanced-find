import { describe, expect, it, vi } from 'vitest'
import { SearchService } from '../search-service'
import { CrmData } from '../../../libs/types/entity.types'
import { AppliedFilterCondition } from '../../../libs/types/filter.types'

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

const createCrmRepositoryMock = (responses: unknown[]) => {
  const getEntities = vi.fn(async (...args: Parameters<CrmData['getEntities']>) => {
    void args
    return responses.shift()
  })

  const crmRepository: CrmData = {
    getEntitiesMetadata: async () => [],
    getAttributesMetadata: async () => [],
    getLookupAttributeMetadata: async () => ({ Targets: [] }),
    getPicklistAttributeMetadata: async () => ({ OptionSet: { Options: [] } }),
    getEntities,
  }

  return { crmRepository, getEntities }
}

describe('search-service helpers', () => {
  it('creates two-pass branch plan for OR groups', () => {
    const conditions: AppliedFilterCondition[] = [
      condition('statecode', '0'),
      condition('name', 'A', 12, 'or'),
      condition('name', 'B', 12, 'or'),
    ]

    const plan = SearchService.buildSearchBranchPlan(conditions)

    expect(plan.requiresTwoPass).toBe(true)
    expect(plan.branches).toHaveLength(2)
    expect(plan.branches[0]).toEqual([condition('statecode', '0'), condition('name', 'A')])
    expect(plan.branches[1]).toEqual([condition('statecode', '0'), condition('name', 'B')])
  })

  it('falls back to single pass when OR group has one condition', () => {
    const conditions: AppliedFilterCondition[] = [
      condition('statecode', '0'),
      condition('name', 'A', 99, 'or'),
    ]

    const plan = SearchService.buildSearchBranchPlan(conditions)

    expect(plan.requiresTwoPass).toBe(false)
    expect(plan.branches).toEqual([[condition('statecode', '0'), condition('name', 'A')]])
  })

  it('collects unique ids from response payloads', () => {
    expect(
      SearchService.collectUniqueResultIds(
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
      SearchService.collectUniqueResultIds(
        {
          value: [{ accountid: '3' }, { accountid: '3' }, { accountid: '4' }],
        },
        'accountid'
      )
    ).toEqual(['3', '4'])
  })

  it('deduplicates final rows by primary id and keeps latest row value', () => {
    const rows = SearchService.dedupeRowsByPrimaryId(
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
    expect(SearchService.splitIntoChunks(['1', '2', '3', '4', '5'], 2)).toEqual([
      ['1', '2'],
      ['3', '4'],
      ['5'],
    ])
    expect(SearchService.splitIntoChunks([], 2)).toEqual([])
  })
})

describe('search-service execution', () => {
  it('runs single-pass search for non-branch filters', async () => {
    const { crmRepository, getEntities } = createCrmRepositoryMock([
      { value: [{ accountid: '1', name: 'Acme' }] },
    ])

    const service = new SearchService(crmRepository)
    const rows = await service.executeSearch({
      entityLogicalName: 'account',
      entitySetName: 'accounts',
      searchTableColumns: [],
      conditions: [condition('name', 'Acme')],
      primaryIdAttribute: 'accountid',
    })

    expect(rows).toEqual([{ accountid: '1', name: 'Acme' }])
    expect(getEntities).toHaveBeenCalledTimes(1)
    expect(getEntities.mock.calls[0]?.[0]).toBe('accounts')
  })

  it('runs two-pass search with OR branches and final id chunks', async () => {
    const { crmRepository, getEntities } = createCrmRepositoryMock([
      { value: [{ accountid: '1' }, { accountid: '2' }] },
      { value: [{ accountid: '2' }, { accountid: '3' }] },
      { value: [{ accountid: '1', name: 'A' }, { accountid: '2', name: 'B' }] },
      { value: [{ accountid: '3', name: 'C' }, { accountid: '2', name: 'B2' }] },
    ])

    const service = new SearchService(crmRepository, { resultIdsChunkSize: 2 })
    const rows = await service.executeSearch({
      entityLogicalName: 'account',
      entitySetName: 'accounts',
      searchTableColumns: [],
      conditions: [
        condition('statecode', '0'),
        condition('name', 'A', 10, 'or'),
        condition('name', 'B', 10, 'or'),
      ],
      primaryIdAttribute: 'accountid',
    })

    expect(getEntities).toHaveBeenCalledTimes(4)
    expect(String(getEntities.mock.calls[2]?.[2]?.fetchXml)).toContain('operator="in"')
    expect(String(getEntities.mock.calls[3]?.[2]?.fetchXml)).toContain('operator="in"')
    expect(rows).toHaveLength(3)
    expect(rows.find((item) => item.accountid === '2')?.name).toBe('B2')
  })
})
