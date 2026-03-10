import { describe, expect, it } from 'vitest'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import {
  buildCrmEntitiesFilter,
  escapeODataString,
  escapeXml,
  hasMeaningfulValues,
  isNoValueCondition,
  noValueConditions,
  normalizeConditionForValues,
  normalizeGroupOperator,
  numberAttributeTypes,
  parseValues,
  toFetchValue,
  toODataLiteral,
} from '@/libs/utils/crm/crm-search'

describe('crm-search helpers', () => {
  it('normalizes group operator', () => {
    expect(normalizeGroupOperator(undefined)).toBe('and')
    expect(normalizeGroupOperator('and')).toBe('and')
    expect(normalizeGroupOperator('or')).toBe('or')
  })

  it('keeps known condition sets', () => {
    expect(noValueConditions.has('null')).toBe(true)
    expect(noValueConditions.has('today')).toBe(true)
    expect(numberAttributeTypes.has('decimal')).toBe(true)
    expect(numberAttributeTypes.has('string')).toBe(false)
  })

  it('detects no-value conditions', () => {
    expect(isNoValueCondition('null')).toBe(true)
    expect(isNoValueCondition('tomorrow')).toBe(true)
    expect(isNoValueCondition('eq')).toBe(false)
    expect(isNoValueCondition(null)).toBe(false)
  })

  it('escapes OData and XML values', () => {
    expect(escapeODataString(`O'Reilly`)).toBe(`O''Reilly`)
    expect(escapeXml(`<a attr="x&y">'ok'</a>`)).toBe(
      '&lt;a attr=&quot;x&amp;y&quot;&gt;&apos;ok&apos;&lt;/a&gt;'
    )
  })

  it('parses in/not-in values from single comma-separated item', () => {
    expect(parseValues('in', [' a, ,b, c '])).toEqual(['a', 'b', 'c'])
    expect(parseValues('not-in', [' a, ,b, c '])).toEqual(['a', 'b', 'c'])
  })

  it('does not parse other conditions or non-single-string values', () => {
    expect(parseValues('eq', [' a, b '])).toEqual([' a, b '])
    expect(parseValues('in', ['a', 'b'])).toEqual(['a', 'b'])
    expect(parseValues('in', [1])).toEqual([1])
    expect(parseValues('not-in', ['a', 'b'])).toEqual(['a', 'b'])
    expect(parseValues('not-in', [1])).toEqual([1])
  })

  it('converts values for FetchXML', () => {
    expect(toFetchValue('boolean', 'TRUE')).toBe('1')
    expect(toFetchValue('boolean', 'false')).toBe('0')
    expect(toFetchValue('decimal', '12.5')).toBe('12.5')
    expect(toFetchValue('decimal', 'not-a-number')).toBe('not-a-number')
  })

  it('converts values to OData literals', () => {
    expect(toODataLiteral('boolean', 'TRUE')).toBe('true')
    expect(toODataLiteral('boolean', 'false')).toBe('false')
    expect(toODataLiteral('money', '42')).toBe('42')
    expect(toODataLiteral('string', `O'Reilly`)).toBe(`'O''Reilly'`)
  })

  it('converts date literals for OData', () => {
    const expectedDateOnly = new Date('2025-01-02T00:00:00').toISOString()
    const expectedDateTime = new Date('2025-01-02T10:30:00Z').toISOString()

    expect(toODataLiteral('datetime', '2025-01-02')).toBe(`'${expectedDateOnly}'`)
    expect(toODataLiteral('datetime', '2025-01-02T10:30:00Z')).toBe(`'${expectedDateTime}'`)
    expect(toODataLiteral('datetime', 'bad-date')).toBe(`'bad-date'`)
  })

  it('checks meaningful values', () => {
    expect(hasMeaningfulValues(['', '   '])).toBe(false)
    expect(hasMeaningfulValues([0])).toBe(true)
    expect(hasMeaningfulValues(['x'])).toBe(true)
  })

  it('normalizes eq/ne to in/not-in for multiple values', () => {
    expect(normalizeConditionForValues('eq', ['A', 'B'])).toBe('in')
    expect(normalizeConditionForValues('ne', ['A', 'B'])).toBe('not-in')
    expect(normalizeConditionForValues('eq', ['A'])).toBe('eq')
    expect(normalizeConditionForValues('ne', ['A'])).toBe('ne')
  })
})

describe('buildCrmEntitiesFilter', () => {
  it('builds grouped expression and skips non-target entities', () => {
    const conditions: AppliedFilterCondition[] = [
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'eq',
        values: ['Acme'],
      },
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'begins-with',
        values: ['A'],
        groupId: 10,
        groupOperator: 'or',
      },
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'begins-with',
        values: ['B'],
        groupId: 10,
        groupOperator: 'or',
      },
      {
        filterOption: { EntityName: 'contact', AttributeName: 'fullname', AttributeType: 'string' },
        condition: 'eq',
        values: ['Ignored'],
      },
    ]

    const filter = buildCrmEntitiesFilter('account', conditions)

    expect(filter).toBe("(name eq 'Acme') and ((startswith(name,'A')) or (startswith(name,'B')))")
  })

  it('handles in/no-value conditions and returns undefined when no valid conditions', () => {
    const conditions: AppliedFilterCondition[] = [
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'in',
        values: ["A, B's"],
      },
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'not-in',
        values: ['C, D'],
      },
      {
        filterOption: {
          EntityName: 'account',
          AttributeName: 'createdon',
          AttributeType: 'datetime',
        },
        condition: 'today',
        values: [],
      },
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'eq',
        values: [''],
        isDisabled: true,
      },
    ]

    const filter = buildCrmEntitiesFilter('account', conditions)
    expect(filter).toBe(
      "(name in ('A','B''s')) and (not (name in ('C','D'))) and (Microsoft.Dynamics.CRM.Today(PropertyName='createdon'))"
    )

    const empty = buildCrmEntitiesFilter('account', [
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'eq',
        values: ['   '],
      },
    ])
    expect(empty).toBeUndefined()
  })

  it('auto-converts eq/ne with multiple values into in/not-in expressions', () => {
    const filter = buildCrmEntitiesFilter('account', [
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'eq',
        values: ['A', 'B'],
      },
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'ne',
        values: ['C', 'D'],
      },
    ])

    expect(filter).toBe("(name in ('A','B')) and (not (name in ('C','D')))")
  })
})
