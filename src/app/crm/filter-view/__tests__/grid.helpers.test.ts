import { describe, expect, it } from 'vitest'
import {
  cloneGroups,
  compactGroups,
  GroupState,
  getGroupIdByOptionId,
  moveOptionAfterTarget,
  normalizeGroupTitle,
  VisibleOption,
} from '@/app/crm/filter-view/grid.helpers'

const createVisibleOption = (id: number): VisibleOption => ({
  id,
  option: {},
})

const createGroup = (id: number, optionIds: number[]): GroupState => ({
  id,
  operator: 'and',
  optionIds,
  isOperatorChangeable: true,
  isRemovable: true,
})

describe('filter-grid.helpers', () => {
  it('clones groups without sharing optionIds arrays', () => {
    const source: Record<number, GroupState> = {
      1: createGroup(1, [1, 2]),
    }

    const cloned = cloneGroups(source)
    cloned[1].optionIds.push(3)

    expect(cloned).not.toBe(source)
    expect(source[1].optionIds).toEqual([1, 2])
    expect(cloned[1].optionIds).toEqual([1, 2, 3])
  })

  it('moves a condition after target condition', () => {
    const visibleOptions = [createVisibleOption(1), createVisibleOption(2), createVisibleOption(3)]

    const moved = moveOptionAfterTarget(visibleOptions, 1, 3)

    expect(moved.map((item) => item.id)).toEqual([2, 3, 1])
  })

  it('compacts groups by keeping visible options, sorting by visible order, and removing small groups', () => {
    const visibleOptions = [
      createVisibleOption(2),
      createVisibleOption(1),
      createVisibleOption(4),
      createVisibleOption(3),
    ]

    const groupsById: Record<number, GroupState> = {
      1: createGroup(1, [3, 1, 3]),
      2: createGroup(2, [2]),
      3: createGroup(3, [4, 99, 2]),
    }

    const compacted = compactGroups(groupsById, visibleOptions)

    expect(
      Object.keys(compacted)
        .map(Number)
        .sort((a, b) => a - b)
    ).toEqual([1, 3])
    expect(compacted[1].optionIds).toEqual([1, 3])
    expect(compacted[3].optionIds).toEqual([2, 4])
    expect(getGroupIdByOptionId(compacted, 2)).toBe(3)
    expect(getGroupIdByOptionId(compacted, 99)).toBeUndefined()
  })

  it('normalizes empty titles to undefined', () => {
    expect(normalizeGroupTitle('  Group A  ')).toBe('Group A')
    expect(normalizeGroupTitle('   ')).toBeUndefined()
    expect(normalizeGroupTitle(undefined)).toBeUndefined()
  })
})
