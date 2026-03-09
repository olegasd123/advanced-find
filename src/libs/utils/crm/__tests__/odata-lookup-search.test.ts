import { describe, expect, it } from 'vitest'
import { buildLookupSearchFilter } from '@/libs/utils/crm/odata-lookup-search'

describe('buildLookupSearchFilter', () => {
  it('returns undefined for empty attribute names', () => {
    expect(buildLookupSearchFilter([], 'test')).toBeUndefined()
  })

  it('returns undefined for blank query', () => {
    expect(buildLookupSearchFilter(['firstname'], '  ')).toBeUndefined()
  })

  it('returns undefined for empty query', () => {
    expect(buildLookupSearchFilter(['firstname'], '')).toBeUndefined()
  })

  it('builds single-attribute filter', () => {
    expect(buildLookupSearchFilter(['lastname'], 'Smith')).toBe(
      "contains(lastname,'Smith')"
    )
  })

  it('builds multi-attribute OR filter', () => {
    expect(buildLookupSearchFilter(['firstname', 'lastname'], 'John')).toBe(
      "contains(firstname,'John') or contains(lastname,'John')"
    )
  })

  it('escapes single quotes in query', () => {
    expect(buildLookupSearchFilter(['name'], "O'Brien")).toBe(
      "contains(name,'O''Brien')"
    )
  })

  it('trims whitespace from query', () => {
    expect(buildLookupSearchFilter(['firstname'], '  John  ')).toBe(
      "contains(firstname,'John')"
    )
  })
})
