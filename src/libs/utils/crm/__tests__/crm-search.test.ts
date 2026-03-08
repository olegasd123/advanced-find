import { describe, expect, it } from 'vitest'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import {
  buildCrmEntitiesFilter,
  escapeODataString,
  escapeXml,
  hasMeaningfulValues,
  isNoValueCondition,
  noValueConditions,
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

  it('parses in-condition values from single comma-separated item', () => {
    expect(parseValues('in', [' a, ,b, c '])).toEqual(['a', 'b', 'c'])
  })

  it('does not parse non-in or non-single-string values', () => {
    expect(parseValues('eq', [' a, b '])).toEqual([' a, b '])
    expect(parseValues('in', ['a', 'b'])).toEqual(['a', 'b'])
    expect(parseValues('in', [1])).toEqual([1])
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
      "(name in ('A','B''s')) and (Microsoft.Dynamics.CRM.Today(PropertyName='createdon'))"
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
})
